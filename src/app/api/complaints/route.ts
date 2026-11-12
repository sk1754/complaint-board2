import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkUserSuspension } from "@/lib/auth";
import {
  BOARDS,
  BOARD_MAP,
  BoardType,
  UploadedAttachmentInput,
  validateAttachments,
} from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await getCurrentUser();

    const boardParam = searchParams.get("board") || "ALL";
    const postType = searchParams.get("type") || "ALL";
    const qStatus = searchParams.get("status") || "ALL";
    const searchField = searchParams.get("field") || "ALL";
    const q = (searchParams.get("q") || "").trim();

    const andConditions: Record<string, unknown>[] = [];

    if (boardParam !== "ALL" && BOARDS.includes(boardParam as BoardType)) {
      if (boardParam === "COMMON") {
        andConditions.push({ board: "COMMON" });
      } else {
        andConditions.push({
          OR: [
            { board: boardParam },
            {
              AND: [
                { board: "COMMON" },
                { isNotice: true },
                {
                  OR: [
                    { targetDepts: "ALL" },
                    { targetDepts: { contains: boardParam } },
                  ],
                },
              ],
            },
          ],
        });
      }
    }

    if (postType === "NOTICE") {
      andConditions.push({ isNotice: true });
    } else if (postType === "QUESTION") {
      andConditions.push({ isNotice: false });
    }

    if (["WAITING", "ANSWERED", "RESOLVED"].includes(qStatus)) {
      andConditions.push({ isNotice: false, questionStatus: qStatus });
    }

    if (q) {
      if (searchField === "TITLE") {
        andConditions.push({ title: { contains: q } });
      } else if (searchField === "CONTENT") {
        andConditions.push({ content: { contains: q } });
      } else if (searchField === "AUTHOR") {
        andConditions.push({ authorName: { contains: q } });
      } else {
        andConditions.push({
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
            { authorName: { contains: q } },
          ],
        });
      }
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};
    const myDept = user?.department || "COMP";

    const [
      posts,
      totalCount,
      commonCount,
      compCount,
      aeroCount,
      mechaCount,
      infoCount,
      commonNotices,
      myDeptNotices,
      recentQuestions,
      unreadNotificationCount,
    ] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [
          { isPinned: "desc" },
          { isNotice: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        include: {
          _count: {
            select: { comments: true, attachments: true },
          },
        },
      }),
      prisma.post.count(),
      prisma.post.count({ where: { board: "COMMON" } }),
      prisma.post.count({ where: { board: "COMP" } }),
      prisma.post.count({ where: { board: "AERO" } }),
      prisma.post.count({ where: { board: "MECHA" } }),
      prisma.post.count({ where: { board: "INFO" } }),
      prisma.post.findMany({
        where: { board: "COMMON", isNotice: true, isHidden: false },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 4,
      }),
      prisma.post.findMany({
        where: {
          isNotice: true,
          isHidden: false,
          OR: [
            { board: myDept },
            {
              board: "COMMON",
              OR: [
                { targetDepts: "ALL" },
                { targetDepts: { contains: myDept } },
              ],
            },
          ],
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 4,
      }),
      prisma.post.findMany({
        where: { isNotice: false, isHidden: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      user
        ? prisma.notification.count({
            where: { userId: user.id, isRead: false },
          })
        : Promise.resolve(0),
    ]);

    const items = posts.map((item) => {
      const canManageItem = Boolean(
        user &&
          (user.role === "SUPER_ADMIN" ||
            (user.role === "DEPT_ADMIN" && user.department === item.board))
      );
      const canSeeHidden =
        canManageItem || Boolean(user && user.id === item.authorId);

      return {
        id: item.id,
        board: item.board,
        targetDepts: item.targetDepts,
        isNotice: item.isNotice,
        isPinned: item.isPinned,
        isHidden: item.isHidden,
        hiddenReason: item.hiddenReason,
        questionStatus: item.questionStatus,
        title:
          item.isHidden && !canSeeHidden
            ? "관리자에 의해 숨김 처리된 게시물입니다."
            : item.title,
        authorId: item.authorId,
        authorName: item.authorName,
        views: item.views,
        commentCount: item._count.comments,
        attachmentCount: item._count.attachments,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    return NextResponse.json({
      board: boardParam,
      items,
      dashboard: {
        commonNotices,
        myDeptNotices,
        recentQuestions,
      },
      stats: {
        ALL: totalCount,
        COMMON: commonCount,
        COMP: compCount,
        AERO: aeroCount,
        MECHA: mechaCount,
        INFO: infoCount,
      },
      unreadNotificationCount,
      user,
    });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return NextResponse.json(
      { error: "게시글 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "권한 없음: 로그인하지 않은 사용자는 글을 작성할 수 없습니다." },
        { status: 401 }
      );
    }

    // 이용 제한 계정 작성 차단 (4단계 완료 기준 5)
    const suspendError = checkUserSuspension(user);
    if (suspendError) {
      return NextResponse.json({ error: suspendError }, { status: 403 });
    }

    const body = await request.json();
    const title = (body.title || "").trim();
    const content = (body.content || "").trim();
    const targetBoard: BoardType = BOARDS.includes(body.board)
      ? body.board
      : (user.department as BoardType);
    const wantNotice = Boolean(body.isNotice);
    const wantPinned = Boolean(body.isPinned);
    const targetDepts = (body.targetDepts || "ALL").trim() || "ALL";
    const rawAttachments: UploadedAttachmentInput[] = Array.isArray(
      body.attachments
    )
      ? body.attachments
      : [];

    if (!title) {
      return NextResponse.json(
        { error: "입력 오류: 제목을 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "입력 오류: 본문 내용을 입력해 주세요." },
        { status: 400 }
      );
    }

    // 첨부파일 제한 검사 (4단계 완료 기준 1)
    const fileError = validateAttachments(rawAttachments, 0);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    // 1. 2공학관 공통 공간(COMMON) 작성 권한 검사
    if (targetBoard === "COMMON") {
      if (wantNotice && user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          {
            error:
              "권한 없음: 2공학관 공통 공지는 전체 관리자만 작성할 수 있습니다.",
          },
          { status: 403 }
        );
      }
    } else {
      // 2. 학과별 공간(COMP, AERO, MECHA, INFO) 작성 권한 검사
      if (wantNotice) {
        if (user.role === "USER") {
          return NextResponse.json(
            { error: "권한 없음: 일반 학생은 공지글을 작성할 수 없습니다." },
            { status: 403 }
          );
        }
        if (user.role === "DEPT_ADMIN" && user.department !== targetBoard) {
          return NextResponse.json(
            {
              error: `권한 없음: ${
                BOARD_MAP[user.department as BoardType]?.shortName
              } 관리자는 다른 학과(${
                BOARD_MAP[targetBoard]?.shortName
              }) 게시판에 공지를 작성할 수 없습니다.`,
            },
            { status: 403 }
          );
        }
      } else {
        if (user.role !== "SUPER_ADMIN" && user.department !== targetBoard) {
          return NextResponse.json(
            {
              error: `권한 없음: 학과 질문은 본인 소속 학과(${
                BOARD_MAP[user.department as BoardType]?.shortName
              }) 또는 2공학관 공통 게시판에만 작성할 수 있습니다.`,
            },
            { status: 403 }
          );
        }
      }
    }

    const created = await prisma.post.create({
      data: {
        board: targetBoard,
        targetDepts:
          targetBoard === "COMMON" && wantNotice ? targetDepts : targetBoard,
        isNotice: wantNotice,
        isPinned: wantNotice ? wantPinned : false,
        isHidden: false,
        questionStatus: "WAITING",
        title,
        content,
        authorId: user.id,
        authorName: user.name,
        attachments:
          rawAttachments.length > 0
            ? {
                create: rawAttachments.map((f) => ({
                  fileName: f.fileName,
                  mimeType: f.mimeType || "application/octet-stream",
                  fileSize: Number(f.fileSize) || 0,
                  dataBase64: f.dataBase64,
                })),
              }
            : undefined,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        board: created.board,
        message: "게시글이 등록되었습니다.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create post:", error);
    return NextResponse.json(
      { error: "게시글 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
