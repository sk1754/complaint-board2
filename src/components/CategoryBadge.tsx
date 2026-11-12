import { BOARD_MAP, BoardType } from "@/lib/constants";

export function CategoryBadge({ board }: { board: string }) {
  const info = BOARD_MAP[board as BoardType] || BOARD_MAP.COMP;
  return (
    <span className="text-[13px] text-[#555555] font-normal">
      {info.shortName}
    </span>
  );
}
