import { ComplaintStatus, STATUS_MAP } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status as ComplaintStatus] || STATUS_MAP.PENDING;

  // 사진의 '발표구분(안내/공고)' 컬럼 스타일처럼 깔끔한 텍스트 컬러 강조 방식
  const colorStyle =
    status === "RESOLVED"
      ? "text-[#1d6fa5] font-semibold"
      : status === "IN_PROGRESS"
      ? "text-[#e66b19] font-semibold"
      : "text-[#777777]";

  return <span className={`text-[13px] ${colorStyle}`}>{info.label}</span>;
}
