import { useRef, useState } from "react";

// 카드 안 하위 작업 목록이에요. onToggle(index)이 있으면 체크박스를 눌러 바로 완료/미완료로 바꿔요.
// adding이 true인 동안은 맨 아래에 입력칸이 나와서 이름을 쓰고 Enter로 추가해요(성공하면 입력을 비우고 계속 추가할 수 있어요).
// Esc를 누르면 onCancelAdd를 불러요(입력칸 바깥을 누르는 건 부른 쪽이 처리해요).
export default function SubtaskList({ subtasks = [], onToggle, onAdd, adding = false, onCancelAdd }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      if ((await onAdd?.(value)) !== false) setText("");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="subtaskList">
      {subtasks.map((subtask, index) => (
        <label key={subtask.id ?? `${subtask.text}-${index}`} className="subtaskItem">
          <input
            type="checkbox"
            checked={Boolean(subtask.checked)}
            disabled={!onToggle}
            onChange={() => onToggle?.(index)}
          />

          <span className={subtask.checked ? "done" : ""}>{subtask.text}</span>
        </label>
      ))}

      {onAdd && adding && (
        <form className="subtaskAdd" onSubmit={submit}>
          <input
            ref={inputRef}
            autoFocus
            aria-label="하위 작업 추가"
            placeholder="하위 작업 추가 (Enter)"
            value={text}
            maxLength={200}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancelAdd?.();
            }}
          />
        </form>
      )}
    </div>
  );
}
