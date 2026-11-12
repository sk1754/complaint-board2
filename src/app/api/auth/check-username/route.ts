import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = (searchParams.get("username") || "").trim();

    if (!username || username.length < 3) {
      return NextResponse.json(
        {
          available: false,
          message: "아이디를 3자 이상 입력해 주세요.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json({
        available: false,
        message: "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.",
      });
    }

    return NextResponse.json({
      available: true,
      message: "사용 가능한 아이디입니다.",
    });
  } catch (error) {
    console.error("Username check error:", error);
    return NextResponse.json(
      {
        available: false,
        message: "중복 확인 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
