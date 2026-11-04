import { CATEGORY_MAP, ComplaintCategory } from "@/lib/constants";

export function CategoryBadge({ category }: { category: string }) {
  const info = CATEGORY_MAP[category as ComplaintCategory] || CATEGORY_MAP.OTHER;

  return (
    <span className="text-[13px] text-[#555555] font-normal">
      {info.label}
    </span>
  );
}
