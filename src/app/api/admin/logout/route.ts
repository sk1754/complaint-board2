import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "로그아웃되었습니다.",
  });

  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}

