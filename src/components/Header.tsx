"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Search, ChevronDown } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [topSearch, setTopSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => setIsAdmin(Boolean(data.isAdmin)))
      .catch(() => setIsAdmin(false));
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
    router.refresh();
  }

  function handleTopSearch(e: React.FormEvent) {
    e.preventDefault();
    if (topSearch.trim()) {
      router.push(`/?q=${encodeURIComponent(topSearch.trim())}`);
    }
  }

  const currentBreadcrumb =
    pathname === "/complaints/new"
      ? "익명불만등록"
      : pathname.startsWith("/admin")
      ? "관리자인증"
      : "익명불만게시판";

  return (
    <div className="w-full bg-white">
      {/* 1. 상단 유틸리티 바 (회색 배경) */}
      <div className="w-full bg-[#efefef] border-b border-[#e2e2e2] h-8 text-[11px] text-[#666666]">
        <div className="max-w-[980px] mx-auto px-4 h-full flex items-center justify-end gap-3">
          <Link href="/complaints/new" className="hover:underline">
            익명제보등록
          </Link>
          <span className="text-[#cccccc]">|</span>
          {isAdmin ? (
            <>
              <span className="text-[#e66b19] font-bold">관리자 접속중</span>
              <span className="text-[#cccccc]">|</span>
              <button
                type="button"
                onClick={handleLogout}
                className="hover:underline cursor-pointer"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link href="/admin/login" className="hover:underline">
              관리자로그인
            </Link>
          )}
          <span className="text-[#cccccc]">|</span>
          <Link href="/" className="hover:underline">
            Q&amp;A
          </Link>

          <form
            onSubmit={handleTopSearch}
            className="ml-1 flex items-center bg-[#7b7b7b] h-5 px-2 w-36"
          >
            <input
              type="text"
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              placeholder="SEARCH"
              className="bg-transparent text-white placeholder-[#cccccc] text-[10px] w-full focus:outline-none"
            />
            <button type="submit" className="text-white cursor-pointer">
              <Search className="w-3 h-3" />
            </button>
          </form>
        </div>
      </div>

      {/* 2. 메인 GNB 헤더 */}
      <header className="w-full bg-white border-b border-[#dcdcdc]">
        <div className="max-w-[980px] mx-auto px-4 h-[68px] flex items-center justify-between">
          {/* 좌측 기업형 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-3 py-1 rounded-[100px] bg-[#0c4da2] text-white font-extrabold text-[11px] tracking-wider italic">
              OPEN VOICE
            </span>
            <span className="text-[19px] font-bold text-[#222222] tracking-tight">
              익명신문고
            </span>
          </Link>

          {/* 중앙 GNB 메뉴 */}
          <nav className="hidden md:flex items-center gap-10 text-[15px] font-bold text-[#333333]">
            <Link
              href="/"
              className="hover:text-[#0c4da2] transition-colors py-5"
            >
              제도소개
            </Link>
            <Link
              href="/"
              className="hover:text-[#0c4da2] transition-colors py-5"
            >
              익명보장원칙
            </Link>
            <Link
              href="/"
              className={`py-5 transition-colors ${
                pathname === "/" || pathname.startsWith("/complaints")
                  ? "text-[#0c4da2]"
                  : "hover:text-[#0c4da2]"
              }`}
            >
              불만·건의접수
            </Link>
            <Link
              href="/complaints/new"
              className="hover:text-[#0c4da2] transition-colors py-5"
            >
              온라인제보
            </Link>
            <Link
              href="/admin/login"
              className="hover:text-[#0c4da2] transition-colors py-5"
            >
              관리자센터
            </Link>
          </nav>

          {/* 우측 오렌지 포인트 박스 (사진의 Healthy Value 버튼 스타일) */}
          <Link
            href="/complaints/new"
            className="h-[68px] px-6 bg-gradient-to-b from-[#f7941d] to-[#e66b19] hover:from-[#e66b19] hover:to-[#d4590a] text-white flex flex-col items-center justify-center font-bold text-[14px] tracking-tight shadow-inner transition-colors"
          >
            <span>익명 불만 접수</span>
            <span className="text-[10px] font-normal opacity-90">
              Anonymous Report
            </span>
          </Link>
        </div>
      </header>

      {/* 3. 서브 비주얼 배너 (사진의 RECRUIT 은회색 배너 스타일) */}
      <div className="w-full h-[145px] bg-gradient-to-r from-[#d2d4d6] via-[#e8eaec] to-[#d5d7d9] border-b border-[#d0d0d0] overflow-hidden">
        <div className="max-w-[980px] mx-auto px-4 h-full flex items-center justify-between relative">
          <div className="pl-2 sm:pl-8">
            <p className="text-[36px] sm:text-[42px] font-light tracking-[0.06em] text-[#4a4a4a] uppercase leading-none">
              VOICE OF CUSTOMER
            </p>
            <p className="text-[12px] text-[#666666] mt-2 tracking-tight">
              열린 소통과 철저한 익명 보장으로 더 나은 문화를 만들어 갑니다.
            </p>
          </div>

          {/* 우측 비즈니스/오피스 장식 그래픽 영역 */}
          <div className="hidden sm:flex items-end h-full pr-6 select-none">
            <div className="flex items-end gap-4">
              <div className="w-24 h-28 rounded-t-full bg-gradient-to-b from-[#8b96a5]/30 to-[#525e6e]/40 border border-white/50 flex flex-col items-center justify-end pb-3">
                <div className="w-9 h-9 rounded-full bg-white/70 mb-2" />
                <div className="w-16 h-10 rounded-t-xl bg-[#3b4754]/60" />
              </div>
              <div className="w-28 h-32 rounded-t-full bg-gradient-to-b from-[#f7941d]/20 to-[#e66b19]/30 border border-white/60 flex flex-col items-center justify-end pb-3">
                <div className="w-10 h-10 rounded-full bg-white/80 mb-2" />
                <div className="w-18 h-12 rounded-t-xl bg-[#555555]/50" />
              </div>
              <div className="w-24 h-28 rounded-t-full bg-gradient-to-b from-[#8b96a5]/30 to-[#525e6e]/40 border border-white/50 flex flex-col items-center justify-end pb-3">
                <div className="w-9 h-9 rounded-full bg-white/70 mb-2" />
                <div className="w-16 h-10 rounded-t-xl bg-[#2c3847]/60" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 브레드크럼 (경로 표시 바) */}
      <div className="w-full bg-white border-b border-[#e1e1e1] h-10 text-[12px] text-[#666666]">
        <div className="max-w-[980px] mx-auto px-4 h-full flex items-center">
          <Link
            href="/"
            className="h-full px-3 flex items-center justify-center border-l border-r border-[#ececec] text-[#555555] hover:text-[#222222]"
            title="홈으로"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>
          <div className="h-full px-5 flex items-center border-r border-[#ececec] text-[#777777]">
            고객지원
          </div>
          <div className="h-full px-5 flex items-center gap-2 border-r border-[#ececec] font-bold text-[#333333]">
            <span className="border-b border-[#333333] pb-0.5">
              {currentBreadcrumb}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#666666]" />
          </div>
        </div>
      </div>
    </div>
  );
}
