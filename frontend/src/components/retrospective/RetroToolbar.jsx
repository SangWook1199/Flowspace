import { Search } from "lucide-react";

const tabs = [
  { value: "all", label: "전체" },
  { value: "completed", label: "완료" },
  { value: "progress", label: "진행 중" },
  { value: "planned", label: "예정" },
];

export default function RetroToolbar({
  tab,
  keyword,
  onTabChange,
  onKeywordChange,
}) {
  return (
    <section className="retro-toolbar">
      <div className="retro-tabs">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            className={tab === item.value ? "active" : ""}
            aria-pressed={tab === item.value}
            onClick={() => onTabChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="retro-search">
        <Search size={17} />
        <input
          type="text"
          aria-label="회고 검색"
          placeholder="회고 검색..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </label>
    </section>
  );
}
