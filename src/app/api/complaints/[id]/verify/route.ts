import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createPostAccessToken,
  isAdminAuthenticated,
  verifyPassword,
} from "@/lib/auth";

export async function POST(
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
    if (isAdmin) {
      return NextResponse.json({
        verified: true,
        accessToken: createPostAccessToken(complaintId),
      });
    }

    const body = await request.json();
    const password = (body.password || "").trim();

    if (!password || !verifyPassword(password, complaint.passwordHash)) {
      return NextResponse.json(
        { error: "비밀번호가 일치하지 않습니다." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      verified: true,
      accessToken: createPostAccessToken(complaintId),
    });
  } catch (error) {
    console.error("Failed to verify password:", error);
    return NextResponse.json(
      { error: "비밀번호 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

