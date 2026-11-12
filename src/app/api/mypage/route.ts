import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const [myPosts, myComments, unresolvedQuestions] = await Promise.all([
      prisma.post.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { comments: true, attachments: true } },
        },
      }),
      prisma.comment.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          post: {
            select: {
              id: true,
              board: true,
              title: true,
              questionStatus: true,
            },
          },
        },
      }),
      prisma.post.findMany({
        where: {
          authorId: user.id,
          isNotice: false,
          questionStatus: { not: "RESOLVED" },
        },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { comments: true } },
        },
      }),
    ]);

    return NextResponse.json({
      user,
      myPosts,
      myComments,
      unresolvedQuestions,
    });
  } catch (error) {
    console.error("Mypage fetch error:", error);
    return NextResponse.json(
      { error: "마이페이지 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const currentPassword = (body.currentPassword || "").trim();
    const newPassword = (body.newPassword || "").trim();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "현재 비밀번호와 새 비밀번호를 모두 입력해 주세요." },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "새 비밀번호는 4자 이상 입력해 주세요." },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    if (!dbUser || !verifyPassword(currentPassword, dbUser.passwordHash)) {
      return NextResponse.json(
        { error: "현재 비밀번호가 일치하지 않습니다." },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { passwordHash: hashPassword(newPassword) },
    });

    return NextResponse.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
