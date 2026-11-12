"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BOARD_MAP,
  BoardType,
  QUESTION_STATUS_MAP,
  QuestionStatus,
} from "@/lib/constants";
import { Search, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PostListItem {
  id: number;
  board: string;
  targetDepts: string;
  isNotice: boolean;
  isPinned: boolean;
  isHidden: boolean;
  questionStatus: string;
  title: string;
  authorId: number;
  authorName: string;
  views: number;
  commentCount: number;
  attachmentCount?: number;
  createdAt: string;
}

interface DashboardSummary {
  commonNotices: PostListItem[];
  myDeptNotices: PostListItem[];
  recentQuestions: PostListItem[];
}

interface Stats {
  ALL: number;
  COMMON: number;
  COMP: number;
  AERO: number;
  MECHA: number;
  INFO: number;
}

interface UserInfo {
  id: number;
  username: string;
  name: string;
  department: string;
  role: string;
}

const PAGE_SIZE = 8;

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlBoard = searchParams.get("board") || "ALL";
  const urlQuery = searchParams.get("q") || "";

  const [boardFilter, setBoardFilter] = useState<string>(urlBoard);
  const [typeFilter, setTypeFilter] = useState<string>("ALL"); // ALL, NOTICE, QUESTION
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); // ALL, WAITING, ANSWERED, RESOLVED
  const [searchField, setSearchField] = useState<string>("ALL"); // ALL, TITLE, CONTENT, AUTHOR
  const [searchInput, setSearchInput] = useState<string>(urlQuery);
  const [searchQuery, setSearchQuery] = useState<string>(urlQuery);

  const [items, setItems] = useState<PostListItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary>({
    commonNotices: [],
    myDeptNotices: [],
    recentQuestions: [],
  });
  const [stats, setStats] = useState<Stats>({
    ALL: 0,
    COMMON: 0,
    COMP: 0,
    AERO: 0,
    MECHA: 0,
    INFO: 0,
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    setBoardFilter(urlBoard);
  }, [urlBoard]);

  useEffect(() => {
    setSearchInput(urlQuery);
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("board", boardFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchField !== "ALL") params.set("field", searchField);
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/complaints?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        if (data.dashboard) setDashboard(data.dashboard);
        if (data.stats) setStats(data.stats);
        setUser(data.user || null);
        setCurrentPage(1);
      }
    } finally {
      setLoading(false);
    }
  }, [boardFilter, typeFilter, statusFilter, searchField, searchQuery]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  function handleSelectBoard(nextBoard: string) {
    setBoardFilter(nextBoard);
    router.push(`/?board=${nextBoard}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pagedItems = items.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const myDeptName = user
    ? BOARD_MAP[user.department as BoardType]?.shortName || user.department
    : "컴전과";

  return (
    <div className="space-y-10">
      {/* 1. 통합 메인 요약 섹션 (공통 중요 공지 · 내 학과 공지 · 최근 질문) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 카드 1: 2공학관 공통 중요 공지 */}
        <div className="border-t-2 border-[#0c4da2] border-l border-r border-b border-[#dcdcdc] bg-white p-4">
          <div className="flex items-center justify-between border-b border-[#eeeeee] pb-2 mb-2.5">
            <h2 className="text-[13px] font-bold text-[#0c4da2]">
              2공학관 공통 중요 공지
            </h2>
            <button
              type="button"
              onClick={() => handleSelectBoard("COMMON")}
              className="text-[11px] text-[#777777] hover:underline cursor-pointer"
            >
              더보기 +
            </button>
          </div>
          <ul className="space-y-1.5 text-[12px]">
            {dashboard.commonNotices.length === 0 ? (
              <li className="text-[#888888] py-2">등록된 공통 공지가 없습니다.</li>
            ) : (
              dashboard.commonNotices.map((n) => (
                <li key={n.id} className="truncate">
                  <Link
                    href={`/complaints/${n.id}`}
                    className="hover:underline text-[#333333]"
                  >
                    <span className="text-[#e66b19] font-bold mr-1">
                      [공통]
                    </span>
                    {n.title}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* 카드 2: 내 학과 공지 */}
        <div className="border-t-2 border-[#e66b19] border-l border-r border-b border-[#dcdcdc] bg-white p-4">
          <div className="flex items-center justify-between border-b border-[#eeeeee] pb-2 mb-2.5">
            <h2 className="text-[13px] font-bold text-[#e66b19]">
              내 학과({myDeptName}) 공지사항
            </h2>
            <button
              type="button"
              onClick={() =>
                handleSelectBoard(user?.department || "COMP")
              }
              className="text-[11px] text-[#777777] hover:underline cursor-pointer"
            >
              더보기 +
            </button>
          </div>
          <ul className="space-y-1.5 text-[12px]">
            {dashboard.myDeptNotices.length === 0 ? (
              <li className="text-[#888888] py-2">등록된 학과 공지가 없습니다.</li>
            ) : (
              dashboard.myDeptNotices.map((n) => (
                <li key={n.id} className="truncate">
                  <Link
                    href={`/complaints/${n.id}`}
                    className="hover:underline text-[#333333]"
                  >
                    <span className="text-[#0c4da2] font-bold mr-1">
                      [{BOARD_MAP[n.board as BoardType]?.shortName || n.board}]
                    </span>
                    {n.title}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* 카드 3: 최근 등록된 질문 */}
        <div className="border-t-2 border-[#555555] border-l border-r border-b border-[#dcdcdc] bg-white p-4">
          <div className="flex items-center justify-between border-b border-[#eeeeee] pb-2 mb-2.5">
            <h2 className="text-[13px] font-bold text-[#333333]">
              최근 등록된 질문 (실시간 Q&amp;A)
            </h2>
            <button
              type="button"
              onClick={() => {
                setBoardFilter("ALL");
                setTypeFilter("QUESTION");
              }}
              className="text-[11px] text-[#777777] hover:underline cursor-pointer"
            >
              질문모아보기 +
            </button>
          </div>
          <ul className="space-y-1.5 text-[12px]">
            {dashboard.recentQuestions.length === 0 ? (
              <li className="text-[#888888] py-2">등록된 질문이 없습니다.</li>
            ) : (
              dashboard.recentQuestions.map((qItem) => {
                const st =
                  QUESTION_STATUS_MAP[
                    qItem.questionStatus as QuestionStatus
                  ] || QUESTION_STATUS_MAP.WAITING;
                return (
                  <li
                    key={qItem.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Link
                      href={`/complaints/${qItem.id}`}
                      className="truncate hover:underline text-[#333333]"
                    >
                      <span className="text-[#666666] mr-1">
                        [
                        {BOARD_MAP[qItem.board as BoardType]?.shortName ||
                          qItem.board}
                        ]
                      </span>
                      {qItem.title}
                    </Link>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-xs font-bold bg-[#f3f3f3] text-[#555555]">
                      {st.label}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </section>

      {/* 2. 공간 선택 탭 (전체 글 모아보기 + 2공학관 공통 + 4개 학과) */}
      <div>
        <div className="grid grid-cols-3 sm:grid-cols-6 border-t border-l border-[#cccccc] mb-5 text-[12px]">
          {[
            { code: "ALL", label: `전체 글 모아보기 (${stats.ALL})` },
            { code: "COMMON", label: `2공학관 공통 (${stats.COMMON})` },
            { code: "COMP", label: `컴전과 (${stats.COMP})` },
            { code: "AERO", label: `항공과 (${stats.AERO})` },
            { code: "MECHA", label: `메카과 (${stats.MECHA})` },
            { code: "INFO", label: `정통과 (${stats.INFO})` },
          ].map((tab) => {
            const active = boardFilter === tab.code;
            return (
              <button
                key={tab.code}
                type="button"
                onClick={() => handleSelectBoard(tab.code)}
                className={`h-[40px] border-r border-b border-[#cccccc] font-bold transition-colors cursor-pointer ${
                  active
                    ? "bg-[#0c4da2] text-white"
                    : "bg-[#f9f9f9] text-[#444444] hover:bg-[#efefef]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 3. 통합 검색 및 다중 조건 필터 바 (학과/공간 + 글 종류 + 질문 상태 + 검색어) */}
        <div className="bg-[#f7f7f7] border border-[#dcdcdc] p-3.5 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-bold text-[#333333] mr-1">필터 조건:</span>

            {/* 학과/공간 필터 */}
            <select
              value={boardFilter}
              onChange={(e) => handleSelectBoard(e.target.value)}
              className="h-[28px] px-2 border border-[#cccccc] bg-white text-[12px]"
            >
              <option value="ALL">전체 학과·공통 공간</option>
              <option value="COMMON">2공학관 공통 공간</option>
              <option value="COMP">컴전과</option>
              <option value="AERO">항공과</option>
              <option value="MECHA">메카과</option>
              <option value="INFO">정통과</option>
            </select>

            {/* 글 종류 필터 (공지 / 질문) */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-[28px] px-2 border border-[#cccccc] bg-white text-[12px]"
            >
              <option value="ALL">전체 글 종류 (공지+질문)</option>
              <option value="NOTICE">공지사항만 보기</option>
              <option value="QUESTION">질문글만 보기</option>
            </select>

            {/* 질문 상태 필터 (답변 대기 / 답변 등록 / 해결 완료) */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[28px] px-2 border border-[#cccccc] bg-white text-[12px]"
            >
              <option value="ALL">전체 질문 상태</option>
              <option value="WAITING">답변 대기</option>
              <option value="ANSWERED">답변 등록</option>
              <option value="RESOLVED">해결 완료</option>
            </select>
          </div>

          {/* 통합 검색 폼 */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-1.5"
          >
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-[28px] px-2 border border-[#cccccc] bg-white text-[12px]"
            >
              <option value="ALL">제목+내용+작성자</option>
              <option value="TITLE">제목</option>
              <option value="CONTENT">내용</option>
              <option value="AUTHOR">작성자</option>
            </select>

            <div className="flex items-center border border-[#cccccc] bg-white h-[28px] w-52 px-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="통합 검색어 입력"
                className="w-full text-[12px] text-[#333333] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearchQuery("");
                  }}
                  className="text-[10px] text-[#999999] hover:text-[#333333] mr-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                className="text-[#888888] hover:text-[#333333] cursor-pointer"
                title="검색"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-between text-[12px] text-[#666666] mb-2">
          <span>
            조회된 게시글 총{" "}
            <strong className="text-[#222222]">{items.length}</strong>건
            {boardFilter !== "ALL" && boardFilter !== "COMMON" && (
              <span className="text-[#0c4da2] ml-2">
                (* 현재 학과로 지정된 2공학관 공통 공지가 함께 표시됩니다)
              </span>
            )}
          </span>
          {(typeFilter !== "ALL" ||
            statusFilter !== "ALL" ||
            searchQuery !== "") && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter("ALL");
                setStatusFilter("ALL");
                setSearchInput("");
                setSearchQuery("");
              }}
              className="text-[#c9302c] font-bold hover:underline cursor-pointer"
            >
              검색/필터 초기화 ↺
            </button>
          )}
        </div>

        {/* 4. 통합 게시글 목록 테이블 ([학과], [공지/질문], [질문 상태] 구분 표시) */}
        <div className="w-full border-t-2 border-[#555555] border-b border-[#999999]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="h-[42px] border-b border-[#cccccc] text-[#333333] font-bold bg-[#fafafa]">
                <th className="w-[65px] text-center font-bold">No.</th>
                <th className="w-[105px] text-center font-bold">공간·학과</th>
                <th className="w-[75px] text-center font-bold">글종류</th>
                <th className="text-center font-bold">제목</th>
                <th className="w-[95px] text-center font-bold">질문상태</th>
                <th className="w-[110px] text-center font-bold">작성자</th>
                <th className="w-[100px] text-center font-bold">작성일</th>
                <th className="w-[60px] text-center font-bold">조회</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="h-36 text-center text-[#777777] text-[13px]"
                  >
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="h-36 text-center text-[#777777] text-[13px]"
                  >
                    조건에 맞는 게시글이 없습니다.
                  </td>
                </tr>
              ) : (
                pagedItems.map((item) => {
                  const deptLabel =
                    BOARD_MAP[item.board as BoardType]?.shortName || item.board;
                  const statusInfo =
                    QUESTION_STATUS_MAP[
                      item.questionStatus as QuestionStatus
                    ] || QUESTION_STATUS_MAP.WAITING;

                  return (
                    <tr
                      key={item.id}
                      className={`h-[44px] border-b border-[#ececec] hover:bg-[#f9f9f9] transition-colors ${
                        item.isPinned
                          ? "bg-[#fffaf5]"
                          : item.isNotice
                          ? "bg-[#fcfcfc]"
                          : ""
                      }`}
                    >
                      <td className="text-center text-[#555555]">
                        {item.isPinned ? (
                          <span className="inline-block px-1.5 py-0.5 bg-[#e66b19] text-white text-[11px] font-bold">
                            중요
                          </span>
                        ) : (
                          item.id
                        )}
                      </td>
                      <td className="text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[11px] font-bold ${
                            item.board === "COMMON"
                              ? "bg-[#0c4da2] text-white"
                              : "bg-[#efefef] text-[#333333]"
                          }`}
                        >
                          [{deptLabel}]
                        </span>
                      </td>
                      <td className="text-center">
                        {item.isNotice ? (
                          <span className="text-[#1d6fa5] font-bold text-[12px]">
                            [공지]
                          </span>
                        ) : (
                          <span className="text-[#555555] text-[12px]">
                            [질문]
                          </span>
                        )}
                      </td>
                      <td className="px-3 text-left">
                        <Link
                          href={`/complaints/${item.id}`}
                          className={`inline-flex items-center gap-1.5 hover:text-[#000000] hover:underline max-w-full ${
                            item.isHidden
                              ? "text-[#999999] italic"
                              : item.isNotice
                              ? "font-bold text-[#222222]"
                              : "text-[#333333]"
                          }`}
                        >
                          {item.isHidden && (
                            <span className="px-1.5 py-0.5 bg-[#c9302c] text-white text-[10px] font-bold not-italic shrink-0">
                              숨김됨
                            </span>
                          )}
                          <span className="truncate">{item.title}</span>
                          {item.commentCount > 0 && (
                            <span className="text-[11px] text-[#e66b19] font-semibold shrink-0">
                              [{item.commentCount}]
                            </span>
                          )}
                          {(item.attachmentCount ?? 0) > 0 && (
                            <span className="px-1.5 py-0.2 bg-[#eef4fb] text-[#0c4da2] border border-[#b6cef2] text-[10px] font-bold not-italic shrink-0">
                              첨부 {item.attachmentCount}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="text-center">
                        {item.isNotice ? (
                          <span className="text-[11px] text-[#999999]">-</span>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 text-[11px] font-bold ${statusInfo.badgeClass}`}
                          >
                            {statusInfo.label}
                          </span>
                        )}
                      </td>
                      <td className="text-center text-[#333333] text-[12px]">
                        {item.authorName}
                      </td>
                      <td className="text-center text-[#666666] text-[12px]">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="text-center text-[#555555] text-[12px]">
                        {item.views}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 및 작성 버튼 */}
        <div className="relative flex items-center justify-center mt-6 min-h-[32px]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-[25px] h-[25px] border border-[#dddddd] flex items-center justify-center text-[#888888] hover:text-[#333333] disabled:opacity-40 cursor-pointer mr-1"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
              (page) => {
                const active = page === currentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-[25px] h-[25px] flex items-center justify-center text-[12px] cursor-pointer ${
                      active
                        ? "border border-[#d88954] text-[#d88954] font-bold bg-white"
                        : "text-[#666666] hover:text-[#222222]"
                    }`}
                  >
                    {page}
                  </button>
                );
              }
            )}
            <button
              type="button"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className="w-[25px] h-[25px] border border-[#dddddd] flex items-center justify-center text-[#888888] hover:text-[#333333] disabled:opacity-40 cursor-pointer ml-1"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="sm:absolute sm:right-0 flex items-center gap-2">
            <Link
              href="/complaints/new?board=COMMON"
              className="inline-flex items-center justify-center h-[32px] px-3.5 bg-[#0c4da2] hover:bg-[#093b7d] text-white text-[12px] font-bold transition-colors"
            >
              2공학관 공통 글쓰기
            </Link>
            <Link
              href={`/complaints/new${
                boardFilter !== "ALL" && boardFilter !== "COMMON"
                  ? `?board=${boardFilter}`
                  : ""
              }`}
              className="inline-flex items-center justify-center h-[32px] px-3.5 bg-[#555555] hover:bg-[#333333] text-white text-[12px] font-bold transition-colors"
            >
              학과 글쓰기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-[#777]" />}>
      <HomeContent />
    </Suspense>
  );
}
