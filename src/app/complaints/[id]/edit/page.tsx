"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CATEGORIES,
  CATEGORY_MAP,
  ComplaintCategory,
} from "@/lib/constants";

export default function EditComplaintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ComplaintCategory>("OTHER");
  const [content, setContent] = useState("");
  const [isSecret, setIsSecret] = useState(true);
  const [password, setPassword] = useState("");
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(`complaint_token_${id}`) || "";
    setHasAccessToken(Boolean(token));

    fetch(`/api/complaints/${id}`, {
      headers: token ? { "x-post-access-token": token } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.locked) {
          router.replace(`/complaints/${id}`);
          return;
        }
        setTitle(data.title || "");
        setCategory((data.category as ComplaintCategory) || "OTHER");
        setContent(data.content || "");
        setIsSecret(Boolean(data.isSecret));
        setIsAdmin(Boolean(data.isAdmin));
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const token = sessionStorage.getItem(`complaint_token_${id}`) || "";
      const res = await fetch(`/api/complaints/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-post-access-token": token } : {}),
        },
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
        setError(data.error || "수정 중 오류가 발생했습니다.");
        return;
      }

      router.push(`/complaints/${id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-[13px] text-[#777777]">
        불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[28px] font-normal text-[#222222] tracking-tight">
          게시글 수정
        </h1>
        <span className="text-[#cccccc] text-sm">|</span>
        <span className="text-[13px] text-[#888888]">Edit Complaint</span>
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
              <tr className="border-b border-[#dcdcdc]">
                <th className="w-[150px] bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  불만구분
                </th>
                <td className="px-4 py-3">
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ComplaintCategory)
                    }
                    className="h-[30px] px-2.5 border border-[#cccccc] bg-white text-[13px] text-[#333333]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_MAP[cat].label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>

              <tr className="border-b border-[#dcdcdc]">
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  공개여부
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
                      <span>비밀글</span>
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

              {!isAdmin && !hasAccessToken && (
                <tr className="border-b border-[#dcdcdc]">
                  <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                    비밀번호 확인
                  </th>
                  <td className="px-4 py-3">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="작성 시 설정한 비밀번호"
                      required
                      className="h-[30px] w-52 px-2.5 border border-[#cccccc] text-[13px]"
                    />
                  </td>
                </tr>
              )}

              <tr className="border-b border-[#dcdcdc]">
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  제목
                </th>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-[30px] w-full px-2.5 border border-[#cccccc] text-[13px]"
                  />
                </td>
              </tr>

              <tr>
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5] align-top">
                  내용
                </th>
                <td className="px-4 py-3">
                  <textarea
                    rows={10}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    className="w-full p-3 border border-[#cccccc] text-[13px] leading-relaxed"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            type="submit"
            disabled={saving}
            className="h-[36px] px-6 bg-[#e66b19] hover:bg-[#d4590a] disabled:opacity-50 text-white text-[13px] font-bold cursor-pointer"
          >
            {saving ? "저장 중..." : "수정완료"}
          </button>
          <Link
            href={`/complaints/${id}`}
            className="h-[36px] px-6 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[13px] font-bold inline-flex items-center justify-center"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
