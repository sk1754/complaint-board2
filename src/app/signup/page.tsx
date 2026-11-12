"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BOARDS, BOARD_MAP, BoardType } from "@/lib/constants";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState<BoardType>("COMP");

  const [checkStatus, setCheckStatus] = useState<{
    checked: boolean;
    available: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCheckDuplicate() {
    setError(null);
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 3) {
      setCheckStatus({
        checked: true,
        available: false,
        message: "아이디를 3자 이상 입력해 주세요.",
      });
      return;
    }

    try {
      const res = await fetch(
        `/api/auth/check-username?username=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();
      setCheckStatus({
        checked: true,
        available: Boolean(data.available),
        message: data.message,
      });
    } catch {
      setCheckStatus({
        checked: true,
        available: false,
        message: "중복 확인 중 오류가 발생했습니다.",
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("입력 오류: 아이디를 입력해 주세요.");
      return;
    }
    if (!password.trim()) {
      setError("입력 오류: 비밀번호를 입력해 주세요.");
      return;
    }
    if (!name.trim()) {
      setError("입력 오류: 이름(실명)을 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          name,
          department,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "회원가입에 실패했습니다.");
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
          회원가입 화면
        </h1>
        <span className="text-[#cccccc] text-sm">|</span>
        <span className="text-[13px] text-[#888888]">
          아이디 · 비밀번호 · 이름 · 소속 학과 등록
        </span>
      </div>

      {error && (
        <div className="p-3 border border-[#d9534f] bg-[#fdf7f7] text-[#c9302c] text-[12px] font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="border-t-2 border-[#555555] border-b border-[#999999]">
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {/* 아이디 + 중복 확인 */}
              <tr className="border-b border-[#dcdcdc]">
                <th className="w-[160px] bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  아이디 <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setCheckStatus(null);
                      }}
                      placeholder="3자 이상 아이디 입력 (예: user1)"
                      className="h-[30px] w-60 px-2.5 border border-[#cccccc] text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={handleCheckDuplicate}
                      className="h-[30px] px-3 bg-[#555555] hover:bg-[#333333] text-white text-[12px] font-bold cursor-pointer"
                    >
                      아이디 중복 확인
                    </button>
                  </div>
                  {checkStatus && (
                    <p
                      className={`text-[12px] font-semibold ${
                        checkStatus.available
                          ? "text-[#1d6fa5]"
                          : "text-[#c9302c]"
                      }`}
                    >
                      {checkStatus.message}
                    </p>
                  )}
                </td>
              </tr>

              {/* 비밀번호 */}
              <tr className="border-b border-[#dcdcdc]">
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  비밀번호 <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="4자 이상 입력"
                    className="h-[30px] w-60 px-2.5 border border-[#cccccc] text-[13px]"
                  />
                </td>
              </tr>

              {/* 이름 (실명) */}
              <tr className="border-b border-[#dcdcdc]">
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  이름 (실명) <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="예: 홍길동"
                      className="h-[30px] w-60 px-2.5 border border-[#cccccc] text-[13px]"
                    />
                    <span className="text-[11px] text-[#777777]">
                      * 게시글 작성자로 표시됩니다.
                    </span>
                  </div>
                </td>
              </tr>

              {/* 소속 학과 선택 (컴전과, 항공과, 메카과, 정통과) */}
              <tr>
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  소속 학과 선택 <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as BoardType)}
                    className="h-[30px] px-2.5 border border-[#cccccc] bg-white text-[13px]"
                  >
                    {BOARDS.map((b) => (
                      <option key={b} value={b}>
                        {BOARD_MAP[b].shortName} ({BOARD_MAP[b].fullName})
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="h-[36px] px-6 bg-[#e66b19] hover:bg-[#d4590a] disabled:opacity-50 text-white text-[13px] font-bold cursor-pointer"
          >
            {loading ? "가입 처리 중..." : "회원가입"}
          </button>
          <Link
            href="/login"
            className="h-[36px] px-6 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[13px] font-bold inline-flex items-center justify-center"
          >
            로그인 화면으로
          </Link>
        </div>
      </form>
    </div>
  );
}
