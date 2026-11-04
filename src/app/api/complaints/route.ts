import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, isAdminAuthenticated } from "@/lib/auth";
import { CATEGORIES, STATUSES } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const category = searchParams.get("category") || "ALL";
    const q = (searchParams.get("q") || "").trim();
    const isAdmin = await isAdminAuthenticated();

    const where: Record<string, unknown> = {};

    if (status !== "ALL" && STATUSES.includes(status as never)) {
      where.status = status;
    }

    if (category !== "ALL" && CATEGORIES.includes(category as never)) {
      where.category = category;
    }

    if (q) {
      where.OR = [
        { title: { contains: q } },
        // Only search secret content if admin, or search public content
        ...(isAdmin
          ? [{ content: { contains: q } }]
          : [{ AND: [{ isSecret: false }, { content: { contains: q } }] }]),
      ];
    }

    const [complaints, totalCount, pendingCount, inProgressCount, resolvedCount] =
      await Promise.all([
        prisma.complaint.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: { replies: true },
            },
          },
        }),
        prisma.complaint.count(),
        prisma.complaint.count({ where: { status: "PENDING" } }),
        prisma.complaint.count({ where: { status: "IN_PROGRESS" } }),
        prisma.complaint.count({ where: { status: "RESOLVED" } }),
      ]);

    const items = complaints.map((item) => ({
      id: item.id,
      title: item.title,
      contentPreview:
        item.isSecret && !isAdmin
          ? "비밀글입니다. 작성 시 설정한 비밀번호를 입력하여 확인하실 수 있습니다."
          : item.content.length > 100
          ? `${item.content.slice(0, 100)}...`
          : item.content,
      category: item.category,
      status: item.status,
      isSecret: item.isSecret,
      replyCount: item._count.replies,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({
      items,
      stats: {
        total: totalCount,
        pending: pendingCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
      },
      isAdmin,
    });
  } catch (error) {
    console.error("Failed to fetch complaints:", error);
    return NextResponse.json(
      { error: "목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = (body.title || "").trim();
    const content = (body.content || "").trim();
    const category = body.category || "OTHER";
    const isSecret = Boolean(body.isSecret);
    const password = (body.password || "").trim();

    if (!title || title.length < 2) {
      return NextResponse.json(
        { error: "제목을 2자 이상 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!content || content.length < 5) {
      return NextResponse.json(
        { error: "불만/건의 내용을 5자 이상 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "본인 확인용 비밀번호를 4자 이상 입력해 주세요." },
        { status: 400 }
      );
    }

    const validCategory = CATEGORIES.includes(category) ? category : "OTHER";
    const passwordHash = hashPassword(password);

    const created = await prisma.complaint.create({
      data: {
        title,
        content,
        category: validCategory,
        isSecret,
        passwordHash,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        message: "불만/건의사항이 익명으로 등록되었습니다.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create complaint:", error);
    return NextResponse.json(
      { error: "게시글 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

