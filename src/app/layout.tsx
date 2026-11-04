import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import Link from "next/link";

export const metadata: Metadata = {
  title: "익명신문고 | 불만 및 건의사항",
  description:
    "누구나 개인정보 노출 없이 익명으로 불만과 건의사항을 등록하고 답변을 받을 수 있는 공간입니다.",
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

        {/* 하단 기업형 푸터 (사진 하단 레이아웃과 동일한 구조) */}
        <footer className="w-full bg-white mt-16">
          <div className="max-w-[980px] mx-auto px-4">
            <div className="border-t border-[#cccccc] py-7 grid grid-cols-1 sm:grid-cols-3 gap-6 text-[11px] text-[#777777] leading-[1.8]">
              {/* 좌측 약관 링크 */}
              <div className="flex flex-col space-y-0.5 font-semibold text-[#555555]">
                <Link href="/" className="hover:underline">
                  이용약관
                </Link>
                <Link href="/" className="text-[#e66b19] hover:underline">
                  익명보장운영(처리)방침
                </Link>
                <Link href="/" className="hover:underline">
                  이메일무단수집거부
                </Link>
                <Link href="/complaints/new" className="hover:underline">
                  온라인 불만접수
                </Link>
                <Link href="/admin/login" className="hover:underline">
                  관리자 로그인
                </Link>
              </div>

              {/* 중앙 주소/안내 */}
              <div className="space-y-0.5">
                <p>서울특별시 중구 세종대로 익명신문고 운영사무국</p>
                <p>(본 시스템은 작성자의 IP 및 브라우저 식별정보를 일절 수집하지 않습니다)</p>
                <p>익명보장 보안 프로토콜 :单방향 암호화(scrypt) 적용</p>
                <p>운영부서 : 고객소통지원팀 / 윤리경영실</p>
              </div>

              {/* 우측 연락처 */}
              <div className="space-y-0.5">
                <p>책임관리자 : 고충처리위원회</p>
                <p>종합안내번호 | 1544-0000</p>
                <p>팩스 | 02-0000-0000</p>
                <p>이메일 | voice@anonymous-board.kr</p>
              </div>
            </div>

            {/* 최하단 카피라이트 및 Related Site */}
            <div className="border-t border-[#e5e5e5] py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#888888]">
              <div className="flex items-center gap-4">
                <span className="text-[14px] font-bold text-[#555555] tracking-tight">
                  익명신문고
                </span>
                <span>
                  Copyright © 2026 ANONYMOUS VOICE BOARD INC. All rights
                  Reserved.
                </span>
              </div>

              <div className="relative">
                <select
                  defaultValue=""
                  className="w-44 h-7 px-2.5 border border-[#cccccc] bg-white text-[11px] text-[#666666] focus:outline-none"
                >
                  <option value="" disabled>
                    Related Site
                  </option>
                  <option value="home">익명신문고 메인</option>
                  <option value="new">익명 불만/건의 등록</option>
                  <option value="admin">관리자 센터</option>
                </select>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
