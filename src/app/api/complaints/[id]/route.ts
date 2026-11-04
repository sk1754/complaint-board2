import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isAdminAuthenticated,
  verifyPassword,
  verifyPostAccessToken,
} from "@/lib/auth";
import { CATEGORIES, STATUSES } from "@/lib/constants";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const complaintId = Number(id);
    if (Number.isNaN(complaintId)) {
      return NextResponse.json(
        { error: "잘못된 게시글 번호입니다." },
        { status: 400 }
      );
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        replies: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: "존재하지 않는 게시글입니다." },
        { status: 404 }
      );
    }

    const isAdmin = await isAdminAuthenticated();
    const accessToken = request.headers.get("x-post-access-token");
    const hasAccessToken = verifyPostAccessToken(complaintId, accessToken);

    if (complaint.isSecret && !isAdmin && !hasAccessToken) {
      return NextResponse.json({
        locked: true,
        id: complaint.id,
        title: complaint.title,
        category: complaint.category,
        status: complaint.status,
        isSecret: complaint.isSecret,
        createdAt: complaint.createdAt,
        replyCount: complaint.replies.length,
        isAdmin: false,
      });
    }

    return NextResponse.json({
      locked: false,
      id: complaint.id,
      title: complaint.title,
      content: complaint.content,
      category: complaint.category,
      status: complaint.status,
      isSecret: complaint.isSecret,
      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt,
      replies: complaint.replies,
      isAdmin,
    });
  } catch (error) {
    console.error("Failed to fetch complaint detail:", error);
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
    const { id } = await context.params;
    const complaintId = Number(id);
    if (Number.isNaN(complaintId)) {
      return NextResponse.json(
        { error: "잘못된 게시글 번호입니다." },
        { status: 400 }
      );
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: "존재하지 않는 게시글입니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const isAdmin = await isAdminAuthenticated();

    // Admin updating status only
    if (isAdmin && body.status && !body.title && !body.content) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: "유효하지 않은 처리 상태입니다." },
          { status: 400 }
        );
      }

      const updated = await prisma.complaint.update({
        where: { id: complaintId },
        data: { status: body.status },
      });

      return NextResponse.json({
        success: true,
        status: updated.status,
        message: "처리 상태가 변경되었습니다.",
      });
    }

    // Author editing their complaint
    const password = (body.password || "").trim();
    const accessToken = request.headers.get("x-post-access-token");
    const isVerifiedByToken = verifyPostAccessToken(complaintId, accessToken);
    const isVerifiedByPassword =
      password && verifyPassword(password, complaint.passwordHash);

    if (!isAdmin && !isVerifiedByToken && !isVerifiedByPassword) {
      return NextResponse.json(
        { error: "비밀번호가 일치하지 않습니다." },
        { status: 403 }
      );
    }

    const title = (body.title ?? complaint.title).trim();
    const content = (body.content ?? complaint.content).trim();
    const category = CATEGORIES.includes(body.category)
      ? body.category
      : complaint.category;
    const isSecret =
      typeof body.isSecret === "boolean" ? body.isSecret : complaint.isSecret;

    if (!title || title.length < 2) {
      return NextResponse.json(
        { error: "제목을 2자 이상 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!content || content.length < 5) {
      return NextResponse.json(
        { error: "내용을 5자 이상 입력해 주세요." },
        { status: 400 }
      );
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        title,
        content,
        category,
        isSecret,
      },
    });

    return NextResponse.json({
      success: true,
      id: updated.id,
      message: "게시글이 수정되었습니다.",
    });
  } catch (error) {
    console.error("Failed to update complaint:", error);
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
    const { id } = await context.params;
    const complaintId = Number(id);
    if (Number.isNaN(complaintId)) {
      return NextResponse.json(
        { error: "잘못된 게시글 번호입니다." },
        { status: 400 }
      );
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: "존재하지 않는 게시글입니다." },
        { status: 404 }
      );
    }

    const isAdmin = await isAdminAuthenticated();
    let password = "";
    try {
      const body = await request.json();
      password = (body.password || "").trim();
    } catch {
      // ignore empty body if admin
    }

    const accessToken = request.headers.get("x-post-access-token");
    const isVerifiedByToken = verifyPostAccessToken(complaintId, accessToken);
    const isVerifiedByPassword =
      password && verifyPassword(password, complaint.passwordHash);

    if (!isAdmin && !isVerifiedByToken && !isVerifiedByPassword) {
      return NextResponse.json(
        { error: "비밀번호가 일치하지 않아 삭제할 수 없습니다." },
        { status: 403 }
      );
    }

    await prisma.complaint.delete({
      where: { id: complaintId },
    });

    return NextResponse.json({
      success: true,
      message: "게시글이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Failed to delete complaint:", error);
    return NextResponse.json(
      { error: "게시글 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

