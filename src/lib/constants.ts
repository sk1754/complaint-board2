export type DeptType = "COMP" | "AERO" | "MECHA" | "INFO";
export type BoardType = "COMMON" | DeptType;
export type UserRole = "USER" | "DEPT_ADMIN" | "SUPER_ADMIN";
export type QuestionStatus = "WAITING" | "ANSWERED" | "RESOLVED";
export type QuestionStatusType = QuestionStatus;
export type ReportStatus = "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED";
export type ReportStatusType = ReportStatus;

export const BOARD_MAP: Record<
  BoardType,
  {
    code: BoardType;
    name: string;
    shortName: string;
    fullName: string;
    roomInfo: string;
    tel: string;
  }
> = {
  COMMON: {
    code: "COMMON",
    name: "제2공학관 공통 게시판",
    shortName: "2공학관 공통",
    fullName: "제2공학관 공통 게시판",
    roomInfo: "제2공학관 1층 통합행정실 (101호)",
    tel: "02-1234-2000",
  },
  COMP: {
    code: "COMP",
    name: "컴퓨터전자공학과",
    shortName: "컴전과",
    fullName: "컴퓨터전자공학과",
    roomInfo: "제2공학관 3층 학과사무실 (301호)",
    tel: "02-1234-3010",
  },
  AERO: {
    code: "AERO",
    name: "항공기계·운항과",
    shortName: "항공과",
    fullName: "항공기계·운항과",
    roomInfo: "제2공학관 2층 학과사무실 (201호)",
    tel: "02-1234-2010",
  },
  MECHA: {
    code: "MECHA",
    name: "메카트로닉스공학과",
    shortName: "메카과",
    fullName: "메카트로닉스공학과",
    roomInfo: "제2공학관 3층 학과사무실 (305호)",
    tel: "02-1234-3050",
  },
  INFO: {
    code: "INFO",
    name: "정보통신공학과",
    shortName: "정통과",
    fullName: "정보통신공학과",
    roomInfo: "제2공학관 4층 학과사무실 (401호)",
    tel: "02-1234-4010",
  },
};

export const DEPTS: DeptType[] = ["COMP", "AERO", "MECHA", "INFO"];
export const BOARDS: BoardType[] = ["COMMON", "COMP", "AERO", "MECHA", "INFO"];

export const ROLE_MAP: Record<UserRole, string> = {
  USER: "일반 회원",
  DEPT_ADMIN: "학과 관리자",
  SUPER_ADMIN: "전체 관리자",
};

export const QUESTION_STATUS_MAP: Record<
  QuestionStatus,
  {
    label: string;
    badgeClass: string;
    bgClass: string;
    colorClass: string;
  }
> = {
  WAITING: {
    label: "답변 대기",
    badgeClass: "bg-[#f2f2f2] text-[#666666] border border-[#cccccc]",
    bgClass: "bg-[#f2f2f2] border border-[#cccccc]",
    colorClass: "text-[#666666]",
  },
  ANSWERED: {
    label: "답변 등록",
    badgeClass: "bg-[#f0f7fc] text-[#1d6fa5] border border-[#a8d1f0]",
    bgClass: "bg-[#f0f7fc] border border-[#a8d1f0]",
    colorClass: "text-[#1d6fa5]",
  },
  RESOLVED: {
    label: "해결 완료",
    badgeClass: "bg-[#ebfbee] text-[#2b8a3e] border border-[#b2f2bb]",
    bgClass: "bg-[#ebfbee] border border-[#b2f2bb]",
    colorClass: "text-[#2b8a3e]",
  },
};

export const REPORT_STATUS_MAP: Record<
  ReportStatus,
  { label: string; bgClass: string; colorClass: string }
> = {
  PENDING: {
    label: "접수",
    bgClass: "bg-[#fff4e6] border border-[#ffd8a8]",
    colorClass: "text-[#e66b19] font-bold",
  },
  REVIEWING: {
    label: "검토 중",
    bgClass: "bg-[#e7f5ff] border border-[#a5d8ff]",
    colorClass: "text-[#1d6fa5] font-bold",
  },
  RESOLVED: {
    label: "완료",
    bgClass: "bg-[#ebfbee] border border-[#b2f2bb]",
    colorClass: "text-[#2b8a3e] font-bold",
  },
  REJECTED: {
    label: "반려",
    bgClass: "bg-[#f1f3f5] border border-[#dee2e6]",
    colorClass: "text-[#888888]",
  },
};

// 4단계 첨부파일 제한 상수
export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".zip",
  ".docx",
  ".xlsx",
  ".pptx",
  ".hwp",
  ".csv",
];
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 파일당 최대 2MB
export const MAX_FILES_PER_POST = 3; // 게시글당 최대 3개

export interface UploadedAttachmentInput {
  fileName: string;
  mimeType: string;
  fileSize: number;
  dataBase64: string;
}

export function validateAttachments(
  files: UploadedAttachmentInput[],
  existingCount = 0
): string | null {
  if (existingCount + files.length > MAX_FILES_PER_POST) {
    return `업로드 제한 초과: 첨부파일은 게시글당 최대 ${MAX_FILES_PER_POST}개까지만 등록할 수 있습니다.`;
  }

  for (const file of files) {
    const ext = ("." + (file.fileName.split(".").pop() || "")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `업로드 제한 초과: 허용되지 않는 파일 형식(${ext})입니다. 허용 확장자: ${ALLOWED_EXTENSIONS.join(
        ", "
      )}`;
    }
    if (file.fileSize > MAX_FILE_SIZE_BYTES) {
      return `업로드 제한 초과: '${file.fileName}' 파일 용량이 최대 허용 용량(2MB)을 초과했습니다.`;
    }
  }
  return null;
}
