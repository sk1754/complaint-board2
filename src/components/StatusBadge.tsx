export function StatusBadge({ isNotice }: { isNotice?: boolean }) {
  return isNotice ? (
    <span className="text-[13px] text-[#1d6fa5] font-semibold">공고</span>
  ) : (
    <span className="text-[13px] text-[#777777]">일반</span>
  );
}
