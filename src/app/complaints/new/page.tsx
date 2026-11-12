"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Paperclip, Trash2 } from "lucide-react";
import {
  BOARDS,
  BOARD_MAP,
  BoardType,
  DEPTS,
  DeptType,
  ROLE_MAP,
  UserRole,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_POST,
} from "@/lib/constants";

interface UserInfo {
  id: number;
  username: string;
  name: string;
  department: string;
  role: string;
  isSuspended?: boolean;
  suspendReason?: string | null;
}

interface AttachmentPayload {
  fileName: string;
  mimeType: string;
  fileSize: number;
  dataBase64: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function NewPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlBoard = searchParams.get("board") as BoardType | null;
  const urlNotice = searchParams.get("notice") === "1";

  const [user, setUser] = useState<UserInfo | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [board, setBoard] = useState<BoardType>("COMMON");
  const [isNotice, setIsNotice] = useState(urlNotice);
  const [isPinned, setIsPinned] = useState(urlNotice);
  const [selectedTargetDepts, setSelectedTargetDepts] = useState<DeptType[]>([
    "COMP",
    "AERO",
    "MECHA",
    "INFO",
  ]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          if (urlBoard && BOARDS.includes(urlBoard)) {
            setBoard(urlBoard);
          } else if (BOARDS.includes(data.user.department)) {
            setBoard(data.user.department as BoardType);
          }
        }
      })
      .finally(() => setAuthChecking(false));
  }, [urlBoard]);

  function toggleTargetDept(d: DeptType) {
    setSelectedTargetDepts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (attachments.length + files.length > MAX_FILES_PER_POST) {
      setError(
        `업로드 제한 초과: 첨부파일은 최대 ${MAX_FILES_PER_POST}개까지만 등록할 수 있습니다.`
      );
      e.target.value = "";
      return;
    }

    const nextItems: AttachmentPayload[] = [];
    for (const file of files) {
      const ext = ("." + (file.name.split(".").pop() || "")).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(
          `업로드 제한 초과: 허용되지 않는 파일 형식(${ext})입니다. 허용 확장자: ${ALLOWED_EXTENSIONS.join(
            ", "
          )}`
        );
        e.target.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(
          `업로드 제한 초과: '${file.name}' 파일 크기(${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)}MB)가 최대 허용 용량(2MB)을 초과했습니다.`
        );
        e.target.value = "";
        return;
      }
      const dataBase64 = await fileToBase64(file);
      nextItems.push({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        dataBase64,
      });
    }

    setAttachments((prev) => [...prev, ...nextItems]);
    e.target.value = "";
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("입력 오류: 제목을 입력해 주세요.");
      return;
    }
    if (!content.trim()) {
      setError("입력 오류: 본문 내용을 입력해 주세요.");
      return;
    }

    const targetDeptsStr =
      selectedTargetDepts.length === 4 || selectedTargetDepts.length === 0
        ? "ALL"
        : selectedTargetDepts.join(",");

    setLoading(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board,
          targetDepts: targetDeptsStr,
          isNotice,
          isPinned: isNotice ? isPinned : false,
          title,
          content,
          attachments,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "등록 중 오류가 발생했습니다.");
        return;
      }
      router.push(`/complaints/${data.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (authChecking) {
    return (
      <div className="py-16 text-center text-[13px] text-[#777777]">
        로그인 정보를 확인하는 중입니다...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="border-t-2 border-[#555555] border-b border-[#999999] bg-[#fafafa] py-14 px-4 text-center space-y-4">
        <p className="text-[16px] font-bold text-[#c9302c]">
          권한 없음 안내: 로그인하지 않은 사용자는 게시글을 작성할 수 없습니다.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Link
            href="/login"
            className="h-[34px] px-5 bg-[#e66b19] hover:bg-[#d4590a] text-white text-[12px] font-bold inline-flex items-center justify-center"
          >
            로그인 화면으로 이동
          </Link>
          <Link
            href="/"
            className="h-[34px] px-5 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[12px] font-bold inline-flex items-center justify-center"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[980px] mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-[24px] sm:text-[28px] font-normal text-[#222222] tracking-tight">
          게시글 작성 ({BOARD_MAP[board]?.shortName || board})
        </h1>
        <span className="text-[#cccccc] text-sm">|</span>
        <span className="text-[13px] text-[#888888]">
          공지·질문에 문서나 이미지 첨부 가능 (최대 3개, 파일당 2MB 이하)
        </span>
      </div>

      {user.isSuspended && (
        <div className="p-4 border-2 border-[#c9302c] bg-[#fdf2f2] text-[#c9302c] text-[13px] font-bold">
          ⚠️ 현재 회원님의 계정은 [이용 제한] 상태입니다. (사유:{" "}
          {user.suspendReason || "운영 정책 위반"}) 작성 요청 시 서버에서 차단됩니다.
        </div>
      )}

      {error && (
        <div className="p-3.5 border border-[#d9534f] bg-[#fdf7f7] text-[#c9302c] text-[13px] font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="border-t-2 border-[#555555] border-b border-[#999999]">
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              <tr className="border-b border-[#dcdcdc]">
                <th className="w-[140px] sm:w-[160px] bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  작성자 정보
                </th>
                <td className="px-4 py-3">
                  <strong className="text-[#0c4da2]">{user.name}</strong> (소속:{" "}
                  <strong>
                    {BOARD_MAP[user.department as BoardType]?.shortName}
                  </strong>{" "}
                  / 역할:{" "}
                  <strong className="text-[#e66b19]">
                    {ROLE_MAP[user.role as UserRole]}
                  </strong>
                  )
                </td>
              </tr>

              <tr className="border-b border-[#dcdcdc]">
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  작성 공간 선택 <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3 space-y-1">
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value as BoardType)}
                    className="h-[32px] w-full sm:w-auto px-2.5 border border-[#cccccc] bg-white text-[13px]"
                  >
                    <option value="COMMON">
                      2공학관 공통 게시판 (공용 시설·강의실 공통 질문 / 전체 공지)
                    </option>
                    {DEPTS.map((d) => (
                      <option key={d} value={d}>
                        {BOARD_MAP[d].shortName} 게시판 ({BOARD_MAP[d].fullName})
                        {user.department === d ? " [내 소속 학과]" : " [타 학과]"}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>

              <tr className="border-b border-[#dcdcdc]">
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  글 종류 선택 <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="postType"
                        checked={!isNotice}
                        onChange={() => {
                          setIsNotice(false);
                          setIsPinned(false);
                        }}
                      />
                      <span>질문글 (등록 시 &apos;답변 대기&apos; 상태로 시작)</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="postType"
                        checked={isNotice}
                        onChange={() => setIsNotice(true)}
                      />
                      <span className="font-bold text-[#1d6fa5]">
                        공지사항 (
                        {board === "COMMON"
                          ? "전체 관리자 전용"
                          : "담당 학과 관리자 · 전체 관리자 전용"}
                        )
                      </span>
                    </label>

                    {isNotice && (
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#e66b19] font-bold">
                        <input
                          type="checkbox"
                          checked={isPinned}
                          onChange={(e) => setIsPinned(e.target.checked)}
                        />
                        <span>중요 공지로 상단 고정</span>
                      </label>
                    )}
                  </div>

                  {board === "COMMON" && isNotice && (
                    <div className="p-2.5 bg-[#f0f7fc] border border-[#a8d1f0] text-[12px] space-y-1.5">
                      <p className="font-bold text-[#0c4da2]">
                        공통 공지를 함께 표시할 학과 게시판 선택:
                      </p>
                      <div className="flex flex-wrap items-center gap-4">
                        {DEPTS.map((d) => (
                          <label
                            key={d}
                            className="inline-flex items-center gap-1 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTargetDepts.includes(d)}
                              onChange={() => toggleTargetDept(d)}
                            />
                            <span>{BOARD_MAP[d].shortName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
              </tr>

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
                    className="h-[32px] w-full px-2.5 border border-[#cccccc] text-[13px]"
                  />
                </td>
              </tr>

              <tr className="border-b border-[#dcdcdc]">
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5] align-top">
                  본문 <span className="text-[#e66b19]">*</span>
                </th>
                <td className="px-4 py-3">
                  <textarea
                    rows={10}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="내용을 입력해 주세요"
                    className="w-full p-3 border border-[#cccccc] text-[13px] leading-relaxed"
                  />
                </td>
              </tr>

              {/* 첨부파일 영역 */}
              <tr>
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5] align-top">
                  첨부파일
                </th>
                <td className="px-4 py-3 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0c4da2] hover:bg-[#093b7d] text-white text-[12px] font-bold cursor-pointer">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>파일 선택</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-[#666666]">
                      최대 <strong>{MAX_FILES_PER_POST}개</strong> · 파일당 최대{" "}
                      <strong>2MB</strong> · 허용 형식:{" "}
                      {ALLOWED_EXTENSIONS.join(", ")}
                    </span>
                  </div>

                  {attachments.length > 0 && (
                    <ul className="border border-[#dcdcdc] bg-[#fafafa] divide-y divide-[#eeeeee] text-[12px]">
                      {attachments.map((att, idx) => (
                        <li
                          key={idx}
                          className="px-3 py-2 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-3.5 h-3.5 text-[#0c4da2]" />
                            <span className="font-semibold text-[#333333]">
                              {att.fileName}
                            </span>
                            <span className="text-[11px] text-[#888888]">
                              ({(att.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="inline-flex items-center gap-1 text-[#c9302c] hover:underline text-[11px] font-bold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>삭제</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
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
            href={`/?board=${board}`}
            className="h-[36px] px-6 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[13px] font-bold inline-flex items-center justify-center"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewComplaintPage() {
  return (
    <Suspense
      fallback={<div className="py-16 text-center text-sm text-[#777]" />}
    >
      <NewPostForm />
    </Suspense>
  );
}
