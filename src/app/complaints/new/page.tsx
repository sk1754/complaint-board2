"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CATEGORIES,
  CATEGORY_MAP,
  ComplaintCategory,
} from "@/lib/constants";

export default function NewComplaintPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ComplaintCategory>("SERVICE");
  const [content, setContent] = useState("");
  const [isSecret, setIsSecret] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError("제목을 2자 이상 입력해 주세요.");
      return;
    }
    if (content.trim().length < 5) {
      setError("내용을 5자 이상 입력해 주세요.");
      return;
    }
    if (password.trim().length < 4) {
      setError("비밀번호를 4자 이상 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          content,
          isSecret,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "등록 중 오류가 발생했습니다.");
        return;
      }

      if (isSecret && data.id) {
        try {
          const verifyRes = await fetch(`/api/complaints/${data.id}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.accessToken) {
            sessionStorage.setItem(
              `complaint_token_${data.id}`,
              verifyData.accessToken
            );
          }
        } catch {
          // ignore
        }
      }

      router.push(`/complaints/${data.id}`);
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
          익명 불만/건의 등록
        </h1>
        <span className="text-[#cccccc] text-sm">|</span>
        <span className="text-[13px] text-[#888888]">Write Anonymous Voice</span>
      </div>

      {error && (
        <div className="p-3 border border-[#d9534f] bg-[#fdf7f7] text-[#c9302c] text-[12px] font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="border-t-2 border-[#555555] border-b border-[#999999]">
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {/* 분류 선택 */}
              <tr className="border-b border-[#dcdcdc]">
                <th className="w-[150px] bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  불만구분 <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3">
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ComplaintCategory)
                    }
                    className="h-[30px] px-2.5 border border-[#cccccc] bg-white text-[13px] text-[#333333] focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_MAP[cat].label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>

              {/* 공개 여부 */}
              <tr className="border-b border-[#dcdcdc]">
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  공개여부 <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-6 text-[13px]">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="isSecret"
                        checked={isSecret === true}
                        onChange={() => setIsSecret(true)}
                      />
                      <span>비밀글 (본인 및 담당관리자만 열람)</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="isSecret"
                        checked={isSecret === false}
                        onChange={() => setIsSecret(false)}
                      />
                      <span>전체공개</span>
                    </label>
                  </div>
                </td>
              </tr>

              {/* 비밀번호 */}
              <tr className="border-b border-[#dcdcdc]">
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  비밀번호 <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="4자 이상 입력"
                      required
                      minLength={4}
                      className="h-[30px] w-52 px-2.5 border border-[#cccccc] text-[13px] focus:outline-none focus:border-[#555555]"
                    />
                    <span className="text-[11px] text-[#777777]">
                      * 비밀글 열람 및 본인 글 수정/삭제 시 필요합니다. (암호화 저장)
                    </span>
                  </div>
                </td>
              </tr>

              {/* 제목 */}
              <tr className="border-b border-[#dcdcdc]">
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  제목 <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력해 주세요"
                    required
                    className="h-[30px] w-full px-2.5 border border-[#cccccc] text-[13px] focus:outline-none focus:border-[#555555]"
                  />
                </td>
              </tr>

              {/* 내용 */}
              <tr>
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5] align-top">
                  내용 <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3">
                  <textarea
                    rows={10}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="불편 사항이나 개선 건의 내용을 구체적으로 작성해 주시기 바랍니다."
                    required
                    className="w-full p-3 border border-[#cccccc] text-[13px] leading-relaxed focus:outline-none focus:border-[#555555]"
                  />
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
            {loading ? "등록 중..." : "등록하기"}
          </button>
          <Link
            href="/"
            className="h-[36px] px-6 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[13px] font-bold inline-flex items-center justify-center"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
