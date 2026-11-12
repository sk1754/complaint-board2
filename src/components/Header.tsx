"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Home, Search, ChevronDown, Bell, User } from "lucide-react";
import { BOARD_MAP, BoardType, ROLE_MAP, UserRole } from "@/lib/constants";

interface UserInfo {
  id: number;
  username: string;
  name: string;
  department: string;
  role: string;
  isSuspended?: boolean;
}

function HeaderInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlBoard = searchParams.get("board") || "ALL";

  const [user, setUser] = useState<UserInfo | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [topSearch, setTopSearch] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const u = data.user || null;
        setUser(u);
        if (u) {
          fetch("/api/notifications", { cache: "no-store" })
            .then((r) => r.json())
            .then((nData) => setUnreadCount(nData.unreadCount || 0))
            .catch(() => setUnreadCount(0));
        } else {
          setUnreadCount(0);
        }
      })
      .catch(() => {
        setUser(null);
        setUnreadCount(0);
      });
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setUnreadCount(0);
    router.push("/");
    router.refresh();
  }

  function handleTopSearch(e: React.FormEvent) {
    e.preventDefault();
    if (topSearch.trim()) {
      router.push(
        `/?board=${urlBoard}&q=${encodeURIComponent(topSearch.trim())}`
      );
    } else {
      router.push(`/?board=${urlBoard}`);
    }
  }

  const currentBreadcrumb =
    pathname === "/admin"
      ? "관리자 신고·회원·운영 현황"
      : pathname === "/mypage"
      ? "마이페이지 · 내 정보 및 비밀번호 변경"
      : pathname === "/notifications"
      ? "알림함 (새 답변 알림)"
      : pathname === "/complaints/new"
      ? "게시글 작성 (첨부파일 지원)"
      : pathname.endsWith("/edit")
      ? "게시글 수정 (첨부파일 교체)"
      : pathname.startsWith("/complaints/")
      ? "게시글 상세 · 첨부자료 · 질의응답"
      : pathname === "/login"
      ? "로그인"
      : pathname === "/signup"
      ? "회원가입"
      : urlBoard === "ALL"
      ? "통합 메인 · 전체 글 모아보기"
      : `${BOARD_MAP[urlBoard as BoardType]?.shortName || urlBoard} 게시판`;

  return (
    <div className="w-full bg-white">
      {/* 1. 상단 유틸리티 바 */}
      <div className="w-full bg-[#efefef] border-b border-[#e2e2e2] min-h-8 py-1 text-[11px] text-[#666666]">
        <div className="max-w-[980px] mx-auto px-4 flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {user ? (
            <>
              <span className="text-[#333333]">
                <strong className="text-[#0c4da2]">{user.name}</strong> [
                {ROLE_MAP[user.role as UserRole] || user.role} ·{" "}
                {BOARD_MAP[user.department as BoardType]?.shortName ||
                  user.department}
                ]
                {user.isSuspended && (
                  <span className="ml-1 px-1.5 py-0.5 bg-[#fae3e3] text-[#c9302c] font-bold text-[10px]">
                    이용제한중
                  </span>
                )}
              </span>
              <span className="text-[#cccccc]">|</span>
              <Link
                href="/notifications"
                className="inline-flex items-center gap-1 font-bold text-[#0c4da2] hover:underline"
              >
                <Bell className="w-3 h-3" />
                <span>알림함</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-[#e66b19] text-white text-[10px] font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <span className="text-[#cccccc]">|</span>
              <Link
                href="/mypage"
                className="inline-flex items-center gap-1 font-bold text-[#333333] hover:underline"
              >
                <User className="w-3 h-3" />
                <span>마이페이지</span>
              </Link>
              <span className="text-[#cccccc]">|</span>
              <Link
                href="/admin"
                className="font-bold text-[#e66b19] hover:underline"
              >
                관리자센터
              </Link>
              <span className="text-[#cccccc]">|</span>
              <button
                type="button"
                onClick={handleLogout}
                className="hover:underline font-semibold text-[#c9302c] cursor-pointer"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/signup" className="hover:underline">
                회원가입
              </Link>
              <span className="text-[#cccccc]">|</span>
              <Link href="/login" className="hover:underline">
                로그인
              </Link>
              <span className="text-[#cccccc]">|</span>
              <Link href="/admin" className="hover:underline">
                관리자센터
              </Link>
            </>
          )}

          <form
            onSubmit={handleTopSearch}
            className="ml-1 flex items-center bg-[#7b7b7b] h-5 px-2 w-32 sm:w-36"
          >
            <input
              type="text"
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              placeholder="통합 SEARCH"
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
          <Link href="/?board=ALL" className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-3 py-1 rounded-[100px] bg-[#0c4da2] text-white font-extrabold text-[11px] tracking-wider italic">
              STAGE 4
            </span>
            <span className="text-[16px] sm:text-[18px] font-bold text-[#222222] tracking-tight">
              제2공학관 통합포털
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-[13px] font-bold text-[#333333]">
            {[
              { code: "ALL", label: "통합메인·전체글" },
              { code: "COMMON", label: "2공학관 공통" },
              { code: "COMP", label: "컴전과" },
              { code: "AERO", label: "항공과" },
              { code: "MECHA", label: "메카과" },
              { code: "INFO", label: "정통과" },
            ].map((menu) => {
              const isSelected = pathname === "/" && urlBoard === menu.code;
              return (
                <Link
                  key={menu.code}
                  href={`/?board=${menu.code}`}
                  className={`py-5 transition-colors ${
                    isSelected
                      ? "text-[#0c4da2] border-b-2 border-[#0c4da2]"
                      : "hover:text-[#0c4da2]"
                  }`}
                >
                  {menu.label}
                </Link>
              );
            })}
            <Link
              href="/mypage"
              className={`py-5 transition-colors ${
                pathname === "/mypage"
                  ? "text-[#0c4da2] border-b-2 border-[#0c4da2]"
                  : "text-[#555555] hover:text-[#0c4da2]"
              }`}
            >
              마이페이지
            </Link>
            <Link
              href="/admin"
              className={`py-5 transition-colors ${
                pathname === "/admin"
                  ? "text-[#e66b19] border-b-2 border-[#e66b19]"
                  : "text-[#666666] hover:text-[#e66b19]"
              }`}
            >
              운영관리
            </Link>
          </nav>

          <Link
            href={`/complaints/new${
              urlBoard !== "ALL" ? `?board=${urlBoard}` : ""
            }`}
            className="h-[68px] px-4 sm:px-5 bg-gradient-to-b from-[#f7941d] to-[#e66b19] hover:from-[#e66b19] hover:to-[#d4590a] text-white flex flex-col items-center justify-center font-bold text-[12px] sm:text-[13px] tracking-tight shadow-inner transition-colors"
          >
            <span>질문 · 공지 등록</span>
            <span className="text-[10px] font-normal opacity-90">
              첨부파일 업로드
            </span>
          </Link>
        </div>

        {/* 모바일 전용 가로 스크롤 네비게이션 바 (모바일 대응) */}
        <div className="md:hidden border-t border-[#e5e5e5] bg-[#f8f9fb] px-3 py-2 flex items-center gap-2 overflow-x-auto text-[12px] font-bold whitespace-nowrap">
          {[
            { code: "ALL", label: "통합메인" },
            { code: "COMMON", label: "공통공간" },
            { code: "COMP", label: "컴전과" },
            { code: "AERO", label: "항공과" },
            { code: "MECHA", label: "메카과" },
            { code: "INFO", label: "정통과" },
          ].map((menu) => (
            <Link
              key={menu.code}
              href={`/?board=${menu.code}`}
              className={`px-2.5 py-1 border ${
                pathname === "/" && urlBoard === menu.code
                  ? "bg-[#0c4da2] text-white border-[#0c4da2]"
                  : "bg-white text-[#444444] border-[#dcdcdc]"
              }`}
            >
              {menu.label}
            </Link>
          ))}
          <Link
            href="/mypage"
            className={`px-2.5 py-1 border ${
              pathname === "/mypage"
                ? "bg-[#0c4da2] text-white border-[#0c4da2]"
                : "bg-white text-[#444444] border-[#dcdcdc]"
            }`}
          >
            마이페이지
          </Link>
          <Link
            href="/notifications"
            className={`px-2.5 py-1 border ${
              pathname === "/notifications"
                ? "bg-[#e66b19] text-white border-[#e66b19]"
                : "bg-white text-[#444444] border-[#dcdcdc]"
            }`}
          >
            알림함({unreadCount})
          </Link>
          <Link
            href="/admin"
            className={`px-2.5 py-1 border ${
              pathname === "/admin"
                ? "bg-[#333333] text-white border-[#333333]"
                : "bg-white text-[#444444] border-[#dcdcdc]"
            }`}
          >
            관리자
          </Link>
        </div>
      </header>

      {/* 3. 서브 비주얼 배너 */}
      <div className="w-full py-5 sm:h-[125px] bg-gradient-to-r from-[#d2d4d6] via-[#e8eaec] to-[#d5d7d9] border-b border-[#d0d0d0] overflow-hidden">
        <div className="max-w-[980px] mx-auto px-4 h-full flex items-center justify-between relative">
          <div className="pl-2 sm:pl-6">
            <p className="text-[22px] sm:text-[32px] font-light tracking-[0.05em] text-[#4a4a4a] uppercase leading-none">
              ENGINEERING PORTAL SERVICE
            </p>
            <p className="text-[11px] sm:text-[12px] text-[#666666] mt-2 tracking-tight">
              [4단계 완성] 첨부파일 업로드·권한검사 · 새 답변 알림함 · 마이페이지 · 신고 및 회원 이용 제한 · 관리자 처리 이력
            </p>
          </div>
        </div>
      </div>

      {/* 4. 브레드크럼 바 */}
      <div className="w-full bg-white border-b border-[#e1e1e1] h-10 text-[12px] text-[#666666]">
        <div className="max-w-[980px] mx-auto px-4 h-full flex items-center justify-between">
          <div className="h-full flex items-center overflow-x-auto whitespace-nowrap">
            <Link
              href="/?board=ALL"
              className="h-full px-3 flex items-center justify-center border-l border-r border-[#ececec] text-[#555555] hover:text-[#222222]"
              title="통합 메인으로"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
            <div className="hidden sm:flex h-full px-4 items-center border-r border-[#ececec] text-[#777777]">
              제2공학관 통합시스템
            </div>
            <div className="h-full px-4 flex items-center gap-2 border-r border-[#ececec] font-bold text-[#0c4da2]">
              <span>{currentBreadcrumb}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#666666]" />
            </div>
          </div>

          {user && (
            <div className="hidden sm:block text-[11px] text-[#555555]">
              접속자: <strong>{user.name}</strong> (
              {BOARD_MAP[user.department as BoardType]?.shortName} ·{" "}
              <strong className="text-[#e66b19]">
                {ROLE_MAP[user.role as UserRole]}
              </strong>
              )
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  return (
    <Suspense fallback={<div className="h-[245px] bg-white border-b" />}>
      <HeaderInner />
    </Suspense>
  );
}
