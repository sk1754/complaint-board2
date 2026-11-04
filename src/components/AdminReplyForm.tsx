"use client";

import { useState } from "react";
import { STATUSES, STATUS_MAP, ComplaintStatus } from "@/lib/constants";

interface AdminReplyFormProps {
  complaintId: number;
  currentStatus: string;
  onUpdated: () => void;
}

export function AdminReplyForm({
  complaintId,
  currentStatus,
  onUpdated,
}: AdminReplyFormProps) {
  const [authorName, setAuthorName] = useState("담당 관리자");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string>("RESOLVED");
  const [statusOnlyLoading, setStatusOnlyLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleStatusChange(newStatus: string) {
    setStatusOnlyLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMessage("처리 상태가 변경되었습니다.");
        onUpdated();
      }
    } finally {
      setStatusOnlyLoading(false);
    }
  }

  async function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setReplyLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName,
          content,
          status,
        }),
      });
      if (res.ok) {
        setContent("");
        setMessage("답변이 등록되었습니다.");
        onUpdated();
      }
    } finally {
      setReplyLoading(false);
    }
  }

  return (
    <div className="border-t-2 border-[#555555] border-b border-[#999999] mt-6">
      <div className="bg-[#f7f7f7] px-4 py-3 border-b border-[#dcdcdc] flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-[#333333]">
          관리자 답변 등록 및 상태 관리
        </span>
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className="text-[#666666] mr-1">상태 즉시 변경:</span>
          {STATUSES.map((st) => {
            const active = currentStatus === st;
            return (
              <button
                key={st}
                type="button"
                disabled={statusOnlyLoading || active}
                onClick={() => handleStatusChange(st)}
                className={`h-[26px] px-2.5 text-[11px] font-bold border cursor-pointer ${
                  active
                    ? "bg-[#555555] text-white border-[#555555]"
                    : "bg-white text-[#555555] border-[#cccccc] hover:bg-[#eeeeee]"
                }`}
              >
                {STATUS_MAP[st as ComplaintStatus].label}
              </button>
            );
          })}
        </div>
      </div>

      {message && (
        <div className="px-4 py-2 bg-[#f0f7fc] border-b border-[#dcdcdc] text-[12px] text-[#1d6fa5] font-semibold">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmitReply}>
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            <tr className="border-b border-[#dcdcdc]">
              <th className="w-[130px] bg-[#f7f7f7] text-left px-4 py-2.5 font-bold text-[#444444] border-r border-[#e5e5e5]">
                답변 부서/담당자
              </th>
              <td className="px-4 py-2.5">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="h-[28px] w-60 px-2.5 border border-[#cccccc] text-[12px]"
                />
              </td>
              <th className="w-[130px] bg-[#f7f7f7] text-left px-4 py-2.5 font-bold text-[#444444] border-l border-r border-[#e5e5e5]">
                답변 후 처리상태
              </th>
              <td className="px-4 py-2.5">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-[28px] px-2 border border-[#cccccc] bg-white text-[12px]"
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {STATUS_MAP[st as ComplaintStatus].label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <th className="bg-[#f7f7f7] text-left px-4 py-3 font-bold text-[#444444] border-r border-[#e5e5e5] align-top">
                답변 내용
              </th>
              <td colSpan={3} className="px-4 py-3">
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="불만 및 건의사항에 대한 조치 결과와 답변을 입력해 주세요."
                  required
                  className="w-full p-2.5 border border-[#cccccc] text-[13px]"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={replyLoading || !content.trim()}
                    className="h-[32px] px-5 bg-[#e66b19] hover:bg-[#d4590a] disabled:opacity-50 text-white text-[12px] font-bold cursor-pointer"
                  >
                    {replyLoading ? "등록 중..." : "답변 등록"}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    </div>
  );
}
