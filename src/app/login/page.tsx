"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }
      const userDept = data.user?.department || "COMP";
      router.push(`/?board=${userDept}`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function fillQuickAccount(id: string) {
    setUsername(id);
    setPassword("1234");
  }

  return (
    <div className="max-w-[980px] mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-[24px] sm:text-[28px] font-normal text-[#222222] tracking-tight">
          로그인 화면
        </h1>
        <span className="text-[#cccccc] text-sm">|</span>
        <span className="text-[13px] text-[#888888]">
          로그인 시 본인 소속 학과 게시판으로 기본 이동
        </span>
      </div>

      <div className="border-t-2 border-[#555555] border-b border-[#999999] bg-[#fafafa] py-12 px-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-lg mx-auto bg-white border border-[#dcdcdc] p-8 space-y-5"
        >
          <div className="border-b border-[#eeeeee] pb-3">
            <h2 className="text-[16px] font-bold text-[#333333]">
              제2공학관 통합포털 로그인
            </h2>
            <p className="text-[12px] text-[#777777] mt-1">
              로그인하면 회원 정보에 등록된 소속 학과 게시판이 우선 표시됩니다.
            </p>
          </div>

          {error && (
            <div className="p-2.5 border border-[#d9534f] bg-[#fdf7f7] text-[#c9302c] text-[12px] font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-bold text-[#444444] mb-1">
                아이디
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디 입력"
                required
                autoFocus
                className="w-full h-[34px] px-3 border border-[#cccccc] text-[13px] focus:outline-none focus:border-[#555555]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#444444] mb-1">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                required
                className="w-full h-[34px] px-3 border border-[#cccccc] text-[13px] focus:outline-none focus:border-[#555555]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-[36px] bg-[#e66b19] hover:bg-[#d4590a] disabled:opacity-50 text-white text-[13px] font-bold cursor-pointer"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
            <Link
              href="/signup"
              className="h-[36px] px-4 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[13px] font-bold inline-flex items-center justify-center"
            >
              회원가입
            </Link>
          </div>

          {/* 1~4단계 역할별 실습 테스트 계정 원클릭 입력 */}
          <div className="pt-4 border-t border-[#eeeeee] space-y-2 text-[11px] text-[#666666]">
            <p className="font-bold text-[#333333]">
              [1~4단계 실습용 기본 계정 빠른 선택 (비밀번호 모두 1234)]
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => fillQuickAccount("admin")}
                className="px-2.5 py-1.5 border border-[#0c4da2] bg-[#f0f7fc] text-[#0c4da2] font-bold text-left hover:bg-[#e1effa] cursor-pointer"
              >
                전체 관리자: admin (모든 공간 관리)
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("comp_admin")}
                className="px-2.5 py-1.5 border border-[#e66b19] bg-[#fffaf5] text-[#e66b19] font-bold text-left hover:bg-[#fceede] cursor-pointer"
              >
                컴전과 관리자: comp_admin (컴전과 관리)
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("aero_admin")}
                className="px-2.5 py-1.5 border border-[#e66b19] bg-[#fffaf5] text-[#e66b19] font-bold text-left hover:bg-[#fceede] cursor-pointer"
              >
                항공과 관리자: aero_admin (항공과 관리)
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("user2")}
                className="px-2.5 py-1.5 border border-[#cccccc] bg-[#f7f7f7] text-[#333333] text-left hover:bg-[#eaeaea] cursor-pointer"
              >
                일반 학생(컴전과): user2 (이컴전·새알림 보유)
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("user1")}
                className="px-2.5 py-1.5 border border-[#cccccc] bg-[#f7f7f7] text-[#333333] text-left hover:bg-[#eaeaea] cursor-pointer"
              >
                일반 학생(항공과): user1 (김항공)
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("banned_user")}
                className="px-2.5 py-1.5 border border-[#c9302c] bg-[#fdf2f2] text-[#c9302c] font-bold text-left hover:bg-[#fae3e3] cursor-pointer"
              >
                이용제한 학생: banned_user (작성 차단 테스트)
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
