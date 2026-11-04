"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[28px] font-normal text-[#222222] tracking-tight">
          관리자 로그인
        </h1>
        <span className="text-[#cccccc] text-sm">|</span>
        <span className="text-[13px] text-[#888888]">Administrator Login</span>
      </div>

      <div className="border-t-2 border-[#555555] border-b border-[#999999] bg-[#fafafa] py-12 px-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-md mx-auto bg-white border border-[#dcdcdc] p-8 space-y-5"
        >
          <div className="border-b border-[#eeeeee] pb-3">
            <h2 className="text-[16px] font-bold text-[#333333]">
              담당자 인증
            </h2>
            <p className="text-[12px] text-[#777777] mt-1">
              불만/건의사항 상태 변경 및 답변 등록을 위해 관리자 비밀번호를 입력해 주세요.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-[12px] font-bold text-[#444444]">
              관리자 비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력 (기본값: admin1234)"
              required
              autoFocus
              className="w-full h-[34px] px-3 border border-[#cccccc] text-[13px] focus:outline-none focus:border-[#555555]"
            />
            {error && (
              <p className="text-[12px] text-[#c9302c] font-semibold">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-[36px] bg-[#e66b19] hover:bg-[#d4590a] disabled:opacity-50 text-white text-[13px] font-bold cursor-pointer"
            >
              {loading ? "확인 중..." : "로그인"}
            </button>
            <Link
              href="/"
              className="h-[36px] px-4 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#555555] text-[13px] inline-flex items-center justify-center"
            >
              취소
            </Link>
          </div>

          <div className="pt-3 border-t border-[#eeeeee] text-[11px] text-[#888888]">
            * 초기 설정된 관리자 비밀번호는 <strong>admin1234</strong> 입니다.
          </div>
        </form>
      </div>
    </div>
  );
}
