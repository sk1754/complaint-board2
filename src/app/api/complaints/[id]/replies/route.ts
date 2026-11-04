import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { STATUSES } from "@/lib/constants";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const complaintId = Number(id);
    if (Number.isNaN(complaintId)) {
      return NextResponse.json(
        { error: "잘못된 게시글 번호입니다." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const content = (body.content || "").trim();
    const authorName = (body.authorName || "담당 관리자").trim() || "담당 관리자";
    const status = STATUSES.includes(body.status) ? body.status : "RESOLVED";

    if (!content) {
      return NextResponse.json(
        { error: "답변 내용을 입력해 주세요." },
        { status: 400 }
      );
    }

    const [reply] = await prisma.$transaction([
      prisma.reply.create({
        data: {
          complaintId,
          authorName,
          content,
        },
      }),
      prisma.complaint.update({
        where: { id: complaintId },
        data: { status },
      }),
    ]);

    return NextResponse.json(
      {
        reply,
        status,
        message: "답변이 등록되고 상태가 업데이트되었습니다.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create reply:", error);
    return NextResponse.json(
      { error: "답변 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

