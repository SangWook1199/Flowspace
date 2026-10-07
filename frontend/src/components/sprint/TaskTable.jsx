import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import TaskRow from "./TaskRow";
import styles from "./TaskWorkspace.module.css";
export default function TaskTable({
  tasks,
  sprintRange = null,
  selectedId,
  checkedIds,
  onCheck,
  onSelect,
  onAdd,
}) {
  const allChecked = tasks.length > 0 && checkedIds.length === tasks.length;
  const toggleAll = () => onCheck("ALL");
  // 세부 작업은 한 번에 한 작업만 펼쳐져요(스프린트 상세 목록과 같아요).
  const [openId, setOpenId] = useState(null);
  const toggleOpen = (id) => setOpenId((prev) => (prev === id ? null : id));
  // 새 작업은 이름을 입력해서 만들어요(Enter 또는 추가 버튼, Esc/취소로 닫기).
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  // 만들기에 성공했을 때만 입력을 비워요. 실패하면 이름이 그대로 남아 다시 시도할 수 있어요.
  const [submitting, setSubmitting] = useState(false);
  const submitNew = async (e) => {
    e.preventDefault();
    const value = title.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    try {
      if (await onAdd(value)) setTitle("");
    } finally {
      setSubmitting(false);
    }
  };
  const closeNew = () => {
    setAdding(false);
    setTitle("");
  };
  // 입력칸 바깥을 눌러도 "취소"를 누른 것과 똑같이 닫혀요.
  const addFormRef = useRef(null);
  useEffect(() => {
    if (!adding) return undefined;
    const onPointerDown = (e) => {
      if (!addFormRef.current?.contains(e.target)) closeNew();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adding]);
  return (
    <section className={styles.tableWrap}>
      <table>
        <thead>
          <tr>
            <th aria-label="세부 작업 펼치기" />
            <th>
              <input
                type="checkbox"
                checked={allChecked}
                aria-label="전체 선택"
                onChange={toggleAll}
              />
            </th>
            <th>번호</th>
            <th>제목</th>
            <th>담당자</th>
            <th>우선순위</th>
            <th>시작일</th>
            <th>마감일</th>
            <th>하위 작업</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <TaskRow
              task={task}
              key={task.id}
              checked={checkedIds.includes(task.id)}
              selected={selectedId === task.id}
              open={openId === task.id}
              sprintRange={sprintRange}
              onToggleOpen={toggleOpen}
              onCheck={onCheck}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
      {adding ? (
        <form className={styles.addTaskForm} ref={addFormRef} onSubmit={submitNew}>
          <input
            autoFocus
            aria-label="새 작업 이름"
            placeholder="작업 이름을 입력하고 Enter"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeNew();
            }}
          />
          <button type="submit" disabled={!title.trim() || submitting}>
            추가
          </button>
          <button type="button" onClick={closeNew}>
            취소
          </button>
        </form>
      ) : (
        <button type="button" className={styles.addTask} onClick={() => setAdding(true)}>
          <Plus size={18} /> 새 작업 추가
        </button>
      )}
      <footer>전체 {tasks.length}개 작업</footer>
    </section>
  );
}
