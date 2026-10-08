import { useState } from "react";
import { Check } from "lucide-react";

import FloatingPanel from "./FloatingPanel";

const PRIORITIES = [
  { value: "HIGH", label: "높음" },
  { value: "MEDIUM", label: "보통" },
  { value: "LOW", label: "낮음" },
];

// 카드의 우선순위 배지를 눌렀을 때 뜨는 선택 팝업이에요. 고르면 바로 저장하고 닫혀요.
export function PriorityPopover({ anchor, value, onChange, onClose }) {
  return (
    <FloatingPanel anchor={anchor} onClose={onClose} width={150} className="cardQuickPanel" label="우선순위 변경">
      <div role="menu" className="cardMenuList">
        {PRIORITIES.map((item) => (
          <button
            key={item.value}
            type="button"
            role="menuitemradio"
            aria-checked={item.value === value}
            onClick={() => {
              if (item.value !== value) onChange(item.value);
              onClose();
            }}
          >
            <span className={`priority ${item.value.toLowerCase()}`}>{item.label}</span>
            {item.value === value && <Check size={14} />}
          </button>
        ))}
      </div>
    </FloatingPanel>
  );
}

// 카드의 D-day 배지를 눌렀을 때 뜨는 마감일 변경 팝업이에요. 시작일보다 앞선 날짜는 받지 않아요.
// 날짜 입력은 타이핑 중에도 값이 바뀌어서(연도를 치는 동안 0002년 같은 값이 지나가요) 고른 뒤 "적용"을 눌러 저장해요.
export function DuePopover({ anchor, value, minDate, onChange, onClose }) {
  const [draft, setDraft] = useState(value ?? "");

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(draft) && draft >= "1900-01-01" && draft <= "2999-12-31";
  const reversed = valid && Boolean(minDate) && draft < minDate;

  const submit = (e) => {
    e.preventDefault();
    if (!valid || reversed) return;
    if (draft !== value) onChange(draft);
    onClose();
  };

  return (
    <FloatingPanel anchor={anchor} onClose={onClose} width={210} className="cardQuickPanel" label="마감일 변경">
      <form className="cardQuickBody" onSubmit={submit}>
        <label>
          마감일
          <input type="date" autoFocus value={draft} min={minDate || undefined} onChange={(e) => setDraft(e.target.value)} />
        </label>
        {reversed && (
          <small role="alert" className="cardQuickError">
            마감일은 시작일보다 빠를 수 없어요.
          </small>
        )}
        <button type="submit" disabled={!valid || reversed}>
          적용
        </button>
      </form>
    </FloatingPanel>
  );
}
