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
            className={tab === item.value ? "active" : ""}
            onClick={() => onTabChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="retro-search">
        <Search size={16} />
        <input
          type="text"
          placeholder="Sprint 회고 검색"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </div>
    </section>
  );
}
