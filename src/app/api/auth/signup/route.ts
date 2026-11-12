import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  hashPassword,
  USER_COOKIE_NAME,
} from "@/lib/auth";
import { BOARDS } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = (body.username || "").trim();
    const password = (body.password || "").trim();
    const name = (body.name || "").trim();
    const department = BOARDS.includes(body.department)
      ? body.department
      : "COMP";

    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: "아이디를 3자 이상 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "비밀번호를 4자 이상 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "실명(이름)을 2자 이상 입력해 주세요." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다." },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        name,
        department,
        role: "USER",
      },
    });

    const token = createSessionToken(user.id);
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          department: user.department,
          role: user.role,
        },
        message: "회원가입이 완료되었습니다.",
      },
      { status: 201 }
    );

    response.cookies.set(USER_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "회원가입 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
