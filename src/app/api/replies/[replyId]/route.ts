import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
  request: Request,
  context: { params: Promise<{ replyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { replyId } = await context.params;
    const id = Number(replyId);

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "존재하지 않는 답변입니다." },
        { status: 404 }
      );
    }

    // 자신이 작성한 답변만 수정 가능
    if (comment.authorId !== user.id) {
      return NextResponse.json(
        { error: "권한 없음: 자신이 작성한 답변만 수정할 수 있습니다." },
        { status: 403 }
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

    const updated = await prisma.comment.update({
      where: { id },
      data: { content },
    });

    return NextResponse.json({
      comment: updated,
      message: "답변이 수정되었습니다.",
    });
  } catch (error) {
    console.error("Failed to update comment:", error);
    return NextResponse.json(
      { error: "답변 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ replyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { replyId } = await context.params;
    const id = Number(replyId);

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { post: true },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "존재하지 않는 답변입니다." },
        { status: 404 }
      );
    }

    const isSpaceAdmin =
      user.role === "SUPER_ADMIN" ||
      (user.role === "DEPT_ADMIN" && user.department === comment.post.board);

    if (comment.authorId !== user.id && !isSpaceAdmin) {
      return NextResponse.json(
        { error: "권한 없음: 자신이 작성한 답변만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    await prisma.comment.delete({
      where: { id },
    });

    // 남은 답변 개수 확인 후 0개이고 '답변 등록(ANSWERED)' 상태였다면 '답변 대기(WAITING)'로 복귀
    const remainingCount = await prisma.comment.count({
      where: { postId: comment.postId },
    });

    if (remainingCount === 0 && comment.post.questionStatus === "ANSWERED") {
      await prisma.post.update({
        where: { id: comment.postId },
        data: { questionStatus: "WAITING" },
      });
    }

    return NextResponse.json({
      success: true,
      message: "답변이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json(
      { error: "답변 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
