export type ComplaintCategory = "SERVICE" | "FACILITY" | "SYSTEM" | "OTHER";
export type ComplaintStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";

export const CATEGORY_MAP: Record<
  ComplaintCategory,
  { label: string; colorClass: string }
> = {
  SERVICE: {
    label: "서비스/운영",
    colorClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  FACILITY: {
    label: "시설/환경",
    colorClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  SYSTEM: {
    label: "시스템/IT",
    colorClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  OTHER: {
    label: "기타 건의",
    colorClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export const STATUS_MAP: Record<
  ComplaintStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: "접수대기",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
  IN_PROGRESS: {
    label: "처리중",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    dotClass: "bg-blue-500",
  },
  RESOLVED: {
    label: "답변완료",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
};

export const CATEGORIES: ComplaintCategory[] = [
  "SERVICE",
  "FACILITY",
  "SYSTEM",
  "OTHER",
];

export const STATUSES: ComplaintStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "RESOLVED",
];

