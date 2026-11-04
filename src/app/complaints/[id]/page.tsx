"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PasswordModal } from "@/components/PasswordModal";
import { AdminReplyForm } from "@/components/AdminReplyForm";
import { Lock } from "lucide-react";

interface ReplyItem {
  id: number;
  authorName: string;
  content: string;
  createdAt: string;
}

interface ComplaintDetail {
  locked: boolean;
  id: number;
  title: string;
  content?: string;
  category: string;
  status: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt?: string;
  replies?: ReplyItem[];
  replyCount?: number;
  isAdmin: boolean;
}

export default function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [detail, setDetail] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [modalMode, setModalMode] = useState<"EDIT" | "DELETE" | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem(`complaint_token_${id}`) || "";
      const res = await fetch(`/api/complaints/${id}`, {
        headers: token ? { "x-post-access-token": token } : {},
      });
      if (!res.ok) {
        setDetail(null);
        return;
      }
      const data = await res.json();
      setDetail(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  async function handleUnlockSecret(e: React.FormEvent) {
    e.preventDefault();
    if (!unlockPassword.trim()) {
      setUnlockError("비밀번호를 입력해 주세요.");
      return;
    }
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await fetch(`/api/complaints/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: unlockPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUnlockError(data.error || "비밀번호가 일치하지 않습니다.");
        return;
      }
      sessionStorage.setItem(`complaint_token_${id}`, data.accessToken);
      setUnlockPassword("");
      await fetchDetail();
    } finally {
      setUnlocking(false);
    }
  }

  async function handlePasswordModalSubmit(
    password: string
  ): Promise<string | null> {
    const res = await fetch(`/api/complaints/${id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return data.error || "비밀번호가 일치하지 않습니다.";
    }

    sessionStorage.setItem(`complaint_token_${id}`, data.accessToken);

    if (modalMode === "EDIT") {
      setModalMode(null);
      router.push(`/complaints/${id}/edit`);
      return null;
    }

    if (modalMode === "DELETE") {
      const delRes = await fetch(`/api/complaints/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-post-access-token": data.accessToken,
        },
        body: JSON.stringify({ password }),
      });
      if (!delRes.ok) {
        const delData = await delRes.json();
        return delData.error || "삭제 중 오류가 발생했습니다.";
      }
      setModalMode(null);
      router.push("/");
      return null;
    }

    return null;
  }

  async function handleAdminDeleteComplaint() {
    if (!confirm("관리자 권한으로 이 게시글을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/complaints/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
    }
  }

  async function handleAdminDeleteReply(replyId: number) {
    if (!confirm("이 답변을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/replies/${replyId}`, { method: "DELETE" });
    if (res.ok) {
      fetchDetail();
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-[13px] text-[#777777] border-t-2 border-[#555555] border-b border-[#cccccc]">
        게시글을 불러오는 중입니다...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="py-16 text-center space-y-4 border-t-2 border-[#555555] border-b border-[#cccccc]">
        <p className="text-[#333333] font-bold text-[14px]">
          존재하지 않거나 삭제된 게시글입니다.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 border border-[#cccccc] text-[12px] text-[#444444] hover:bg-[#f7f7f7]"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[28px] font-normal text-[#222222] tracking-tight">
          불만 및 건의사항
        </h1>
        <span className="text-[#cccccc] text-sm">|</span>
        <span className="text-[13px] text-[#888888]">
          Complaint &amp; Suggestion Board
        </span>
      </div>

      {/* 상세보기 테이블 */}
      <div className="border-t-2 border-[#555555] border-b border-[#999999]">
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            <tr className="border-b border-[#dcdcdc] bg-[#fafafa]">
              <th className="w-[110px] py-3.5 text-center font-bold text-[#333333] border-r border-[#e5e5e5]">
                제목
              </th>
              <td colSpan={5} className="px-4 py-3.5 font-bold text-[#222222]">
                <div className="flex items-center gap-2">
                  {detail.isSecret && (
                    <Lock className="w-3.5 h-3.5 text-[#777777]" />
                  )}
                  <span>{detail.title}</span>
                </div>
              </td>
            </tr>
            <tr className="border-b border-[#dcdcdc] text-[12px]">
              <th className="w-[110px] py-2.5 bg-[#f7f7f7] text-center font-bold text-[#444444] border-r border-[#e5e5e5]">
                불만구분
              </th>
              <td className="w-[160px] px-4 py-2.5 text-center border-r border-[#e5e5e5]">
                <CategoryBadge category={detail.category} />
              </td>
              <th className="w-[110px] py-2.5 bg-[#f7f7f7] text-center font-bold text-[#444444] border-r border-[#e5e5e5]">
                처리구분
              </th>
              <td className="w-[160px] px-4 py-2.5 text-center border-r border-[#e5e5e5]">
                <StatusBadge status={detail.status} />
              </td>
              <th className="w-[110px] py-2.5 bg-[#f7f7f7] text-center font-bold text-[#444444] border-r border-[#e5e5e5]">
                등록일시
              </th>
              <td className="px-4 py-2.5 text-center text-[#666666]">
                {new Date(detail.createdAt).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 본문 또는 비밀글 비밀번호 확인창 */}
        {detail.locked ? (
          <div className="py-14 px-4 text-center max-w-md mx-auto space-y-4">
            <p className="text-[15px] font-bold text-[#333333]">
              비밀글 기능으로 보호된 게시글입니다.
            </p>
            <p className="text-[12px] text-[#777777]">
              작성 시 설정한 비밀번호를 입력하시면 본문과 답변({detail.replyCount ?? 0}건)을 열람하실 수 있습니다.
            </p>

            <form
              onSubmit={handleUnlockSecret}
              className="flex items-center justify-center gap-1.5 pt-2"
            >
              <input
                type="password"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="h-[32px] w-48 px-3 border border-[#cccccc] text-[13px] focus:outline-none focus:border-[#555555]"
              />
              <button
                type="submit"
                disabled={unlocking}
                className="h-[32px] px-4 bg-[#555555] hover:bg-[#333333] text-white text-[12px] font-bold cursor-pointer"
              >
                {unlocking ? "확인중..." : "확인"}
              </button>
            </form>
            {unlockError && (
              <p className="text-[12px] text-[#c9302c] font-semibold">
                {unlockError}
              </p>
            )}
          </div>
        ) : (
          <div className="p-6 sm:p-8 min-h-[180px] text-[13px] text-[#333333] whitespace-pre-wrap leading-[1.8]">
            {detail.content}
          </div>
        )}
      </div>

      {/* 하단 버튼 바 */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="h-[32px] px-4 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[12px] font-bold inline-flex items-center justify-center"
        >
          목록보기
        </Link>

        {!detail.locked && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (detail.isAdmin) {
                  router.push(`/complaints/${id}/edit`);
                } else {
                  setModalMode("EDIT");
                }
              }}
              className="h-[32px] px-4 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[12px] font-bold cursor-pointer"
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => {
                if (detail.isAdmin) {
                  handleAdminDeleteComplaint();
                } else {
                  setModalMode("DELETE");
                }
              }}
              className="h-[32px] px-4 bg-[#666666] hover:bg-[#444444] text-white text-[12px] font-bold cursor-pointer"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 담당부서 답변 테이블 영역 */}
      {!detail.locked && (
        <section className="space-y-4 pt-4">
          <h2 className="text-[18px] font-normal text-[#222222] tracking-tight">
            처리결과 및 담당자 답변 ({detail.replies?.length || 0})
          </h2>

          <div className="border-t-2 border-[#666666] border-b border-[#999999]">
            {!detail.replies || detail.replies.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-[#777777] bg-[#fafafa]">
                현재 담당 부서에서 내용을 확인 중입니다. 처리가 완료되면 답변이 등록됩니다.
              </div>
            ) : (
              <div className="divide-y divide-[#dcdcdc]">
                {detail.replies.map((reply) => (
                  <div key={reply.id} className="p-5 bg-[#fafafa] space-y-2.5">
                    <div className="flex items-center justify-between text-[12px] border-b border-[#e5e5e5] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1d6fa5]">
                          [{reply.authorName}]
                        </span>
                        <span className="text-[#888888]">
                          {new Date(reply.createdAt).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {detail.isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleAdminDeleteReply(reply.id)}
                          className="text-[11px] text-[#c9302c] hover:underline cursor-pointer"
                        >
                          [답변삭제]
                        </button>
                      )}
                    </div>
                    <p className="text-[13px] text-[#333333] whitespace-pre-wrap leading-[1.8]">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {detail.isAdmin && (
            <AdminReplyForm
              complaintId={detail.id}
              currentStatus={detail.status}
              onUpdated={fetchDetail}
            />
          )}
        </section>
      )}

      <PasswordModal
        isOpen={modalMode !== null}
        title={modalMode === "EDIT" ? "게시글 수정 비밀번호 확인" : "게시글 삭제 비밀번호 확인"}
        description="작성 시 설정한 비밀번호를 입력해 주시기 바랍니다."
        confirmLabel={modalMode === "EDIT" ? "확인" : "삭제"}
        onClose={() => setModalMode(null)}
        onSubmit={handlePasswordModalSubmit}
      />
    </div>
  );
}
