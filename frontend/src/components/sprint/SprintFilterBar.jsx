import { Search } from "lucide-react";
const filters = [
  ["ALL", "전체"],
  ["ACTIVE", "진행 중"],
  ["PLANNING", "계획됨"],
  ["COMPLETED", "완료"],
];
export default function SprintFilterBar({ value, query, onFilter, onQuery }) {
  return (
    <section className="sprintFilter">
      <div>
        {filters.map(([key, label]) => (
          <button
            type="button"
            className={value === key ? "active" : ""}
            aria-pressed={value === key}
            onClick={() => onFilter(key)}
            key={key}
          >
            {label}
          </button>
        ))}
      </div>
      <label>
        <Search size={17} />
        <input
          aria-label="스프린트 검색"
          value={query}
          placeholder="스프린트 검색..."
          onChange={(e) => onQuery(e.target.value)}
        />
      </label>
      {/* "필터" 버튼은 기능이 없어서 뺐어요(상태 탭과 검색으로 걸러요). */}
    </section>
  );
}
