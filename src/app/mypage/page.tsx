"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BOARD_MAP,
  BoardType,
  QUESTION_STATUS_MAP,
  QuestionStatusType,
  ROLE_MAP,
  UserRole,
} from "@/lib/constants";

interface MyPostItem {
  id: number;
  board: string;
  isNotice: boolean;
  questionStatus: string;
  title: string;
  views: number;
  createdAt: string;
  _count: {
    comments: number;
    attachments: number;
  };
}

interface MyCommentItem {
  id: number;
  postId: number;
  content: string;
  isOfficial: boolean;
  createdAt: string;
  post: {
    id: number;
    board: string;
    title: string;
    questionStatus: string;
  };
}

interface UserProfile {
  id: number;
  username: string;
  name: string;
  department: string;
  role: string;
  isSuspended: boolean;
  suspendedUntil: string | null;
  suspendReason: string | null;
}

export default function MyPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [myPosts, setMyPosts] = useState<MyPostItem[]>([]);
  const [myComments, setMyComments] = useState<MyCommentItem[]>([]);
  const [unresolvedQuestions, setUnresolvedQuestions] = useState<MyPostItem[]>(
    []
  );
  const [activeTab, setActiveTab] = useState<
    "POSTS" | "COMMENTS" | "UNRESOLVED" | "ACCOUNT"
  >("POSTS");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  async function loadMyPage() {
    setLoading(true);
    try {
      const res = await fetch("/api/mypage", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "마이페이지 정보를 불러올 수 없습니다.");
        setLoading(false);
        return;
      }
      setUser(data.user);
      setMyPosts(data.myPosts || []);
      setMyComments(data.myComments || []);
      setUnresolvedQuestions(data.unresolvedQuestions || []);
      setErrorMsg("");
    } catch {
      setErrorMsg("서버 통신 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyPage();
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage("");
    setPwError("");

    if (!currentPassword || !newPassword) {
      setPwError("현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    setPwSubmitting(true);
    try {
      const res = await fetch("/api/mypage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "비밀번호 변경에 실패했습니다.");
      } else {
        setPwMessage(data.message || "비밀번호가 변경되었습니다.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPwError("비밀번호 변경 중 서버 오류가 발생했습니다.");
    } finally {
      setPwSubmitting(false);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="max-w-[980px] mx-auto px-4 py-16 text-center text-[13px] text-[#777777]">
        마이페이지 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (errorMsg || !user) {
    return (
      <div className="max-w-[980px] mx-auto px-4 py-12">
        <div className="border-t-2 border-t-[#c9302c] border border-[#e5bcbc] bg-[#fdf7f7] p-8 text-center">
          <p className="text-[15px] font-bold text-[#c9302c] mb-2">
            {errorMsg || "로그인이 필요합니다."}
          </p>
          <Link
            href="/login"
            className="inline-block mt-3 px-5 py-2 bg-[#0c4da2] text-white text-[12px] font-bold"
          >
            로그인 화면으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[980px] mx-auto px-4 py-10">
      <div className="mb-6 pb-3 border-b border-[#e5e5e5] flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] font-bold text-[#222222] tracking-tight">
            마이페이지 · 계정 관리
          </h1>
          <span className="text-[13px] text-[#888888]">
            내가 쓴 글 · 댓글/답변 · 미해결 질문 모아보기 및 비밀번호 변경
          </span>
        </div>
      </div>

      {/* 내 정보 요약 박스 */}
      <div className="mb-6 border-t-2 border-t-[#0c4da2] border border-[#dcdcdc] bg-[#f8f9fb] p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-[12px]">
        <div>
          <span className="text-[#777777] block text-[11px]">이름 (아이디)</span>
          <strong className="text-[14px] text-[#222222]">
            {user.name} ({user.username})
          </strong>
        </div>
        <div>
          <span className="text-[#777777] block text-[11px]">소속 학과</span>
          <strong className="text-[14px] text-[#0c4da2]">
            {BOARD_MAP[user.department as BoardType]?.name || user.department}
          </strong>
        </div>
        <div>
          <span className="text-[#777777] block text-[11px]">계정 권한</span>
          <strong className="text-[14px] text-[#333333]">
            {ROLE_MAP[user.role as UserRole] || user.role}
          </strong>
        </div>
        <div>
          <span className="text-[#777777] block text-[11px]">계정 상태</span>
          {user.isSuspended ? (
            <div>
              <span className="inline-block px-2 py-0.5 bg-[#fae3e3] text-[#c9302c] font-bold text-[11px]">
                이용 제한 중
              </span>
              {user.suspendReason && (
                <p className="text-[11px] text-[#c9302c] mt-0.5">
                  사유: {user.suspendReason}
                </p>
              )}
            </div>
          ) : (
            <span className="inline-block px-2 py-0.5 bg-[#e3f2fd] text-[#0c4da2] font-bold text-[11px]">
              정상 이용 가능
            </span>
          )}
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="mb-5 flex flex-wrap border-b-2 border-[#0c4da2]">
        {[
          {
            key: "POSTS",
            label: `내가 쓴 글 (${myPosts.length})`,
          },
          {
            key: "COMMENTS",
            label: `내가 쓴 댓글·답변 (${myComments.length})`,
          },
          {
            key: "UNRESOLVED",
            label: `내 미해결 질문 (${unresolvedQuestions.length})`,
          },
          {
            key: "ACCOUNT",
            label: "내 정보 · 비밀번호 변경",
          },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() =>
              setActiveTab(
                tab.key as "POSTS" | "COMMENTS" | "UNRESOLVED" | "ACCOUNT"
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

      {/* 1. 내가 쓴 글 탭 */}
      {activeTab === "POSTS" && (
        <div className="overflow-x-auto">
          <table className="w-full border-t-2 border-t-[#333333] border-b border-b-[#cccccc] text-[12px]">
            <thead>
              <tr className="bg-[#f8f8f8] border-b border-[#dcdcdc] text-[#333333] font-bold h-10">
                <th className="w-16 text-center">번호</th>
                <th className="w-24 text-center">소속</th>
                <th className="w-24 text-center">상태/종류</th>
                <th className="text-left px-3">제목</th>
                <th className="w-24 text-center">작성일</th>
                <th className="w-16 text-center">조회</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeee]">
              {myPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#888888]">
                    작성한 게시글이 없습니다.
                  </td>
                </tr>
              ) : (
                myPosts.map((post) => {
                  const st =
                    QUESTION_STATUS_MAP[
                      post.questionStatus as QuestionStatusType
                    ] || QUESTION_STATUS_MAP.WAITING;
                  return (
                    <tr key={post.id} className="h-10 hover:bg-[#fafafa]">
                      <td className="text-center text-[#666666]">{post.id}</td>
                      <td className="text-center font-bold text-[#0c4da2]">
                        [{BOARD_MAP[post.board as BoardType]?.shortName || post.board}]
                      </td>
                      <td className="text-center">
                        {post.isNotice ? (
                          <span className="px-2 py-0.5 bg-[#0c4da2] text-white text-[11px] font-bold">
                            공지
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 text-[11px] font-bold ${st.bgClass} ${st.colorClass}`}
                          >
                            {st.label}
                          </span>
                        )}
                      </td>
                      <td className="px-3">
                        <Link
                          href={`/complaints/${post.id}`}
                          className="text-[#333333] hover:text-[#0c4da2] hover:underline font-medium"
                        >
                          {post.title}
                        </Link>
                        {post._count.comments > 0 && (
                          <span className="ml-1.5 text-[11px] font-bold text-[#e66b19]">
                            [{post._count.comments}]
                          </span>
                        )}
                        {post._count.attachments > 0 && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.2 bg-[#efefef] text-[#555555] border border-[#dcdcdc]">
                            첨부 {post._count.attachments}
                          </span>
                        )}
                      </td>
                      <td className="text-center text-[#777777]">
                        {formatDate(post.createdAt)}
                      </td>
                      <td className="text-center text-[#666666]">
                        {post.views}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. 내가 쓴 댓글·답변 탭 */}
      {activeTab === "COMMENTS" && (
        <div className="overflow-x-auto">
          <table className="w-full border-t-2 border-t-[#333333] border-b border-b-[#cccccc] text-[12px]">
            <thead>
              <tr className="bg-[#f8f8f8] border-b border-[#dcdcdc] text-[#333333] font-bold h-10">
                <th className="w-24 text-center">구분</th>
                <th className="text-left px-3">내가 작성한 댓글·답변 내용</th>
                <th className="w-64 text-left px-3">원문 게시글 바로가기</th>
                <th className="w-24 text-center">작성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeee]">
              {myComments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#888888]">
                    작성한 댓글·답변이 없습니다.
                  </td>
                </tr>
              ) : (
                myComments.map((c) => (
                  <tr key={c.id} className="h-11 hover:bg-[#fafafa]">
                    <td className="text-center">
                      {c.isOfficial ? (
                        <span className="px-2 py-0.5 bg-[#0c4da2] text-white text-[11px] font-bold">
                          공식 답변
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-[#efefef] text-[#555555] text-[11px]">
                          일반 답변
                        </span>
                      )}
                    </td>
                    <td className="px-3 text-[#222222]">{c.content}</td>
                    <td className="px-3">
                      <Link
                        href={`/complaints/${c.post.id}`}
                        className="text-[#0c4da2] hover:underline font-semibold"
                      >
                        [{BOARD_MAP[c.post.board as BoardType]?.shortName || c.post.board}]{" "}
                        {c.post.title}
                      </Link>
                    </td>
                    <td className="text-center text-[#777777]">
                      {formatDate(c.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. 내 미해결 질문 탭 */}
      {activeTab === "UNRESOLVED" && (
        <div className="overflow-x-auto">
          <div className="mb-3 p-3 bg-[#fff9f2] border border-[#f3d9b8] text-[12px] text-[#666666]">
            아직 <strong>[해결 완료]</strong>로 변경하지 않은 본인의 질문 목록입니다.
            원문을 확인하고 답변이 충분하면 상세 화면에서 <strong>[해결 완료로 표시]</strong> 버튼을 눌러 상태를 완료할 수 있습니다.
          </div>
          <table className="w-full border-t-2 border-t-[#333333] border-b border-b-[#cccccc] text-[12px]">
            <thead>
              <tr className="bg-[#f8f8f8] border-b border-[#dcdcdc] text-[#333333] font-bold h-10">
                <th className="w-16 text-center">번호</th>
                <th className="w-24 text-center">소속</th>
                <th className="w-24 text-center">현재 상태</th>
                <th className="text-left px-3">질문 제목</th>
                <th className="w-24 text-center">답변 수</th>
                <th className="w-24 text-center">작성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeee]">
              {unresolvedQuestions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#888888]">
                    미해결 상태인 본인 질문이 없습니다.
                  </td>
                </tr>
              ) : (
                unresolvedQuestions.map((q) => {
                  const st =
                    QUESTION_STATUS_MAP[
                      q.questionStatus as QuestionStatusType
                    ] || QUESTION_STATUS_MAP.WAITING;
                  return (
                    <tr key={q.id} className="h-10 hover:bg-[#fafafa]">
                      <td className="text-center text-[#666666]">{q.id}</td>
                      <td className="text-center font-bold text-[#0c4da2]">
                        [{BOARD_MAP[q.board as BoardType]?.shortName || q.board}]
                      </td>
                      <td className="text-center">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-bold ${st.bgClass} ${st.colorClass}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3">
                        <Link
                          href={`/complaints/${q.id}`}
                          className="text-[#333333] hover:text-[#0c4da2] hover:underline font-medium"
                        >
                          {q.title}
                        </Link>
                      </td>
                      <td className="text-center font-bold text-[#e66b19]">
                        {q._count.comments}건
                      </td>
                      <td className="text-center text-[#777777]">
                        {formatDate(q.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. 내 정보 및 비밀번호 변경 탭 */}
      {activeTab === "ACCOUNT" && (
        <div className="max-w-[540px] border-t-2 border-t-[#333333] border border-[#dcdcdc] bg-white p-6">
          <h2 className="text-[16px] font-bold text-[#222222] mb-4">
            비밀번호 변경 (현재 비밀번호 확인 후 변경)
          </h2>

          {pwError && (
            <div className="mb-4 p-3 bg-[#fdf2f2] border border-[#e5bcbc] text-[#c9302c] text-[12px] font-bold">
              {pwError}
            </div>
          )}
          {pwMessage && (
            <div className="mb-4 p-3 bg-[#eef7fa] border border-[#b8dce8] text-[#0c4da2] text-[12px] font-bold">
              {pwMessage}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-[12px]">
            <div>
              <label className="block font-bold text-[#333333] mb-1">
                현재 비밀번호
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 사용 중인 비밀번호 입력"
                className="w-full h-9 px-3 border border-[#cccccc] focus:outline-none focus:border-[#0c4da2]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#333333] mb-1">
                새 비밀번호 (4자 이상)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="변경할 새 비밀번호 입력"
                className="w-full h-9 px-3 border border-[#cccccc] focus:outline-none focus:border-[#0c4da2]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#333333] mb-1">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="변경할 새 비밀번호 다시 입력"
                className="w-full h-9 px-3 border border-[#cccccc] focus:outline-none focus:border-[#0c4da2]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={pwSubmitting}
                className="px-6 py-2.5 bg-[#0c4da2] hover:bg-[#093b7d] text-white font-bold text-[12px] cursor-pointer disabled:opacity-50"
              >
                {pwSubmitting ? "변경 처리 중..." : "비밀번호 변경하기"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
