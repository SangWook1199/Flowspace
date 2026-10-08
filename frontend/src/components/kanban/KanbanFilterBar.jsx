import { useEffect, useMemo, useRef, useState } from "react";
import { ListFilter, Search, X } from "lucide-react";

import {
  DUE_OPTIONS,
  EMPTY_FILTERS,
  PRIORITY_OPTIONS,
  SUBTASK_OPTIONS,
  countActiveFilters,
} from "./kanbanUtils";

// 칸반 위쪽의 검색·필터 줄이에요. 필터는 지라처럼 "필터" 버튼을 누르면 열리는 패널에서 고르고,
// 왼쪽에서 항목(담당자·우선순위 …)을 고르면 오른쪽에 그 항목의 값이 체크박스로 나와요.
// 항목끼리는 모두 함께(AND) 적용되고, 한 항목 안에서 여러 값을 고르면 "하나라도 맞으면" 보여줘요.
export default function KanbanFilterBar({ filters, onChange, members = [], meId = null, statuses = [], shownCount, totalCount }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const active = countActiveFilters(filters);
  const meIsActive = filters.assignees.includes("me");

  const toggleMine = () =>
    set({ assignees: meIsActive ? filters.assignees.filter((value) => value !== "me") : [...filters.assignees, "me"] });

  return (
    <div className="filterBar" role="search" aria-label="칸반 검색과 필터">
      <label className="filterSearch">
        <Search size={15} />
        <input
          type="search"
          placeholder="제목, 번호, 설명, 담당자, 하위 작업 검색"
          aria-label="작업 검색"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
        />
        {filters.query && (
          <button type="button" aria-label="검색어 지우기" onClick={() => set({ query: "" })}>
            <X size={14} />
          </button>
        )}
      </label>

      <FilterPanel filters={filters} onChange={onChange} members={members} meId={meId} statuses={statuses} />

      <button
        type="button"
        className={`filterBtn${meIsActive ? " is-active" : ""}`}
        aria-pressed={meIsActive}
        onClick={toggleMine}
      >
        내 작업
      </button>

      {active > 0 && (
        <button type="button" className="filterBtn" onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}>
          필터 지우기
        </button>
      )}

      <div className="filterBar__right">
        {(active > 0 || filters.query.trim()) && (
          <span className="filterBar__count" role="status">
            {shownCount}/{totalCount}개 표시
          </span>
        )}
      </div>
    </div>
  );
}

// "필터" 버튼과 그 아래에 열리는 패널이에요.
function FilterPanel({ filters, onChange, members, meId, statuses }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("assignees"); // 오른쪽에 보여줄 항목
  const [optionQuery, setOptionQuery] = useState("");
  const wrapRef = useRef(null);

  // 항목마다: 이름, 고를 수 있는 값 목록.
  const fields = useMemo(() => {
    const assigneeOptions = [
      { value: "me", label: "나" },
      { value: "none", label: "미배정" },
      ...members.filter((member) => member.id !== meId).map((member) => ({ value: member.id, label: member.name })),
    ];
    return {
      assignees: { label: "담당자", options: assigneeOptions },
      priorities: { label: "우선순위", options: PRIORITY_OPTIONS },
      dues: { label: "마감", options: DUE_OPTIONS },
      statuses: { label: "상태", options: statuses.map((status) => ({ value: status.id, label: status.name })) },
      subtasks: { label: "하위 작업", options: SUBTASK_OPTIONS },
    };
  }, [members, meId, statuses]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const fieldKeys = Object.keys(fields);
  const active = countActiveFilters(filters);

  const field = fields[current];
  const picked = filters[current];
  const shownOptions = field.options.filter((option) => option.label.toLowerCase().includes(optionQuery.trim().toLowerCase()));

  const selectField = (key) => {
    setCurrent(key);
    setOptionQuery("");
  };
  const toggleValue = (value) =>
    onChange({ ...filters, [current]: picked.includes(value) ? picked.filter((item) => item !== value) : [...picked, value] });
  const clearCurrent = () => onChange({ ...filters, [current]: [] });
  const clearAll = () => onChange({ ...EMPTY_FILTERS, query: filters.query });

  return (
    <div className="filterMenu" ref={wrapRef}>
      <button
        type="button"
        className={`filterBtn${active ? " is-active" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <ListFilter size={15} />
        필터
        {active > 0 && <b>{active}</b>}
      </button>

      {open && (
        <div className="filterPanel" role="dialog" aria-label="필터">
          <div className="filterPanel__fields">
            <ul>
              {fieldKeys.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className={key === current ? "is-current" : ""}
                    aria-current={key === current}
                    onClick={() => selectField(key)}
                  >
                    {fields[key].label}
                    {filters[key].length > 0 && <b>{filters[key].length}</b>}
                  </button>
                </li>
              ))}
            </ul>

            <button type="button" className="filterPanel__clearAll" disabled={active === 0} onClick={clearAll}>
              모두 지우기
            </button>
          </div>

          <div className="filterPanel__values">
            <label className="filterSearch">
              <Search size={15} />
              <input
                type="search"
                placeholder={`${field.label} 검색`}
                aria-label={`${field.label} 검색`}
                value={optionQuery}
                onChange={(e) => setOptionQuery(e.target.value)}
              />
            </label>

            <ul className="filterPanel__options" aria-label={`${field.label} 값`}>
              {shownOptions.length === 0 && <li className="filterPanel__empty">{field.label} 항목이 없어요.</li>}
              {shownOptions.map((option) => (
                <li key={String(option.value)}>
                  <label>
                    <input type="checkbox" checked={picked.includes(option.value)} onChange={() => toggleValue(option.value)} />
                    <span>{option.label}</span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="filterPanel__foot">
              <button type="button" disabled={picked.length === 0} onClick={clearCurrent}>
                지우기
              </button>
              <span>
                {picked.length}/{field.options.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
