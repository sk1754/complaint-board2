"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, ExternalLink } from "lucide-react";

interface NotificationItem {
  id: number;
  userId: number;
  postId: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "알림을 불러올 수 없습니다.");
        setLoading(false);
        return;
      }
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setErrorMsg("");
    } catch {
      setErrorMsg("서버 통신 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function handleMarkRead(id: number, goPostId?: number) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    if (goPostId) {
      router.push(`/complaints/${goPostId}`);
    } else {
      loadNotifications();
    }
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    loadNotifications();
  }

  function formatDateTime(dateStr: string) {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  if (loading) {
    return (
      <div className="max-w-[980px] mx-auto px-4 py-16 text-center text-[13px] text-[#777777]">
        알림함을 불러오는 중입니다...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-[980px] mx-auto px-4 py-12">
        <div className="border-t-2 border-t-[#c9302c] border border-[#e5bcbc] bg-[#fdf7f7] p-8 text-center">
          <p className="text-[15px] font-bold text-[#c9302c] mb-2">{errorMsg}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/login"
              className="px-5 py-2 bg-[#0c4da2] text-white text-[12px] font-bold"
            >
              로그인 화면으로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[980px] mx-auto px-4 py-10">
      <div className="mb-6 pb-3 border-b border-[#e5e5e5] flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] font-bold text-[#222222] tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#0c4da2]" />
            <span>알림함</span>
          </h1>
          <span className="text-[13px] text-[#888888] font-normal">
            내 질문에 새 답변이 등록되면 자동으로 알림이 도착합니다
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#555555]">
            읽지 않은 알림:{" "}
            <strong className="text-[#e66b19]">{unreadCount}</strong>건
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 bg-[#0c4da2] hover:bg-[#093b7d] text-white text-[11px] font-bold cursor-pointer"
            >
              전체 읽음 처리
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-t-2 border-t-[#333333] border-b border-b-[#cccccc] text-[12px]">
          <thead>
            <tr className="bg-[#f8f8f8] border-b border-[#dcdcdc] text-[#333333] font-bold h-10">
              <th className="w-24 text-center">상태</th>
              <th className="w-28 text-center">구분</th>
              <th className="text-left px-4">알림 내용 (클릭 시 원문 이동 및 읽음 처리)</th>
              <th className="w-36 text-center">수신일시</th>
              <th className="w-28 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eeeeee]">
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-14 text-center text-[#888888]">
                  도착한 알림이 없습니다.
                </td>
              </tr>
            ) : (
              notifications.map((item) => (
                <tr
                  key={item.id}
                  className={`min-h-12 transition-colors ${
                    item.isRead
                      ? "bg-white text-[#777777]"
                      : "bg-[#f4f8fd] text-[#222222] font-semibold"
                  }`}
                >
                  <td className="py-3 text-center">
                    {item.isRead ? (
                      <span className="inline-block px-2 py-0.5 text-[11px] bg-[#efefef] text-[#777777] border border-[#dcdcdc]">
                        읽음
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-[11px] bg-[#e66b19] text-white font-bold">
                        새 알림
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[11px] font-bold ${
                        item.type === "OFFICIAL_ANSWER"
                          ? "bg-[#0c4da2] text-white"
                          : "bg-[#eaf1fb] text-[#0c4da2] border border-[#b6cef2]"
                      }`}
                    >
                      {item.type === "OFFICIAL_ANSWER" ? "공식 답변" : "일반 답변"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item.id, item.postId)}
                      className="text-left hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{item.message}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#0c4da2] shrink-0" />
                    </button>
                  </td>
                  <td className="py-3 text-center text-[11px] text-[#777777]">
                    {formatDateTime(item.createdAt)}
                  </td>
                  <td className="py-3 text-center">
                    {!item.isRead ? (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#0c4da2] text-[#0c4da2] bg-white hover:bg-[#f0f6ff] text-[11px] font-bold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>읽음확인</span>
                      </button>
                    ) : (
                      <Link
                        href={`/complaints/${item.postId}`}
                        className="px-2.5 py-1 border border-[#cccccc] text-[#555555] bg-white hover:bg-[#f5f5f5] text-[11px]"
                      >
                        글 보기
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
