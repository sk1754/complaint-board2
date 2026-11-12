import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "/login 페이지를 이용해 주세요." },
    { status: 400 }
  );
}
