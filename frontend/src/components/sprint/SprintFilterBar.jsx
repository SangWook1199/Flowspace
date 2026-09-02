import { Filter, Search } from "lucide-react";
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
            className={value === key ? "active" : ""}
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
          value={query}
          placeholder="스프린트 검색..."
          onChange={(e) => onQuery(e.target.value)}
        />
      </label>
      <button className="filterButton">
        <Filter size={16} /> 필터
      </button>
    </section>
  );
}
