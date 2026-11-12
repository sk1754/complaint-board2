import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import Link from "next/link";

export const metadata: Metadata = {
  title: "제2공학관 다중게시판 | 항공과 · 컴전과 · 메카과 · 정통과",
  description:
    "제2공학관 공지글 및 항공과, 컴전과, 메카과, 정통과 실명 다중게시판 시스템입니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col bg-white text-[#333333]">
        <Header />

        <main className="flex-1 max-w-[980px] w-full mx-auto px-4 py-10">
          {children}
        </main>

        <footer className="w-full bg-white mt-16">
          <div className="max-w-[980px] mx-auto px-4">
            <div className="border-t border-[#cccccc] py-7 grid grid-cols-1 sm:grid-cols-3 gap-6 text-[11px] text-[#777777] leading-[1.8]">
              <div className="flex flex-col space-y-0.5 font-semibold text-[#555555]">
                <Link href="/" className="hover:underline">
                  이용약관
                </Link>
                <Link href="/" className="text-[#e66b19] hover:underline">
                  실명게시판 운영원칙
                </Link>
                <Link href="/signup" className="hover:underline">
                  실명 회원가입
                </Link>
                <Link href="/login" className="hover:underline">
                  로그인
                </Link>
              </div>

              <div className="space-y-0.5">
                <p>제2공학관 통합 행정실 (항공과 · 컴전과 · 메카과 · 정통과)</p>
                <p>본 게시판은 회원가입 시 등록한 실명(이름)으로 작성자가 표시됩니다.</p>
                <p>작성자 본인 및 관리자만 게시글 수정·삭제 권한을 가집니다.</p>
              </div>

              <div className="space-y-0.5">
                <p>운영총괄 : 제2공학관 학과연합 운영위원회</p>
                <p>대표전화 | 02-1234-2000</p>
                <p>팩스 | 02-1234-2099</p>
                <p>이메일 | eng2@university.ac.kr</p>
              </div>
            </div>

            <div className="border-t border-[#e5e5e5] py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#888888]">
              <div className="flex items-center gap-4">
                <span className="text-[14px] font-bold text-[#555555] tracking-tight">
                  제2공학관 다중게시판
                </span>
                <span>
                  Copyright © 2026 ENGINEERING BUILDING II MULTI-BOARD SYSTEM.
                  All rights Reserved.
                </span>
              </div>

              <div className="relative">
                <select
                  defaultValue=""
                  className="w-44 h-7 px-2.5 border border-[#cccccc] bg-white text-[11px] text-[#666666] focus:outline-none"
                >
                  <option value="" disabled>
                    학과 바로가기
                  </option>
                  <option value="AERO">항공과 게시판</option>
                  <option value="COMP">컴전과 게시판</option>
                  <option value="MECHA">메카과 게시판</option>
                  <option value="INFO">정통과 게시판</option>
                </select>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
