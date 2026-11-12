import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkUserSuspension } from "@/lib/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "답변을 작성하려면 로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 이용 제한 계정 작성 차단 (4단계 완료 기준 5)
    const suspendError = checkUserSuspension(user);
    if (suspendError) {
      return NextResponse.json({ error: suspendError }, { status: 403 });
    }

    const { id } = await context.params;
    const postId = Number(id);
    if (Number.isNaN(postId)) {
      return NextResponse.json(
        { error: "잘못된 게시글 번호입니다." },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: "존재하지 않는 게시글입니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const content = (body.content || "").trim();

    if (!content) {
      return NextResponse.json(
        { error: "답변 내용을 입력해 주세요." },
        { status: 400 }
      );
    }

    // 해당 공간 관리자의 답변인지 판별하여 공식 답변(isOfficial) 표시 부여
    const isOfficial =
      user.role === "SUPER_ADMIN" ||
      (user.role === "DEPT_ADMIN" && user.department === post.board);

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        isOfficial,
        content,
      },
    });

    // 질문글에 답변이 달리면 '답변 대기(WAITING)' -> '답변 등록(ANSWERED)'으로 자동 변경!
    if (!post.isNotice && post.questionStatus === "WAITING") {
      await prisma.post.update({
        where: { id: postId },
        data: { questionStatus: "ANSWERED" },
      });
    }

    // 내 질문/게시글에 다른 사람이 답변을 등록하면 새 답변 알림(Notification) 자동 생성! (4단계 완료 기준 2)
    if (post.authorId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          postId: post.id,
          type: isOfficial ? "OFFICIAL_ANSWER" : "NEW_ANSWER",
          message: `[${isOfficial ? "공식 답변" : "새 답변"}] '${
            post.title
          }' 글에 ${user.name}님이 답변을 등록했습니다.`,
        },
      });
    }

    return NextResponse.json(
      {
        comment,
        message: isOfficial
          ? "공식 답변이 등록되었습니다."
          : "답변이 등록되었습니다.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { error: "답변 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
