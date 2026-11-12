import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkUserSuspension } from "@/lib/auth";
import { BOARD_MAP, BoardType, validateAttachments } from "@/lib/constants";

function canManageBoard(
  user: { role: string; department: string } | null,
  board: string
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "DEPT_ADMIN" && user.department === board) return true;
  return false;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const postId = Number(id);
    if (Number.isNaN(postId)) {
      return NextResponse.json(
        { error: "오류 안내: 잘못된 게시글 번호입니다." },
        { status: 400 }
      );
    }

    const existing = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "오류 안내: 존재하지 않거나 삭제된 게시글입니다." },
        { status: 404 }
      );
    }

    const user = await getCurrentUser();
    const isBoardAdmin = canManageBoard(user, existing.board);
    const isAuthor = Boolean(user && user.id === existing.authorId);

    if (existing.isHidden && !isBoardAdmin && !isAuthor) {
      return NextResponse.json(
        {
          error: "안내: 관리자에 의해 숨김 처리된 게시물입니다.",
        },
        { status: 403 }
      );
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: { views: { increment: 1 } },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
            createdAt: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });

    return NextResponse.json({
      id: post.id,
      board: post.board,
      targetDepts: post.targetDepts,
      isNotice: post.isNotice,
      isPinned: post.isPinned,
      isHidden: post.isHidden,
      hiddenReason: post.hiddenReason,
      questionStatus: post.questionStatus,
      title: post.title,
      content: post.content,
      views: post.views,
      authorId: post.authorId,
      authorName: post.authorName,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      comments: post.comments,
      attachments: post.attachments,
      user,
      isAuthor,
      canEdit: isAuthor || isBoardAdmin,
      canManage: isBoardAdmin,
    });
  } catch (error) {
    console.error("Failed to fetch post detail:", error);
    return NextResponse.json(
      { error: "게시글 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "권한 없음: 로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const postId = Number(id);
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        _count: {
          select: { comments: true, attachments: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "오류 안내: 존재하지 않는 게시글입니다." },
        { status: 404 }
      );
    }

    const isBoardAdmin = canManageBoard(user, post.board);
    const isAuthor = post.authorId === user.id;
    const body = await request.json();

    // 1. 질문 작성자의 해결 완료 / 해결 완료 취소 처리
    if (body.action === "RESOLVE" || body.action === "UNRESOLVE") {
      if (!isAuthor) {
        return NextResponse.json(
          {
            error:
              "권한 없음: 질문 작성자 본인만 해결 완료 상태를 변경할 수 있습니다.",
          },
          { status: 403 }
        );
      }

      const nextStatus =
        body.action === "RESOLVE"
          ? "RESOLVED"
          : post._count.comments > 0
          ? "ANSWERED"
          : "WAITING";

      const updated = await prisma.post.update({
        where: { id: postId },
        data: { questionStatus: nextStatus },
      });

      return NextResponse.json({
        success: true,
        questionStatus: updated.questionStatus,
        message:
          nextStatus === "RESOLVED"
            ? "질문이 [해결 완료] 상태로 변경되었습니다."
            : `해결 완료가 취소되어 [${
                nextStatus === "ANSWERED" ? "답변 등록" : "답변 대기"
              }] 상태로 변경되었습니다.`,
      });
    }

    // 2. 관리자 전용 상태 변경 (숨김 처리 + 숨김 사유 기록, 또는 중요 공지 상단 고정)
    if (
      typeof body.isHidden === "boolean" ||
      typeof body.isPinned === "boolean"
    ) {
      if (!isBoardAdmin) {
        const postDeptName =
          BOARD_MAP[post.board as BoardType]?.shortName || post.board;
        return NextResponse.json(
          {
            error:
              user.role === "DEPT_ADMIN"
                ? `권한 없음: ${
                    BOARD_MAP[user.department as BoardType]?.shortName
                  } 관리자는 ${postDeptName} 게시물을 관리할 수 없습니다.`
                : "권한 없음: 해당 공간의 관리자만 게시물을 관리할 수 있습니다.",
          },
          { status: 403 }
        );
      }

      const reason =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim()
          : body.isHidden
          ? "게시판 운영 정책에 따른 숨김 조치"
          : null;

      const updated = await prisma.post.update({
        where: { id: postId },
        data: {
          ...(typeof body.isHidden === "boolean"
            ? {
                isHidden: body.isHidden,
                hiddenReason: body.isHidden ? reason : null,
              }
            : {}),
          ...(typeof body.isPinned === "boolean"
            ? { isPinned: body.isPinned }
            : {}),
        },
      });

      if (typeof body.isHidden === "boolean") {
        await prisma.auditLog.create({
          data: {
            adminId: user.id,
            adminName: user.name,
            adminRole: user.role,
            action: body.isHidden ? "게시글 숨김 조치" : "게시글 숨김 해제",
            targetType: "POST",
            targetId: postId,
            detail: body.isHidden
              ? `[#${postId}] '${post.title}' 숨김 처리 - 사유: ${reason}`
              : `[#${postId}] '${post.title}' 숨김 해제`,
          },
        });
      }

      if (typeof body.isPinned === "boolean") {
        await prisma.auditLog.create({
          data: {
            adminId: user.id,
            adminName: user.name,
            adminRole: user.role,
            action: body.isPinned ? "중요 공지 상단 고정" : "중요 공지 고정 해제",
            targetType: "POST",
            targetId: postId,
            detail: `[#${postId}] '${post.title}' 상단 고정 ${
              body.isPinned ? "설정" : "해제"
            }`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        isHidden: updated.isHidden,
        hiddenReason: updated.hiddenReason,
        isPinned: updated.isPinned,
        message: "게시물 관리 상태가 변경되었습니다.",
      });
    }

    // 3. 일반 제목·본문 및 첨부파일 수정
    if (!isAuthor && !isBoardAdmin) {
      return NextResponse.json(
        { error: "권한 없음: 작성자 본인 또는 담당 관리자만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    const suspendError = checkUserSuspension(user);
    if (suspendError) {
      return NextResponse.json({ error: suspendError }, { status: 403 });
    }

    const title = (body.title ?? "").trim();
    const content = (body.content ?? "").trim();
    const deleteAttachmentIds: number[] = Array.isArray(
      body.deleteAttachmentIds
    )
      ? body.deleteAttachmentIds.map(Number)
      : [];
    const newAttachments = Array.isArray(body.newAttachments)
      ? body.newAttachments
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

    const remainingCount = Math.max(
      0,
      post._count.attachments - deleteAttachmentIds.length
    );
    const fileError = validateAttachments(newAttachments, remainingCount);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    if (deleteAttachmentIds.length > 0) {
      await prisma.attachment.deleteMany({
        where: {
          id: { in: deleteAttachmentIds },
          postId,
        },
      });
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        title,
        content,
        attachments:
          newAttachments.length > 0
            ? {
                create: newAttachments.map(
                  (f: {
                    fileName: string;
                    mimeType: string;
                    fileSize: number;
                    dataBase64: string;
                  }) => ({
                    fileName: f.fileName,
                    mimeType: f.mimeType || "application/octet-stream",
                    fileSize: Number(f.fileSize) || 0,
                    dataBase64: f.dataBase64,
                  })
                ),
              }
            : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      id: updated.id,
      message: "게시글이 수정되었습니다.",
    });
  } catch (error) {
    console.error("Failed to update post:", error);
    return NextResponse.json(
      { error: "게시글 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "권한 없음: 로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const postId = Number(id);
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: "오류 안내: 존재하지 않는 게시글입니다." },
        { status: 404 }
      );
    }

    const isBoardAdmin = canManageBoard(user, post.board);
    const isAuthor = post.authorId === user.id;

    if (!isAuthor && !isBoardAdmin) {
      const postDeptName =
        BOARD_MAP[post.board as BoardType]?.shortName || post.board;
      return NextResponse.json(
        {
          error:
            user.role === "DEPT_ADMIN"
              ? `권한 없음: ${
                  BOARD_MAP[user.department as BoardType]?.shortName
                } 관리자는 다른 공간(${postDeptName}) 게시물을 삭제할 수 없습니다.`
              : "권한 없음: 다른 사람의 글은 삭제할 수 없습니다.",
        },
        { status: 403 }
      );
    }

    let deleteReason = "작성자 본인 삭제";
    try {
      const body = await request.json();
      if (body?.reason) deleteReason = body.reason.trim();
    } catch {
      if (isBoardAdmin && !isAuthor) {
        deleteReason = "관리자 권한 삭제";
      }
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    if (isBoardAdmin) {
      await prisma.auditLog.create({
        data: {
          adminId: user.id,
          adminName: user.name,
          adminRole: user.role,
          action: "게시글 삭제 조치",
          targetType: "POST",
          targetId: postId,
          detail: `[#${postId}] '${post.title}' 삭제 - 사유: ${deleteReason}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "게시글이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Failed to delete post:", error);
    return NextResponse.json(
      { error: "게시글 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
