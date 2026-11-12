import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const attachmentId = Number(id);
    if (Number.isNaN(attachmentId)) {
      return NextResponse.json(
        { error: "잘못된 첨부파일 번호입니다." },
        { status: 400 }
      );
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { post: true },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "존재하지 않는 첨부파일입니다." },
        { status: 404 }
      );
    }

    // 다운로드 권한 검사: 원문 조회 권한이 있는 사람만 다운로드 허용
    const user = await getCurrentUser();
    const isSpaceAdmin = Boolean(
      user &&
        (user.role === "SUPER_ADMIN" ||
          (user.role === "DEPT_ADMIN" &&
            user.department === attachment.post.board))
    );
    const isAuthor = Boolean(user && user.id === attachment.post.authorId);

    if (attachment.post.isHidden && !isSpaceAdmin && !isAuthor) {
      return NextResponse.json(
        {
          error:
            "권한 없음: 숨김 처리된 게시물의 첨부파일은 원문 조회 권한이 있는 사용자만 다운로드할 수 있습니다.",
        },
        { status: 403 }
      );
    }

    const fileBuffer = Buffer.from(attachment.dataBase64, "base64");
    const encodedName = encodeURIComponent(attachment.fileName);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Length": String(fileBuffer.length),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
      },
    });
  } catch (error) {
    console.error("Attachment download error:", error);
    return NextResponse.json(
      { error: "첨부파일 다운로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const attachmentId = Number(id);

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { post: true },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "존재하지 않는 첨부파일입니다." },
        { status: 404 }
      );
    }

    const isSpaceAdmin =
      user.role === "SUPER_ADMIN" ||
      (user.role === "DEPT_ADMIN" && user.department === attachment.post.board);

    if (attachment.post.authorId !== user.id && !isSpaceAdmin) {
      return NextResponse.json(
        { error: "권한 없음: 작성자 본인만 첨부파일을 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({
      success: true,
      message: "첨부파일이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Attachment delete error:", error);
    return NextResponse.json(
      { error: "첨부파일 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
