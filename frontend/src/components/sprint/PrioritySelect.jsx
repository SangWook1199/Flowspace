import { useCallback, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import useDismiss from "./useDismiss";
import styles from "./TaskWorkspace.module.css";

// 우선순위(한글 라벨)와 왼쪽에 붙는 색이에요(높음=빨강, 보통=주황, 낮음=초록).
const OPTIONS = [
  { label: "높음", tone: "high" },
  { label: "보통", tone: "medium" },
  { label: "낮음", tone: "low" },
];

// 색 점이 있는 우선순위 선택 상자예요. emptyLabel을 주면 "아직 안 고름" 상태(일괄 편집의 "변경 안 함")를 보여줘요.
export default function PrioritySelect({ value, onChange, emptyLabel }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, wrapRef, close);

  const current = OPTIONS.find((option) => option.label === value);

  const pick = (label) => {
    setOpen(false);
    if (label !== value) onChange(label);
  };

  return (
    <div className={styles.prioWrap} ref={wrapRef}>
      <button type="button" className={styles.prioBtn} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((prev) => !prev)}>
        {current ? (
          <>
            <i className={`${styles.dot} ${styles[current.tone]}`} />
            {current.label}
          </>
        ) : (
          <span className={styles.prioEmpty}>{emptyLabel ?? "선택"}</span>
        )}
        <ChevronDown size={15} />
      </button>

      {open && (
        <ul className={styles.pickerMenu} role="listbox" aria-label="우선순위">
          {OPTIONS.map((option) => (
            <li key={option.label} role="option" aria-selected={option.label === value}>
              <button type="button" className={option.label === value ? styles.picked : ""} onClick={() => pick(option.label)}>
                <i className={`${styles.dot} ${styles[option.tone]}`} />
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
