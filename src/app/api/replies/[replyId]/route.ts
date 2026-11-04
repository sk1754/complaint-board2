import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export async function PUT(
  request: Request,
  context: { params: Promise<{ replyId: string }> }
) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const { replyId } = await context.params;
    const id = Number(replyId);
    const body = await request.json();
    const content = (body.content || "").trim();
    const authorName = (body.authorName || "담당 관리자").trim() || "담당 관리자";

    if (!content) {
      return NextResponse.json(
        { error: "답변 내용을 입력해 주세요." },
        { status: 400 }
      );
    }

    const updated = await prisma.reply.update({
      where: { id },
      data: { content, authorName },
    });

    return NextResponse.json({
      reply: updated,
      message: "답변이 수정되었습니다.",
    });
  } catch (error) {
    console.error("Failed to update reply:", error);
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
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const { replyId } = await context.params;
    const id = Number(replyId);

    await prisma.reply.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "답변이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Failed to delete reply:", error);
    return NextResponse.json(
      { error: "답변 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

