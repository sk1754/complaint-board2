"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BOARDS,
  BOARD_MAP,
  BoardType,
  ROLE_MAP,
  UserRole,
  REPORT_STATUS_MAP,
  ReportStatusType,
} from "@/lib/constants";

interface UserInfo {
  id: number;
  username: string;
  name: string;
  department: string;
  role: string;
  isSuspended?: boolean;
  suspendedUntil?: string | null;
  suspendReason?: string | null;
}

interface PostItem {
  id: number;
  board: string;
  isNotice: boolean;
  isPinned: boolean;
  isHidden: boolean;
  hiddenReason?: string | null;
  questionStatus?: string;
  title: string;
  authorName: string;
  createdAt: string;
}

interface ReportItem {
  id: number;
  reporterName: string;
  targetType: string;
  targetId: number;
  postId: number | null;
  reason: string;
  status: string;
  adminNote: string | null;
  handledBy: string | null;
  createdAt: string;
}

interface AuditLogItem {
  id: number;
  adminName: string;
  adminRole: string;
  action: string;
  targetType: string;
  targetId: number;
  detail: string;
  createdAt: string;
}

interface OverviewData {
  recentPostsCount: number;
  waitingQuestionsCount: number;
  pendingReportsCount: number;
  suspendedUsersCount: number;
  recentPosts: PostItem[];
  waitingQuestions: PostItem[];
}

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "POSTS" | "REPORTS" | "USERS" | "AUDIT"
  >("OVERVIEW");
  const [selectedBoard, setSelectedBoard] = useState<BoardType>("COMP");
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [userSearchQ, setUserSearchQ] = useState("");
  const [userSearchDept, setUserSearchDept] = useState("ALL");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [message, setMessage] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBoardPosts = useCallback(async (board: BoardType) => {
    const res = await fetch(`/api/complaints?board=${board}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok) {
      setPosts(data.items || []);
    }
  }, []);

  const fetchUsers = useCallback(async (q = "", dept = "ALL") => {
    const res = await fetch(
      `/api/admin/users?q=${encodeURIComponent(q)}&dept=${encodeURIComponent(
        dept
      )}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  }, []);

  const fetchReportsAndLogs = useCallback(async () => {
    const res = await fetch("/api/reports", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setReports(data.reports || []);
      setAuditLogs(data.auditLogs || []);
      setOverview(data.overview || null);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then(async (data) => {
        const u = data.user || null;
        setCurrentUser(u);
        if (u && (u.role === "SUPER_ADMIN" || u.role === "DEPT_ADMIN")) {
          const initBoard: BoardType = BOARDS.includes(u.department)
            ? u.department
            : "COMP";
          setSelectedBoard(initBoard);
          await Promise.all([
            fetchBoardPosts(initBoard),
            fetchUsers(),
            fetchReportsAndLogs(),
          ]);
        }
      })
      .finally(() => setLoading(false));
  }, [fetchBoardPosts, fetchUsers, fetchReportsAndLogs]);

  async function handleBoardTab(b: BoardType) {
    setSelectedBoard(b);
    setMessage(null);
    await fetchBoardPosts(b);
  }

  async function handleTogglePostState(
    postId: number,
    field: "isHidden" | "isPinned",
    nextVal: boolean
  ) {
    let reason: string | undefined;
    if (field === "isHidden" && nextVal) {
      const r = prompt(
        "숨김 조치 사유를 입력해 주세요 (관리자 처리 이력에 기록됩니다):",
        "부적절한 게시물 숨김 조치"
      );
      if (r === null) return;
      reason = r.trim() || "게시판 운영 정책 위반";
    }

    setMessage(null);
    const res = await fetch(`/api/complaints/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: nextVal, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({
        type: "error",
        text: `[HTTP ${res.status}] ${data.error}`,
      });
      return;
    }
    setMessage({
      type: "info",
      text: data.message || "변경되었습니다.",
    });
    fetchBoardPosts(selectedBoard);
    fetchReportsAndLogs();
  }

  async function handleDeletePost(postId: number) {
    const r = prompt(
      "게시글 삭제 사유를 입력해 주세요 (관리자 처리 이력에 기록됩니다):",
      "운영 기준 위반 게시물 삭제"
    );
    if (r === null) return;

    setMessage(null);
    const res = await fetch(`/api/complaints/${postId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: r.trim() || "관리자 권한 삭제" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({
        type: "error",
        text: `[HTTP ${res.status}] ${data.error}`,
      });
      return;
    }
    setMessage({
      type: "info",
      text: "게시물이 삭제되었으며 처리 이력에 기록되었습니다.",
    });
    fetchBoardPosts(selectedBoard);
    fetchReportsAndLogs();
  }

  async function handleUpdateReportStatus(reportId: number, status: string) {
    const note = prompt(
      `신고 상태를 [${
        REPORT_STATUS_MAP[status as ReportStatusType]?.label || status
      }](으)로 변경합니다. 처리 메모/사유를 입력해 주세요:`,
      status === "RESOLVED"
        ? "신고 내용 확인 후 조치 완료"
        : status === "REJECTED"
        ? "운영 정책 위반 사항 없음으로 반려"
        : "담당 관리자 검토 진행 중"
    );
    if (note === null) return;

    setMessage(null);
    const res = await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, status, adminNote: note }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({
        type: "error",
        text: data.error || "신고 상태 변경 실패",
      });
      return;
    }
    setMessage({
      type: "info",
      text: data.message,
    });
    fetchReportsAndLogs();
  }

  async function handleToggleSuspendUser(targetUser: UserInfo) {
    const nextSuspended = !targetUser.isSuspended;
    let days = 7;
    let suspendReason = "";

    if (nextSuspended) {
      const daysInput = prompt(
        `${targetUser.name}(${targetUser.username}) 회원의 이용 제한 기간(일수)을 입력해 주세요:`,
        "7"
      );
      if (daysInput === null) return;
      days = Math.max(1, Number(daysInput) || 7);

      const reasonInput = prompt(
        "이용 제한 사유를 입력해 주세요 (해당 회원의 글·댓글 작성이 차단됩니다):",
        "반복적인 게시판 운영규칙 위반 및 비방글 작성"
      );
      if (reasonInput === null) return;
      suspendReason = reasonInput.trim() || "게시판 운영 정책 위반";
    } else {
      if (
        !confirm(
          `${targetUser.name}(${targetUser.username}) 회원의 이용 제한을 해제하시겠습니까?`
        )
      )
        return;
    }

    setMessage(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SUSPEND",
        userId: targetUser.id,
        isSuspended: nextSuspended,
        days,
        suspendReason,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({
        type: "error",
        text: data.error || "이용 제한 설정 실패",
      });
      return;
    }
    setMessage({
      type: "info",
      text: data.message,
    });
    fetchUsers(userSearchQ, userSearchDept);
    fetchReportsAndLogs();
  }

  async function handleUpdateUserRole(
    userId: number,
    role: string,
    department: string
  ) {
    setMessage(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role, department }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({
        type: "error",
        text: data.error || "권한 변경 실패",
      });
      return;
    }
    setMessage({
      type: "info",
      text: data.message,
    });
    fetchUsers(userSearchQ, userSearchDept);
    fetchReportsAndLogs();
  }

  function handleUserSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchUsers(userSearchQ, userSearchDept);
  }

  function formatDateTime(d: string) {
    return new Date(d).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="max-w-[980px] mx-auto px-4 py-16 text-center text-[13px] text-[#777777]">
        관리자 센터 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (
    !currentUser ||
    (currentUser.role !== "DEPT_ADMIN" && currentUser.role !== "SUPER_ADMIN")
  ) {
    return (
      <div className="max-w-[980px] mx-auto px-4 py-12">
        <div className="border-t-2 border-[#555555] border-b border-[#999999] bg-[#fafafa] py-14 px-4 text-center space-y-4">
          <p className="text-[16px] font-bold text-[#c9302c]">
            권한 없음 안내: 학과 관리자 또는 전체 관리자만 접근할 수 있는 화면입니다.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link
              href="/login"
              className="h-[34px] px-5 bg-[#e66b19] hover:bg-[#d4590a] text-white text-[12px] font-bold inline-flex items-center justify-center"
            >
              관리자 계정으로 로그인
            </Link>
            <Link
              href="/"
              className="h-[34px] px-5 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[12px] font-bold inline-flex items-center justify-center"
            >
              게시판으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[980px] mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#dcdcdc] pb-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-[24px] sm:text-[26px] font-bold text-[#222222] tracking-tight">
            관리자 운영 현황 · 신고 · 회원 관리 센터
          </h1>
          <span className="text-[#cccccc] text-sm">|</span>
          <span className="text-[13px] text-[#666666]">
            접속자: <strong>{currentUser.name}</strong> (
            {ROLE_MAP[currentUser.role as UserRole]} · 담당 학과:{" "}
            {BOARD_MAP[currentUser.department as BoardType]?.shortName})
          </span>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 border text-[13px] font-bold ${
            message.type === "error"
              ? "border-[#d9534f] bg-[#fdf7f7] text-[#c9302c]"
              : "border-[#1d6fa5] bg-[#f0f7fc] text-[#1d6fa5]"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 관리자 센터 상단 탭 메뉴 */}
      <div className="flex flex-wrap border-b-2 border-[#0c4da2]">
        {[
          { key: "OVERVIEW", label: "1. 운영 현황 요약" },
          {
            key: "REPORTS",
            label: `2. 신고 목록·처리 (${reports.length})`,
          },
          { key: "POSTS", label: "3. 학과별 게시물 관리 (숨김·삭제 사유)" },
          {
            key: "USERS",
            label: `4. 회원 조회 · 이용 제한 · 권한 (${users.length})`,
          },
          {
            key: "AUDIT",
            label: `5. 관리자 처리 이력 (${auditLogs.length})`,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() =>
              setActiveTab(
                tab.key as
                  | "OVERVIEW"
                  | "POSTS"
                  | "REPORTS"
                  | "USERS"
                  | "AUDIT"
              )
            }
            className={`px-4 py-2.5 text-[12px] font-bold border-t border-l border-r cursor-pointer ${
              activeTab === tab.key
                ? "bg-[#0c4da2] text-white border-[#0c4da2]"
                : "bg-[#f7f7f7] text-[#555555] border-[#dcdcdc] hover:bg-[#eeeeee]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 1: 관리자 운영 현황 화면 */}
      {activeTab === "OVERVIEW" && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border-t-2 border-t-[#0c4da2] border border-[#dcdcdc] bg-white p-4">
              <span className="text-[12px] text-[#777777] block">
                전체 게시글 수
              </span>
              <strong className="text-[24px] text-[#0c4da2]">
                {overview.recentPostsCount}건
              </strong>
            </div>
            <div className="border-t-2 border-t-[#e66b19] border border-[#dcdcdc] bg-white p-4">
              <span className="text-[12px] text-[#777777] block">
                미답변(답변 대기) 질문
              </span>
              <strong className="text-[24px] text-[#e66b19]">
                {overview.waitingQuestionsCount}건
              </strong>
            </div>
            <div className="border-t-2 border-t-[#c9302c] border border-[#dcdcdc] bg-white p-4">
              <span className="text-[12px] text-[#777777] block">
                미처리 신고 건수 (접수·검토중)
              </span>
              <strong className="text-[24px] text-[#c9302c]">
                {overview.pendingReportsCount}건
              </strong>
            </div>
            <div className="border-t-2 border-t-[#333333] border border-[#dcdcdc] bg-white p-4">
              <span className="text-[12px] text-[#777777] block">
                현재 이용 제한 회원
              </span>
              <strong className="text-[24px] text-[#333333]">
                {overview.suspendedUsersCount}명
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 미답변 질문 목록 */}
            <div className="border-t-2 border-t-[#e66b19] border border-[#dcdcdc] bg-white">
              <div className="px-4 py-3 bg-[#fffaf5] border-b border-[#dcdcdc] font-bold text-[13px] text-[#e66b19] flex justify-between">
                <span>미답변 질문 현황 (답변 대기)</span>
                <span>{overview.waitingQuestions.length}건 표시</span>
              </div>
              <ul className="divide-y divide-[#eeeeee] text-[12px]">
                {overview.waitingQuestions.length === 0 ? (
                  <li className="p-6 text-center text-[#888888]">
                    현재 미답변 질문이 없습니다.
                  </li>
                ) : (
                  overview.waitingQuestions.map((q) => (
                    <li
                      key={q.id}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-[#fafafa]"
                    >
                      <Link
                        href={`/complaints/${q.id}`}
                        className="truncate hover:underline font-medium text-[#222222]"
                      >
                        <strong className="text-[#0c4da2] mr-1">
                          [{BOARD_MAP[q.board as BoardType]?.shortName || q.board}]
                        </strong>
                        {q.title}
                      </Link>
                      <span className="text-[11px] text-[#888888] shrink-0 ml-2">
                        {q.authorName}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* 최근 등록 게시글 */}
            <div className="border-t-2 border-t-[#0c4da2] border border-[#dcdcdc] bg-white">
              <div className="px-4 py-3 bg-[#f4f8fd] border-b border-[#dcdcdc] font-bold text-[13px] text-[#0c4da2] flex justify-between">
                <span>최근 등록된 게시글</span>
                <span>최근 5건</span>
              </div>
              <ul className="divide-y divide-[#eeeeee] text-[12px]">
                {overview.recentPosts.map((p) => (
                  <li
                    key={p.id}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-[#fafafa]"
                  >
                    <Link
                      href={`/complaints/${p.id}`}
                      className="truncate hover:underline font-medium text-[#222222]"
                    >
                      <strong className="text-[#0c4da2] mr-1">
                        [{BOARD_MAP[p.board as BoardType]?.shortName || p.board}]
                      </strong>
                      {p.title}
                    </Link>
                    <span className="text-[11px] text-[#888888] shrink-0 ml-2">
                      {p.authorName}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 탭 2: 신고 목록·처리 (접수 · 검토 중 · 완료 · 반려) */}
      {activeTab === "REPORTS" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[18px] font-bold text-[#222222]">
              신고 접수 목록 및 상태 처리 (접수 · 검토 중 · 완료 · 반려)
            </h2>
            <span className="text-[12px] text-[#666666]">
              * 신고 상태를 변경하면 <strong>[5. 관리자 처리 이력]</strong>에 자동으로 기록됩니다.
            </span>
          </div>

          <div className="overflow-x-auto border-t-2 border-[#555555] border-b border-[#999999]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="h-[38px] bg-[#fafafa] border-b border-[#cccccc] font-bold text-[#333333]">
                  <th className="w-14 text-center">번호</th>
                  <th className="w-20 text-center">대상</th>
                  <th className="w-24 text-center">신고자</th>
                  <th className="text-left px-3">신고 사유 및 처리 메모</th>
                  <th className="w-24 text-center">현재 상태</th>
                  <th className="w-56 text-center">상태 변경 조치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececec]">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#888888]">
                      접수된 신고 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => {
                    const st =
                      REPORT_STATUS_MAP[r.status as ReportStatusType] ||
                      REPORT_STATUS_MAP.PENDING;
                    return (
                      <tr key={r.id} className="hover:bg-[#fafafa]">
                        <td className="py-3 text-center">{r.id}</td>
                        <td className="py-3 text-center font-bold">
                          {r.postId ? (
                            <Link
                              href={`/complaints/${r.postId}`}
                              className="text-[#0c4da2] hover:underline"
                            >
                              {r.targetType === "POST"
                                ? `글 #${r.targetId}`
                                : `댓글 #${r.targetId}`}
                            </Link>
                          ) : (
                            <span>
                              {r.targetType} #{r.targetId}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center">{r.reporterName}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-[#222222]">
                            {r.reason}
                          </div>
                          {r.adminNote && (
                            <div className="text-[11px] text-[#0c4da2] mt-0.5">
                              ↳ 처리 메모 ({r.handledBy}): {r.adminNote}
                            </div>
                          )}
                          <div className="text-[10px] text-[#888888] mt-0.5">
                            접수일시: {formatDateTime(r.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-bold ${st.bgClass} ${st.colorClass}`}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <div className="inline-flex flex-wrap justify-center gap-1">
                            {(
                              [
                                "PENDING",
                                "REVIEWING",
                                "RESOLVED",
                                "REJECTED",
                              ] as ReportStatusType[]
                            ).map((statusKey) => (
                              <button
                                key={statusKey}
                                type="button"
                                onClick={() =>
                                  handleUpdateReportStatus(r.id, statusKey)
                                }
                                className={`px-2 py-1 text-[11px] border cursor-pointer ${
                                  r.status === statusKey
                                    ? "bg-[#333333] text-white border-[#333333] font-bold"
                                    : "bg-white text-[#444444] border-[#cccccc] hover:bg-[#f0f0f0]"
                                }`}
                              >
                                {REPORT_STATUS_MAP[statusKey].label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 탭 3: 학과별 게시물 관리 (숨김·삭제 사유 기록) */}
      {activeTab === "POSTS" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[18px] font-bold text-[#222222]">
              학과별 게시물 관리 (숨김·삭제 시 조치 사유 기록)
            </h2>
            <span className="text-[12px] text-[#666666]">
              * 담당 학과가 아닌 게시물을 관리하려고 하면{" "}
              <strong className="text-[#c9302c]">학과 간 관리 차단(403)</strong>이 작동합니다.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 border-t border-l border-[#cccccc] text-[12px]">
            {BOARDS.map((b) => {
              const active = selectedBoard === b;
              const isAssigned =
                currentUser.role === "SUPER_ADMIN" ||
                currentUser.department === b;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleBoardTab(b)}
                  className={`h-[38px] border-r border-b border-[#cccccc] font-bold cursor-pointer ${
                    active
                      ? "bg-[#555555] text-white"
                      : "bg-[#f9f9f9] text-[#555555] hover:bg-[#efefef]"
                  }`}
                >
                  {BOARD_MAP[b].shortName}{" "}
                  {isAssigned ? "(관리 가능)" : "(권한 제한)"}
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto border-t-2 border-[#555555] border-b border-[#999999]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="h-[38px] bg-[#fafafa] border-b border-[#cccccc] font-bold text-[#333333]">
                  <th className="w-[50px] text-center">No.</th>
                  <th className="w-[80px] text-center">구분</th>
                  <th className="text-left px-3">제목 및 숨김 사유</th>
                  <th className="w-[90px] text-center">작성자</th>
                  <th className="w-[240px] text-center">관리 작업</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-24 text-center text-[#777777]">
                      게시물이 없습니다.
                    </td>
                  </tr>
                ) : (
                  posts.map((p) => (
                    <tr
                      key={p.id}
                      className="h-[44px] border-b border-[#ececec] hover:bg-[#f9f9f9]"
                    >
                      <td className="text-center">{p.id}</td>
                      <td className="text-center">
                        {p.isPinned
                          ? "중요공지"
                          : p.isNotice
                          ? "공지"
                          : "질문"}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/complaints/${p.id}`}
                          className="hover:underline font-medium"
                        >
                          {p.isHidden && (
                            <span className="text-[#c9302c] font-bold mr-1">
                              [숨김됨]
                            </span>
                          )}
                          {p.title}
                        </Link>
                        {p.isHidden && p.hiddenReason && (
                          <div className="text-[11px] text-[#c9302c]">
                            ↳ 숨김 사유: {p.hiddenReason}
                          </div>
                        )}
                      </td>
                      <td className="text-center">{p.authorName}</td>
                      <td className="text-center">
                        <div className="inline-flex items-center gap-1">
                          {p.isNotice && (
                            <button
                              type="button"
                              onClick={() =>
                                handleTogglePostState(
                                  p.id,
                                  "isPinned",
                                  !p.isPinned
                                )
                              }
                              className="px-2 py-1 border border-[#cccccc] bg-white hover:bg-[#eeeeee] text-[11px] cursor-pointer"
                            >
                              {p.isPinned ? "고정해제" : "상단고정"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleTogglePostState(
                                p.id,
                                "isHidden",
                                !p.isHidden
                              )
                            }
                            className="px-2 py-1 border border-[#cccccc] bg-white hover:bg-[#eeeeee] text-[11px] cursor-pointer"
                          >
                            {p.isHidden ? "숨김해제" : "숨김(사유)"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(p.id)}
                            className="px-2 py-1 bg-[#c9302c] text-white text-[11px] cursor-pointer"
                          >
                            삭제(사유)
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 탭 4: 회원 조회 · 이용 제한 · 권한 설정 */}
      {activeTab === "USERS" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[18px] font-bold text-[#222222]">
              회원 검색(이름·아이디·학과) 및 이용 제한 · 관리자 권한 부여
            </h2>
            <form
              onSubmit={handleUserSearchSubmit}
              className="flex flex-wrap items-center gap-1.5 text-[12px]"
            >
              <select
                value={userSearchDept}
                onChange={(e) => setUserSearchDept(e.target.value)}
                className="h-8 px-2 border border-[#cccccc] bg-white"
              >
                <option value="ALL">전체 학과</option>
                {BOARDS.filter((b) => b !== "COMMON").map((b) => (
                  <option key={b} value={b}>
                    {BOARD_MAP[b].shortName}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={userSearchQ}
                onChange={(e) => setUserSearchQ(e.target.value)}
                placeholder="이름·아이디·학과 검색"
                className="h-8 px-2.5 border border-[#cccccc] bg-white w-44"
              />
              <button
                type="submit"
                className="h-8 px-3 bg-[#0c4da2] text-white font-bold cursor-pointer"
              >
                회원 검색
              </button>
            </form>
          </div>

          <div className="overflow-x-auto border-t-2 border-[#555555] border-b border-[#999999]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="h-[38px] bg-[#fafafa] border-b border-[#cccccc] font-bold text-[#333333]">
                  <th className="w-12 text-center">ID</th>
                  <th className="w-24 text-center">아이디</th>
                  <th className="w-24 text-center">이름</th>
                  <th className="w-28 text-center">소속 학과</th>
                  <th className="w-24 text-center">역할</th>
                  <th className="text-left px-3">계정 상태 / 이용 제한 사유</th>
                  <th className="w-28 text-center">이용 제한 조치</th>
                  <th className="w-40 text-center">권한 설정 (전체관리자)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececec]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#f9f9f9]">
                    <td className="py-3 text-center">{u.id}</td>
                    <td className="py-3 text-center font-mono">{u.username}</td>
                    <td className="py-3 text-center font-bold">{u.name}</td>
                    <td className="py-3 text-center">
                      {currentUser.role === "SUPER_ADMIN" ? (
                        <select
                          value={u.department}
                          onChange={(e) =>
                            handleUpdateUserRole(u.id, u.role, e.target.value)
                          }
                          className="h-[26px] px-1.5 border border-[#cccccc] bg-white text-[11px]"
                        >
                          {BOARDS.filter((b) => b !== "COMMON").map((b) => (
                            <option key={b} value={b}>
                              {BOARD_MAP[b].shortName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>
                          {BOARD_MAP[u.department as BoardType]?.shortName ||
                            u.department}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center font-bold text-[#0c4da2]">
                      {ROLE_MAP[u.role as UserRole] || u.role}
                    </td>
                    <td className="py-3 px-3">
                      {u.isSuspended ? (
                        <div>
                          <span className="px-2 py-0.5 bg-[#fae3e3] text-[#c9302c] font-bold text-[11px]">
                            이용 제한 중
                          </span>
                          {u.suspendReason && (
                            <div className="text-[11px] text-[#c9302c] mt-0.5">
                              사유: {u.suspendReason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#2b8a3e] font-bold text-[11px]">
                          정상 활동
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {u.role === "SUPER_ADMIN" ? (
                        <span className="text-[#999999] text-[11px]">-</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleSuspendUser(u)}
                          className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                            u.isSuspended
                              ? "bg-[#2b8a3e] text-white"
                              : "bg-[#c9302c] text-white"
                          }`}
                        >
                          {u.isSuspended ? "제한 해제" : "이용 제한"}
                        </button>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {currentUser.role !== "SUPER_ADMIN" ? (
                        <span className="text-[11px] text-[#888888]">
                          전체관리자 전용
                        </span>
                      ) : u.role === "SUPER_ADMIN" ? (
                        <span className="text-[#888888] text-[11px]">
                          전체 관리자
                        </span>
                      ) : u.role === "DEPT_ADMIN" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateUserRole(u.id, "USER", u.department)
                          }
                          className="px-2 py-1 border border-[#cccccc] bg-white hover:bg-[#eeeeee] text-[#333333] text-[11px] font-bold cursor-pointer"
                        >
                          관리자 해제
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateUserRole(
                              u.id,
                              "DEPT_ADMIN",
                              u.department
                            )
                          }
                          className="px-2 py-1 bg-[#e66b19] text-white text-[11px] font-bold cursor-pointer"
                        >
                          학과관리자 지정
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 탭 5: 관리자 처리 이력 (AuditLog) */}
      {activeTab === "AUDIT" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[18px] font-bold text-[#222222]">
              관리자 처리 이력 (누가 언제 어떤 관리 작업을 했는지 기록)
            </h2>
            <span className="text-[12px] text-[#666666]">
              * 게시물 숨김·삭제, 신고 상태 변경, 회원 이용 제한 및 권한 변경 내역이 실시간 기록됩니다.
            </span>
          </div>

          <div className="overflow-x-auto border-t-2 border-[#555555] border-b border-[#999999]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="h-[38px] bg-[#fafafa] border-b border-[#cccccc] font-bold text-[#333333]">
                  <th className="w-16 text-center">이력번호</th>
                  <th className="w-36 text-center">처리 관리자</th>
                  <th className="w-36 text-center">작업 종류</th>
                  <th className="text-left px-3">상세 조치 내용 및 사유</th>
                  <th className="w-36 text-center">처리 일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececec]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#888888]">
                      기록된 관리자 처리 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="h-11 hover:bg-[#fafafa]">
                      <td className="text-center text-[#666666]">{log.id}</td>
                      <td className="text-center font-bold text-[#0c4da2]">
                        {log.adminName} (
                        {ROLE_MAP[log.adminRole as UserRole] || log.adminRole})
                      </td>
                      <td className="text-center">
                        <span className="px-2 py-0.5 bg-[#efefef] border border-[#dcdcdc] font-bold text-[11px] text-[#333333]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 text-[#222222]">{log.detail}</td>
                      <td className="text-center text-[#777777] text-[11px]">
                        {formatDateTime(log.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
