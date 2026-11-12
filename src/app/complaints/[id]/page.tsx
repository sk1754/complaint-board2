"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Paperclip, Download, Flag } from "lucide-react";
import {
  BOARD_MAP,
  BoardType,
  QUESTION_STATUS_MAP,
  QuestionStatusType,
} from "@/lib/constants";

interface CommentItem {
  id: number;
  authorId: number;
  authorName: string;
  authorRole: string;
  isOfficial: boolean;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface AttachmentItem {
  id: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

interface UserInfo {
  id: number;
  username: string;
  name: string;
  department: string;
  role: string;
  isSuspended?: boolean;
  suspendReason?: string | null;
}

interface PostDetail {
  id: number;
  board: string;
  targetDepts: string;
  isNotice: boolean;
  isPinned: boolean;
  isHidden: boolean;
  hiddenReason: string | null;
  questionStatus: string;
  title: string;
  content: string;
  views: number;
  authorId: number;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  comments: CommentItem[];
  attachments: AttachmentItem[];
  user: UserInfo | null;
  isAuthor: boolean;
  canEdit: boolean;
  canManage: boolean;
}

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  // 답변 등록 및 본인 답변 수정 상태
  const [commentInput, setCommentInput] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // 신고 접수 모달/폼 상태 (게시글 또는 댓글 신고)
  const [reportTarget, setReportTarget] = useState<{
    targetType: "POST" | "COMMENT";
    targetId: number;
    label: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/complaints/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setDetail(null);
        setNotFoundError(
          data.error || "오류 안내: 존재하지 않거나 열람할 수 없는 게시글입니다."
        );
        return;
      }
      setDetail(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  async function handleDeletePost() {
    let reason = "작성자 본인 삭제";
    if (detail?.canManage && !detail?.isAuthor) {
      const inputReason = prompt(
        "관리자 삭제 사유를 입력해 주세요 (관리자 처리 이력에 기록됩니다):",
        "부적절한 게시물 삭제 조치"
      );
      if (inputReason === null) return;
      reason = inputReason.trim() || "관리자 권한 삭제";
    } else {
      if (!confirm("이 게시글을 삭제하시겠습니까?")) return;
    }

    setActionMessage(null);
    const res = await fetch(`/api/complaints/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionMessage({
        type: "error",
        text: data.error || "권한 없음: 삭제할 수 없습니다.",
      });
      return;
    }
    router.push(`/?board=${detail?.board || "ALL"}`);
  }

  async function handleResolveToggle(action: "RESOLVE" | "UNRESOLVE") {
    setActionMessage(null);
    const res = await fetch(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionMessage({
        type: "error",
        text: data.error || "상태 변경 실패",
      });
      return;
    }
    setActionMessage({
      type: "info",
      text: data.message,
    });
    fetchDetail();
  }

  async function handleToggleManage(
    field: "isHidden" | "isPinned",
    nextVal: boolean
  ) {
    let reason: string | undefined;
    if (field === "isHidden" && nextVal) {
      const r = prompt(
        "숨김 처리 사유를 입력해 주세요 (게시물 및 관리자 처리 이력에 기록됩니다):",
        "게시판 운영 기준 위반으로 인한 숨김 조치"
      );
      if (r === null) return;
      reason = r.trim() || "게시판 운영 정책에 따른 숨김 조치";
    }

    setActionMessage(null);
    const res = await fetch(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: nextVal, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionMessage({
        type: "error",
        text: `[HTTP ${res.status}] ${data.error}`,
      });
      return;
    }
    setActionMessage({
      type: "info",
      text: data.message || "상태가 변경되었습니다.",
    });
    fetchDetail();
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentInput.trim()) return;
    setCommentSubmitting(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/complaints/${id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: data.error || "답변 등록 중 오류가 발생했습니다.",
        });
        return;
      }
      setCommentInput("");
      setActionMessage({
        type: "info",
        text: data.message,
      });
      fetchDetail();
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleSaveEditComment(commentId: number) {
    if (!editingCommentText.trim()) return;
    const res = await fetch(`/api/replies/${commentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editingCommentText }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "답변 수정 권한이 없습니다.");
      return;
    }
    setEditingCommentId(null);
    setEditingCommentText("");
    fetchDetail();
  }

  async function handleDeleteComment(commentId: number) {
    if (!confirm("이 답변을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/replies/${commentId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "삭제 권한이 없습니다.");
      return;
    }
    fetchDetail();
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportTarget) return;
    if (!reportReason.trim()) {
      alert("신고 사유를 입력해 주세요.");
      return;
    }

    setReportSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: reportTarget.targetType,
          targetId: reportTarget.targetId,
          postId: Number(id),
          reason: reportReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "신고 접수 중 오류가 발생했습니다.");
        return;
      }
      setActionMessage({
        type: "info",
        text: data.message || "신고가 접수되었습니다.",
      });
      setReportTarget(null);
      setReportReason("");
    } finally {
      setReportSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-[980px] mx-auto px-4 py-16 text-center text-[13px] text-[#777777]">
        게시글을 불러오는 중입니다...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-[980px] mx-auto px-4 py-12">
        <div className="py-16 text-center space-y-4 border-t-2 border-[#555555] border-b border-[#cccccc] bg-[#fafafa]">
          <p className="text-[#c9302c] font-bold text-[15px]">
            {notFoundError || "오류 안내: 존재하지 않거나 삭제된 게시글입니다."}
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2 border border-[#cccccc] bg-white text-[12px] font-bold text-[#444444] hover:bg-[#f7f7f7]"
          >
            통합 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const deptLabel =
    BOARD_MAP[detail.board as BoardType]?.shortName || detail.board;
  const statusInfo =
    QUESTION_STATUS_MAP[detail.questionStatus as QuestionStatusType] ||
    QUESTION_STATUS_MAP.WAITING;

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="max-w-[980px] mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-[22px] sm:text-[26px] font-bold text-[#222222] tracking-tight">
            [{deptLabel}] {detail.isNotice ? "공지사항" : "질문 및 답변 상세"}
          </h1>
          {!detail.isNotice && (
            <span
              className={`px-2.5 py-1 text-[12px] font-bold ${statusInfo.bgClass} ${statusInfo.colorClass}`}
            >
              현재 상태: {statusInfo.label}
            </span>
          )}
        </div>

        {/* 질문 작성자 전용: 해결 완료 / 해결 완료 취소 버튼 */}
        {!detail.isNotice && detail.isAuthor && (
          <div>
            {detail.questionStatus !== "RESOLVED" ? (
              <button
                type="button"
                onClick={() => handleResolveToggle("RESOLVE")}
                className="h-[34px] px-4 bg-[#2b8a3e] hover:bg-[#237032] text-white text-[12px] font-bold cursor-pointer"
              >
                ✓ 질문을 [해결 완료] 상태로 변경
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleResolveToggle("UNRESOLVE")}
                className="h-[34px] px-4 border border-[#c9302c] bg-[#fdf7f7] hover:bg-[#fae3e3] text-[#c9302c] text-[12px] font-bold cursor-pointer"
              >
                ↺ 해결 완료 취소 (미해결 상태로 변경)
              </button>
            )}
          </div>
        )}
      </div>

      {detail.isHidden && (
        <div className="p-3.5 border border-[#c9302c] bg-[#fdf2f2] text-[#c9302c] text-[12px] font-bold">
          🔒 현재 이 게시물은 관리자에 의해 <strong>[숨김 처리]</strong>된 상태입니다.
          {detail.hiddenReason && <span> (조치 사유: {detail.hiddenReason})</span>}
          <span className="block font-normal mt-0.5 text-[#666666]">
            * 원문 조회 권한이 없는 일반 사용자는 본문 열람 및 첨부파일 다운로드(`/api/attachments/[id]`)가 차단(403)됩니다.
          </span>
        </div>
      )}

      {actionMessage && (
        <div
          className={`p-3.5 border text-[12px] font-bold ${
            actionMessage.type === "error"
              ? "border-[#d9534f] bg-[#fdf7f7] text-[#c9302c]"
              : "border-[#1d6fa5] bg-[#f0f7fc] text-[#1d6fa5]"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* 신고 접수 영역 (신고 버튼 클릭 시 표시) */}
      {reportTarget && (
        <div className="p-4 border-2 border-[#c9302c] bg-[#fff9f9] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[#c9302c] flex items-center gap-1.5">
              <Flag className="w-4 h-4" />
              <span>신고 접수 화면 ({reportTarget.label})</span>
            </h3>
            <button
              type="button"
              onClick={() => setReportTarget(null)}
              className="text-[11px] text-[#666666] hover:underline cursor-pointer"
            >
              [닫기]
            </button>
          </div>
          <form onSubmit={handleSubmitReport} className="space-y-2">
            <input
              type="text"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="신고 사유를 구체적으로 입력해 주세요 (예: 욕설/비방, 광고성 도배, 부적절한 게시물 등)"
              className="w-full h-9 px-3 border border-[#cccccc] bg-white text-[12px]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                disabled={reportSubmitting}
                className="px-4 py-1.5 bg-[#c9302c] text-white text-[12px] font-bold cursor-pointer"
              >
                {reportSubmitting ? "접수 중..." : "신고 제출하기"}
              </button>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="px-4 py-1.5 border border-[#cccccc] bg-white text-[12px] cursor-pointer"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 상세보기 테이블 */}
      <div className="border-t-2 border-[#555555] border-b border-[#999999] overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            <tr className="border-b border-[#dcdcdc] bg-[#fafafa]">
              <th className="w-[100px] sm:w-[110px] py-3.5 text-center font-bold text-[#333333] border-r border-[#e5e5e5]">
                제목
              </th>
              <td colSpan={3} className="px-4 py-3.5 font-bold text-[#222222]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-[#efefef] text-[#333333] text-[11px] font-bold">
                    [{deptLabel}]
                  </span>
                  <span className="px-1.5 py-0.5 bg-[#0c4da2] text-white text-[11px] font-bold">
                    [{detail.isNotice ? "공지" : "질문"}]
                  </span>
                  {detail.isPinned && (
                    <span className="px-1.5 py-0.5 bg-[#e66b19] text-white text-[11px] font-bold">
                      중요고정
                    </span>
                  )}
                  <span>{detail.title}</span>
                </div>
              </td>
            </tr>
            <tr className="border-b border-[#dcdcdc] text-[12px]">
              <th className="py-2.5 bg-[#f7f7f7] text-center font-bold text-[#444444] border-r border-[#e5e5e5]">
                공간 · 상태
              </th>
              <td className="px-4 py-2.5 border-r border-[#e5e5e5]">
                <strong>{deptLabel}</strong>
                {detail.board === "COMMON" && detail.isNotice && (
                  <span className="text-[11px] text-[#0c4da2] ml-1.5">
                    (표시 학과: {detail.targetDepts})
                  </span>
                )}
                {!detail.isNotice && (
                  <span className="ml-2 font-bold text-[#1d6fa5]">
                    · {statusInfo.label}
                  </span>
                )}
              </td>
              <th className="w-[100px] sm:w-[110px] py-2.5 bg-[#f7f7f7] text-center font-bold text-[#444444] border-r border-[#e5e5e5]">
                작성자 / 조회
              </th>
              <td className="px-4 py-2.5 text-[#333333]">
                <strong>{detail.authorName}</strong> (조회 {detail.views})
              </td>
            </tr>
            <tr className="border-b border-[#dcdcdc] text-[12px]">
              <th className="py-2.5 bg-[#f7f7f7] text-center font-bold text-[#444444] border-r border-[#e5e5e5]">
                작성일시
              </th>
              <td className="px-4 py-2.5 text-[#666666] border-r border-[#e5e5e5]">
                {formatDateTime(detail.createdAt)}
              </td>
              <th className="py-2.5 bg-[#f7f7f7] text-center font-bold text-[#444444] border-r border-[#e5e5e5]">
                수정일시
              </th>
              <td className="px-4 py-2.5 text-[#1d6fa5] font-medium">
                {formatDateTime(detail.updatedAt)}
              </td>
            </tr>

            {/* 첨부자료 다운로드 행 */}
            <tr className="border-b border-[#dcdcdc] text-[12px]">
              <th className="py-2.5 bg-[#f7f7f7] text-center font-bold text-[#444444] border-r border-[#e5e5e5]">
                첨부파일
              </th>
              <td colSpan={3} className="px-4 py-2.5">
                {!detail.attachments || detail.attachments.length === 0 ? (
                  <span className="text-[#888888]">등록된 첨부파일이 없습니다.</span>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    {detail.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={`/api/attachments/${att.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 border border-[#b6cef2] bg-[#f4f8fd] hover:bg-[#e6f0fc] text-[#0c4da2] font-bold"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{att.fileName}</span>
                        <span className="text-[11px] font-normal text-[#666666]">
                          ({(att.fileSize / 1024).toFixed(1)} KB)
                        </span>
                        <Download className="w-3.5 h-3.5 ml-0.5" />
                      </a>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="p-6 sm:p-8 min-h-[160px] text-[13px] text-[#333333] whitespace-pre-wrap leading-[1.8]">
          {detail.content}
        </div>
      </div>

      {/* 하단 버튼 바 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/?board=ALL"
            className="h-[32px] px-3.5 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[12px] font-bold inline-flex items-center justify-center"
          >
            통합 목록으로
          </Link>
          <Link
            href={`/?board=${detail.board}`}
            className="h-[32px] px-3.5 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[12px] font-bold inline-flex items-center justify-center"
          >
            {deptLabel} 목록으로
          </Link>
          {detail.user && (
            <button
              type="button"
              onClick={() =>
                setReportTarget({
                  targetType: "POST",
                  targetId: detail.id,
                  label: `게시글 #${detail.id} '${detail.title}'`,
                })
              }
              className="h-[32px] px-3 border border-[#e5bcbc] bg-[#fff5f5] hover:bg-[#fae3e3] text-[#c9302c] text-[12px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Flag className="w-3 h-3" />
              <span>게시글 신고</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {detail.canManage && (
            <>
              {detail.isNotice && (
                <button
                  type="button"
                  onClick={() =>
                    handleToggleManage("isPinned", !detail.isPinned)
                  }
                  className="h-[32px] px-3 border border-[#e66b19] bg-[#fffaf5] text-[#e66b19] text-[12px] font-bold cursor-pointer"
                >
                  {detail.isPinned ? "중요공지 해제" : "중요공지 고정"}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleToggleManage("isHidden", !detail.isHidden)}
                className="h-[32px] px-3 border border-[#c9302c] bg-[#fdf7f7] text-[#c9302c] text-[12px] font-bold cursor-pointer"
              >
                {detail.isHidden ? "숨김 해제" : "숨김 처리 (사유기록)"}
              </button>
            </>
          )}

          {detail.canEdit && (
            <>
              <Link
                href={`/complaints/${id}/edit`}
                className="h-[32px] px-4 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[12px] font-bold inline-flex items-center justify-center"
              >
                글·첨부 수정
              </Link>
              <button
                type="button"
                onClick={handleDeletePost}
                className="h-[32px] px-4 bg-[#666666] hover:bg-[#444444] text-white text-[12px] font-bold cursor-pointer"
              >
                글 삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* 댓글 · 답변 영역 (공식 답변 표시 + 본인 답변 수정·삭제 + 댓글 신고) */}
      <section className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[18px] font-bold text-[#222222] tracking-tight">
            댓글 · 답변 ({detail.comments?.length || 0}건)
          </h2>
          {!detail.isNotice && (
            <span className="text-[12px] text-[#666666]">
              * 답변 등록 시 질문 작성자의 <strong>[알림함]</strong>으로 새 답변 알림이 자동 발송됩니다.
            </span>
          )}
        </div>

        <div className="border-t-2 border-[#666666] border-b border-[#999999]">
          {!detail.comments || detail.comments.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#777777] bg-[#fafafa]">
              아직 등록된 답변이 없습니다. (현재 상태: 답변 대기)
            </div>
          ) : (
            <div className="divide-y divide-[#dcdcdc]">
              {detail.comments.map((c) => {
                const isCommentAuthor = Boolean(
                  detail.user && detail.user.id === c.authorId
                );
                const canDeleteComment = isCommentAuthor || detail.canManage;

                return (
                  <div
                    key={c.id}
                    className={`p-4 space-y-2 ${
                      c.isOfficial ? "bg-[#f4f9fd]" : "bg-[#fafafa]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                      <div className="flex items-center gap-2">
                        {c.isOfficial && (
                          <span className="px-2 py-0.5 bg-[#0c4da2] text-white text-[11px] font-bold">
                            ★ 공식 답변 (관리자)
                          </span>
                        )}
                        <span className="font-bold text-[#222222]">
                          {c.authorName}
                        </span>
                        <span className="text-[#888888] text-[11px]">
                          {formatDateTime(c.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCommentAuthor && editingCommentId !== c.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(c.id);
                              setEditingCommentText(c.content);
                            }}
                            className="text-[11px] text-[#1d6fa5] font-bold hover:underline cursor-pointer"
                          >
                            [답변 수정]
                          </button>
                        )}
                        {canDeleteComment && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-[11px] text-[#c9302c] font-bold hover:underline cursor-pointer"
                          >
                            [삭제]
                          </button>
                        )}
                        {detail.user && (
                          <button
                            type="button"
                            onClick={() =>
                              setReportTarget({
                                targetType: "COMMENT",
                                targetId: c.id,
                                label: `${c.authorName}님의 댓글 (#${c.id})`,
                              })
                            }
                            className="text-[11px] text-[#888888] hover:text-[#c9302c] hover:underline cursor-pointer"
                          >
                            [신고]
                          </button>
                        )}
                      </div>
                    </div>

                    {editingCommentId === c.id ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={2}
                          value={editingCommentText}
                          onChange={(e) =>
                            setEditingCommentText(e.target.value)
                          }
                          className="w-full p-2 border border-[#cccccc] bg-white text-[13px]"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEditComment(c.id)}
                            className="px-3 py-1 bg-[#e66b19] text-white text-[11px] font-bold cursor-pointer"
                          >
                            수정 저장
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="px-3 py-1 border border-[#cccccc] bg-white text-[11px] cursor-pointer"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[13px] text-[#333333] whitespace-pre-wrap leading-relaxed">
                        {c.content}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 답변 작성 폼 */}
          <div className="p-4 bg-white border-t border-[#dcdcdc]">
            {detail.user ? (
              <form onSubmit={handleCommentSubmit} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 text-[12px] text-[#555555]">
                  <span>
                    답변 작성자:{" "}
                    <strong className="text-[#0c4da2]">
                      {detail.user.name}
                    </strong>
                    {detail.user.isSuspended && (
                      <span className="ml-2 text-[#c9302c] font-bold">
                        (이용 제한 계정 - 작성 요청 시 차단됨)
                      </span>
                    )}
                  </span>
                  {detail.canManage && (
                    <span className="text-[#0c4da2] font-bold">
                      * 해당 공간 관리자이므로 작성 시 [★ 공식 답변] 표시가 자동으로 추가됩니다.
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <textarea
                    rows={2}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="질문에 대한 답변이나 추가 의견을 입력해 주세요."
                    required
                    className="flex-1 p-2.5 border border-[#cccccc] text-[13px] focus:outline-none focus:border-[#555555]"
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting || !commentInput.trim()}
                    className="h-10 sm:h-auto sm:w-28 bg-[#555555] hover:bg-[#333333] disabled:opacity-50 text-white text-[12px] font-bold cursor-pointer"
                  >
                    {commentSubmitting ? "등록중..." : "답변 등록"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-2 text-[12px] text-[#777777]">
                답변을 작성하려면{" "}
                <Link
                  href="/login"
                  className="text-[#e66b19] font-bold hover:underline"
                >
                  로그인
                </Link>
                이 필요합니다.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
