import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  checkAdminPassword,
  createAdminSessionToken,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || !checkAdminPassword(password)) {
      return NextResponse.json(
        { error: "관리자 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();
    const response = NextResponse.json({
      success: true,
      message: "관리자로 로그인되었습니다.",
    });

    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

