import { useState } from "react";
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
      <button type="button" className={styles.addTask} onClick={onAdd}>
        <Plus size={18} /> 새 작업 추가
      </button>
      <footer>전체 {tasks.length}개 작업</footer>
    </section>
  );
}
