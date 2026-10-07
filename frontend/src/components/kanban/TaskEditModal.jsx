import { useEffect } from "react";

import TaskDetailPanel from "../sprint/TaskDetailPanel";

// 작업의 우선순위는 공용 모델에서는 영문 enum이고, 상세 패널은 한글 라벨을 기대해서 여기서만 서로 바꿔요
// (스프린트 작업 페이지와 같은 방식이에요).
const PRIORITY_LABEL = { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" };
const PRIORITY_KO_TO_EN = { 높음: "HIGH", 보통: "MEDIUM", 낮음: "LOW" };

// 칸반 카드를 눌렀을 때 뜨는 작업 편집 창이에요. 작업 페이지의 오른쪽 상세 패널(TaskDetailPanel)을 그대로
// 모달 안에 보여줘서, 제목·담당자·우선순위·기간·설명·하위 작업·댓글을 똑같이 고칠 수 있어요.
// 값은 바로 공용 작업 데이터에 반영돼서(서버 저장은 잠깐 기다렸다가 한 번에 해요) 보드 카드도 같이 바뀌어요.
export default function TaskEditModal({
  task,
  sprintRange = null,
  members = [],
  statuses = [],
  onClose,
  onMoveStatus,
  onUpdateTask,
  onToggleSubtask,
  onAddSubtask,
  onRenameSubtask,
  onDeleteSubtask,
  onAssignSubtask,
  onMoveSubtask,
  onDelete,
}) {
  // Esc로 닫아요. (확인 창이 떠 있을 땐 그쪽이 먼저 받아요.)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const panelTask = { ...task, priority: PRIORITY_LABEL[task.priority] ?? task.priority };

  return (
    <div
      className="taskModalOverlay"
      onMouseDown={(e) => {
        // 바깥(어두운 배경)을 누르면 닫혀요.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="taskModal" role="dialog" aria-modal="true" aria-label="작업 편집">
        <TaskDetailPanel
          task={panelTask}
          sprintRange={sprintRange}
          members={members}
          statuses={statuses}
          onStatusChange={(statusId) => statusId !== task.statusId && onMoveStatus?.(task.id, statusId)}
          selectedIds={[]}
          onChange={(key, value) =>
            onUpdateTask(task.id, key === "priority" ? { priority: PRIORITY_KO_TO_EN[value] ?? value } : { [key]: value })
          }
          onClose={onClose}
          onAddSubtask={(text) => onAddSubtask(task.id, [text])}
          onToggleSubtask={(index) => onToggleSubtask(task.id, index)}
          onRenameSubtask={(subtaskId, text) => onRenameSubtask(task.id, subtaskId, text)}
          onDeleteSubtask={(index) => {
            const subtask = task.subtasks?.[index];
            if (subtask) onDeleteSubtask(task.id, subtask.id);
          }}
          onAssignSubtask={(subtaskId, assigneeId) => onAssignSubtask(task.id, subtaskId, assigneeId)}
          onMoveSubtask={(from, to) => onMoveSubtask(task.id, from, to)}
          onBatchChange={() => {}}
          onDelete={() => {}}
          onDeleteTask={onDelete}
        />
      </div>
    </div>
  );
}
