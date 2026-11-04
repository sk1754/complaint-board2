"use client";

import { useState } from "react";

interface PasswordModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<string | null>;
}

export function PasswordModal({
  isOpen,
  title,
  description,
  confirmLabel = "확인",
  onClose,
  onSubmit,
}: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("비밀번호를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    const errMsg = await onSubmit(password);
    setLoading(false);
    if (errMsg) {
      setError(errMsg);
    } else {
      setPassword("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white max-w-sm w-full border-t-2 border-[#555555] border-l border-r border-b border-[#999999] p-6 shadow-md">
        <h3 className="text-[16px] font-bold text-[#222222] pb-2 border-b border-[#e5e5e5]">
          {title}
        </h3>
        <p className="text-[12px] text-[#666666] mt-3 mb-4">{description}</p>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              autoFocus
              className="w-full h-[32px] px-3 border border-[#cccccc] text-[13px] focus:outline-none focus:border-[#555555]"
            />
            {error && (
              <p className="mt-1.5 text-[11px] text-[#c9302c] font-semibold">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-center gap-1.5 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="h-[32px] px-5 bg-[#555555] hover:bg-[#333333] disabled:opacity-50 text-white text-[12px] font-bold cursor-pointer"
            >
              {loading ? "확인 중..." : confirmLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-[32px] px-5 border border-[#cccccc] bg-white hover:bg-[#f7f7f7] text-[#555555] text-[12px] font-bold cursor-pointer"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
