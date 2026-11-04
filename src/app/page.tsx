"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import {
  CATEGORIES,
  CATEGORY_MAP,
  ComplaintCategory,
  STATUSES,
  STATUS_MAP,
  ComplaintStatus,
} from "@/lib/constants";
import { Search, Lock, ChevronsRight } from "lucide-react";

interface ComplaintListItem {
  id: number;
  title: string;
  contentPreview: string;
  category: string;
  status: string;
  isSecret: boolean;
  replyCount: number;
  createdAt: string;
}

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

const PAGE_SIZE = 10;

export default function HomePage() {
  const [items, setItems] = useState<ComplaintListItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/complaints?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        if (data.stats) setStats(data.stats);
        setIsAdmin(Boolean(data.isAdmin));
        setCurrentPage(1);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

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

  return (
    <div className="space-y-12">
      {/* 상단 타이틀 영역 (사진의 '채용공고 | Recruit News' 스타일) */}
      <div>
        <div className="flex items-baseline gap-3 mb-7">
          <h1 className="text-[28px] font-normal text-[#222222] tracking-tight">
            불만 및 건의사항
          </h1>
          <span className="text-[#cccccc] text-sm">|</span>
          <span className="text-[13px] text-[#888888]">
            Complaint &amp; Suggestion Board
          </span>
        </div>

        {/* 테이블 상단 TOTAL 및 검색 영역 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-2.5">
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#666666]">
            <span>
              TOTAL <strong className="text-[#333333] font-normal">{items.length}</strong>
            </span>
            <span className="text-[#dddddd]">|</span>
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`cursor-pointer hover:underline ${
                statusFilter === "ALL" ? "font-bold text-[#222222]" : ""
              }`}
            >
              전체({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PENDING")}
              className={`cursor-pointer hover:underline ${
                statusFilter === "PENDING" ? "font-bold text-[#222222]" : ""
              }`}
            >
              접수대기({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("IN_PROGRESS")}
              className={`cursor-pointer hover:underline ${
                statusFilter === "IN_PROGRESS" ? "font-bold text-[#e66b19]" : ""
              }`}
            >
              처리중({stats.inProgress})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("RESOLVED")}
              className={`cursor-pointer hover:underline ${
                statusFilter === "RESOLVED" ? "font-bold text-[#1d6fa5]" : ""
              }`}
            >
              답변완료({stats.resolved})
            </button>
          </div>

          {/* 우측 셀렉트 박스 + 검색창 (사진의 우측 상단 검색바와 동일한 디자인) */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-1.5"
          >
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-[26px] px-2 border border-[#cccccc] bg-white text-[12px] text-[#444444] focus:outline-none"
            >
              <option value="ALL">전체분류</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_MAP[cat as ComplaintCategory].label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[26px] px-2 border border-[#cccccc] bg-white text-[12px] text-[#444444] focus:outline-none"
            >
              <option value="ALL">전체상태</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_MAP[st as ComplaintStatus].label}
                </option>
              ))}
            </select>

            <div className="flex items-center border border-[#cccccc] bg-white h-[26px] w-44 px-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="제목/내용 검색"
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

        {/* 클래식 기업형 게시판 테이블 */}
        <div className="w-full border-t-2 border-[#555555] border-b border-[#999999]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="h-[42px] border-b border-[#cccccc] text-[#333333] font-bold bg-[#fafafa]">
                <th className="w-[70px] text-center font-bold">No.</th>
                <th className="w-[110px] text-center font-bold">불만구분</th>
                <th className="w-[95px] text-center font-bold">처리구분</th>
                <th className="text-center font-bold">제목</th>
                <th className="w-[140px] text-center font-bold">등록일</th>
                <th className="w-[80px] text-center font-bold">답변</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="h-36 text-center text-[#777777] text-[13px]"
                  >
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="h-36 text-center text-[#777777] text-[13px]"
                  >
                    등록된 불만 및 건의사항 게시글이 없습니다.
                  </td>
                </tr>
              ) : (
                pagedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="h-[43px] border-b border-[#ececec] hover:bg-[#f9f9f9] transition-colors"
                  >
                    <td className="text-center text-[#555555]">{item.id}</td>
                    <td className="text-center">
                      <CategoryBadge category={item.category} />
                    </td>
                    <td className="text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 text-left">
                      <Link
                        href={`/complaints/${item.id}`}
                        className="inline-flex items-center gap-1.5 text-[#444444] hover:text-[#000000] hover:underline max-w-full"
                      >
                        {item.isSecret && (
                          <Lock className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                        )}
                        <span className="truncate">{item.title}</span>
                        {item.replyCount > 0 && (
                          <span className="text-[11px] text-[#e66b19] font-semibold shrink-0">
                            [{item.replyCount}]
                          </span>
                        )}
                        {item.isSecret && isAdmin && (
                          <span className="text-[11px] text-[#1d6fa5] shrink-0">
                            (관리자열람가능)
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="text-center text-[#666666] text-[12px]">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="text-center text-[#555555] text-[12px]">
                      {item.replyCount > 0 ? `${item.replyCount}건` : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 페이지네이션 & 글쓰기 버튼 영역 */}
        <div className="relative flex items-center justify-center mt-6 min-h-[32px]">
          {/* 사진과 동일한 사각 박스형 페이지네이션 */}
          <div className="flex items-center gap-1.5">
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
              className="w-[25px] h-[25px] border border-[#dddddd] flex items-center justify-center text-[#888888] hover:text-[#333333] cursor-pointer ml-1"
              title="다음 페이지"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 우측 익명 불만 등록 버튼 */}
          <div className="sm:absolute sm:right-0">
            <Link
              href="/complaints/new"
              className="inline-flex items-center justify-center h-[32px] px-4 bg-[#555555] hover:bg-[#333333] text-white text-[12px] font-bold transition-colors"
            >
              익명 불만/건의 등록
            </Link>
          </div>
        </div>
      </div>

      {/* 하단 안내 섹션 (사진의 '채용문의' 2단 테이블 디자인과 동일한 구성) */}
      <section className="pt-4">
        <h2 className="text-[20px] font-normal text-[#222222] mb-3.5 tracking-tight">
          익명보장 및 담당부서 안내
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 좌측 테이블 */}
          <div className="border-t-2 border-[#666666] border-b border-[#999999]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="h-[36px] bg-[#f7f7f7] border-b border-[#dcdcdc] text-[#444444] font-bold">
                  <th className="w-[100px] text-center">접수분야</th>
                  <th className="w-[120px] text-center">담당부서</th>
                  <th className="text-center">직통 E-Mail</th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-[38px] border-b border-[#ececec] text-[#666666]">
                  <td className="text-center font-medium text-[#444444]">
                    시설 / 환경
                  </td>
                  <td className="text-center">총무·시설지원팀</td>
                  <td className="text-center text-[#1d6fa5]">
                    facility.voice@anonymous.kr
                  </td>
                </tr>
                <tr className="h-[38px] text-[#666666]">
                  <td className="text-center font-medium text-[#444444]">
                    서비스 / IT
                  </td>
                  <td className="text-center">고객소통·IT지원팀</td>
                  <td className="text-center text-[#1d6fa5]">
                    service.voice@anonymous.kr
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 우측 테이블 */}
          <div className="border-t-2 border-[#666666] border-b border-[#999999]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="h-[36px] bg-[#f7f7f7] border-b border-[#dcdcdc] text-[#444444] font-bold">
                  <th className="w-[130px] text-center">운영구분</th>
                  <th className="text-center">익명보장 및 처리원칙</th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-[38px] border-b border-[#ececec] text-[#666666]">
                  <td className="text-center font-medium text-[#444444]">
                    비밀글 열람보호
                  </td>
                  <td className="text-center text-[#1d6fa5]">
                    작성 시 설정한 일회용 비밀번호로만 열람 가능
                  </td>
                </tr>
                <tr className="h-[38px] text-[#666666]">
                  <td className="text-center font-medium text-[#444444]">
                    답변 처리기한
                  </td>
                  <td className="text-center text-[#1d6fa5]">
                    접수일로부터 영업일 기준 3일 이내 답변 등록
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
