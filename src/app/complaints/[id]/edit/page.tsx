"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Paperclip, Trash2 } from "lucide-react";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_POST,
} from "@/lib/constants";

interface ExistingAttachment {
  id: number;
  fileName: string;
  fileSize: number;
}

interface NewAttachmentPayload {
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

export default function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [existingAttachments, setExistingAttachments] = useState<
    ExistingAttachment[]
  >([]);
  const [deleteAttachmentIds, setDeleteAttachmentIds] = useState<number[]>([]);
  const [newAttachments, setNewAttachments] = useState<NewAttachmentPayload[]>(
    []
  );
  const [permissionDenied, setPermissionDenied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/complaints/${id}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setPermissionDenied(
            data.error || "오류 안내: 존재하지 않는 게시글입니다."
          );
          return;
        }
        if (!data.user) {
          setPermissionDenied(
            "권한 없음 안내: 로그인하지 않은 사용자는 게시글을 수정할 수 없습니다."
          );
          return;
        }
        if (!data.canEdit) {
          setPermissionDenied(
            `권한 없음 안내: 다른 사람(${data.authorName})의 글은 수정할 수 없습니다. 작성자 본인만 수정 가능합니다.`
          );
          return;
        }
        setTitle(data.title || "");
        setContent(data.content || "");
        setAuthorName(data.authorName || "");
        setExistingAttachments(data.attachments || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const activeExisting = existingAttachments.filter(
    (a) => !deleteAttachmentIds.includes(a.id)
  );

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = activeExisting.length + newAttachments.length;
    if (currentCount + files.length > MAX_FILES_PER_POST) {
      setError(
        `업로드 제한 초과: 첨부파일은 기존 파일을 포함해 최대 ${MAX_FILES_PER_POST}개까지만 등록할 수 있습니다.`
      );
      e.target.value = "";
      return;
    }

    const added: NewAttachmentPayload[] = [];
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
          `업로드 제한 초과: '${file.name}' 파일 용량이 최대 허용 용량(2MB)을 초과했습니다.`
        );
        e.target.value = "";
        return;
      }
      const dataBase64 = await fileToBase64(file);
      added.push({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        dataBase64,
      });
    }

    setNewAttachments((prev) => [...prev, ...added]);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("입력 오류: 제목이 비어 있습니다. 제목을 입력해 주세요.");
      return;
    }
    if (!content.trim()) {
      setError("입력 오류: 본문이 비어 있습니다. 본문 내용을 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          deleteAttachmentIds,
          newAttachments,
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

  if (permissionDenied) {
    return (
      <div className="max-w-[980px] mx-auto px-4 py-12">
        <div className="border-t-2 border-[#555555] border-b border-[#999999] bg-[#fafafa] py-14 px-4 text-center space-y-4">
          <p className="text-[16px] font-bold text-[#c9302c]">
            {permissionDenied}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link
              href={`/complaints/${id}`}
              className="h-[34px] px-5 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#444444] text-[12px] font-bold inline-flex items-center justify-center"
            >
              게시글 상세로 돌아가기
            </Link>
            <Link
              href="/"
              className="h-[34px] px-5 bg-[#555555] hover:bg-[#333333] text-white text-[12px] font-bold inline-flex items-center justify-center"
            >
              목록으로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[980px] mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-[24px] sm:text-[28px] font-normal text-[#222222] tracking-tight">
          게시글 수정 · 첨부파일 교체
        </h1>
        <span className="text-[#cccccc] text-sm">|</span>
        <span className="text-[13px] text-[#888888]">
          기존 첨부파일 삭제 및 새 파일 추가 가능 (최대 3개, 파일당 2MB 이하)
        </span>
      </div>

      {error && (
        <div className="p-3 border border-[#d9534f] bg-[#fdf7f7] text-[#c9302c] text-[12px] font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="border-t-2 border-[#555555] border-b border-[#999999]">
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              <tr className="border-b border-[#dcdcdc]">
                <th className="w-[150px] bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5]">
                  작성자
                </th>
                <td className="px-4 py-3 font-bold text-[#333333]">
                  {authorName}
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
                    className="w-full p-3 border border-[#cccccc] text-[13px] leading-relaxed"
                  />
                </td>
              </tr>

              <tr>
                <th className="bg-[#f7f7f7] text-left px-4 py-3.5 font-bold text-[#333333] border-r border-[#e5e5e5] align-top">
                  첨부파일 관리
                </th>
                <td className="px-4 py-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0c4da2] hover:bg-[#093b7d] text-white text-[12px] font-bold cursor-pointer">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>새 파일 추가</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-[#666666]">
                      현재 {activeExisting.length + newAttachments.length} /{" "}
                      {MAX_FILES_PER_POST}개 (허용 형식:{" "}
                      {ALLOWED_EXTENSIONS.join(", ")})
                    </span>
                  </div>

                  {activeExisting.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-[#555555]">
                        기존 등록된 첨부파일
                      </p>
                      <ul className="border border-[#dcdcdc] bg-[#fafafa] divide-y divide-[#eeeeee] text-[12px]">
                        {activeExisting.map((att) => (
                          <li
                            key={att.id}
                            className="px-3 py-2 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-3.5 h-3.5 text-[#0c4da2]" />
                              <span>{att.fileName}</span>
                              <span className="text-[11px] text-[#888888]">
                                ({(att.fileSize / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteAttachmentIds((prev) => [
                                  ...prev,
                                  att.id,
                                ])
                              }
                              className="inline-flex items-center gap-1 text-[#c9302c] hover:underline text-[11px] font-bold cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>파일 삭제</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {newAttachments.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-[#0c4da2]">
                        새로 추가할 첨부파일
                      </p>
                      <ul className="border border-[#b8dce8] bg-[#f4f9fc] divide-y divide-[#dceef7] text-[12px]">
                        {newAttachments.map((att, idx) => (
                          <li
                            key={idx}
                            className="px-3 py-2 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-3.5 h-3.5 text-[#0c4da2]" />
                              <span className="font-semibold text-[#0c4da2]">
                                [신규] {att.fileName}
                              </span>
                              <span className="text-[11px] text-[#666666]">
                                ({(att.fileSize / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setNewAttachments((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="inline-flex items-center gap-1 text-[#c9302c] hover:underline text-[11px] font-bold cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>취소</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
