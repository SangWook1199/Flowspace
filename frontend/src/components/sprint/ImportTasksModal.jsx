import { useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import useModalA11y from "../kanban/hooks/useModalA11y";
import useDialog from "../../context/useDialog";

// 스프린트 상세의 "가져오기": 백로그나 끝나지 않은 다른 스프린트의 작업을 골라서 이 스프린트로 옮겨요.
//
// - sprint: 작업을 가져올 (지금 보고 있는) 스프린트
// - groups: [{ key, name, isBacklog, tasks: [{ id, title, status, statusName, assignees }] }] — 가져올 수 있는 곳별 작업 목록
// - onImport(taskIds): 고른 작업을 이 스프린트로 옮기는 일은 부모가 해요(복사가 아니라 이동이에요).
export default function ImportTasksModal({ sprint, groups, onClose, onImport }) {
  const modalRef = useRef(null);
  const { confirm } = useDialog();
  const uid = useId();
  const titleId = `${uid}-title`;
  const [checked, setChecked] = useState(() => new Set());

  useModalA11y(modalRef, onClose);

  const total = groups.reduce((sum, group) => sum + group.tasks.length, 0);

  // 고른 작업을 출처별로 세어 둬요(확인창 문구에 써요).
  const pickedByGroup = useMemo(
    () =>
      groups
        .map((group) => ({ group, count: group.tasks.filter((task) => checked.has(task.id)).length }))
        .filter((item) => item.count > 0),
    [groups, checked],
  );

  const toggle = (id) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGroup = (group) =>
    setChecked((prev) => {
      const next = new Set(prev);
      const allChecked = group.tasks.every((task) => next.has(task.id));
      group.tasks.forEach((task) => (allChecked ? next.delete(task.id) : next.add(task.id)));
      return next;
    });

  const handleSubmit = async () => {
    if (checked.size === 0) return;

    // 다른 스프린트에서 오는 작업은 원래 스프린트에서 사라지니까 한 번 알려줘요(백로그에서 가져올 땐 묻지 않아요).
    const fromSprints = pickedByGroup.filter((item) => !item.group.isBacklog);
    if (fromSprints.length > 0) {
      const detail = fromSprints.map(({ group, count }) => `“${group.name}” ${count}개`).join(", ");
      const ok = await confirm({
        title: "작업 가져오기",
        message: `${detail}는 원래 스프린트에서 이 스프린트로 이동돼요.\n가져올까요?`,
        confirmLabel: "가져오기",
      });
      if (!ok) return;
    }

    onImport([...checked]);
  };

  return (
    <div className="modalOverlay">
      <div
        className="statusModal importModal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="statusModalHeader">
          <div>
            <h2 id={titleId}>작업 가져오기</h2>
            <p>“{sprint.name}”(으)로 옮길 작업을 골라 주세요.</p>
          </div>

          <button type="button" className="closeBtn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="importModal__body">
          {total === 0 ? (
            <p className="importModal__empty">가져올 수 있는 작업이 없어요.</p>
          ) : (
            groups
              .filter((group) => group.tasks.length > 0)
              .map((group) => {
                const allChecked = group.tasks.every((task) => checked.has(task.id));

                return (
                  <section key={group.key} className="importModal__group">
                    <header>
                      <label>
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={() => toggleGroup(group)}
                          aria-label={`${group.name} 작업 전체 선택`}
                        />
                        <strong>{group.name}</strong>
                        <span>{group.tasks.length}개</span>
                      </label>
                    </header>

                    <ul>
                      {group.tasks.map((task) => (
                        <li key={task.id}>
                          <label>
                            <input type="checkbox" checked={checked.has(task.id)} onChange={() => toggle(task.id)} />
                            <span className="importModal__title">{task.title || "제목 없음"}</span>
                            <span className="importModal__assignees">
                              {(task.assignees ?? []).map((assignee, index) => {
                                const name = typeof assignee === "string" ? assignee : assignee?.name;
                                return (
                                  <i key={`${name}-${index}`} title={name}>
                                    {typeof assignee === "string" ? assignee[0] : (assignee?.initial ?? name?.[0])}
                                  </i>
                                );
                              })}
                            </span>
                            <em className={`importModal__status ${String(task.status).toLowerCase()}`}>
                              {task.statusName ?? ""}
                            </em>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })
          )}
        </div>

        <div className="importModal__footer">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" disabled={checked.size === 0} onClick={handleSubmit}>
            {checked.size}개 가져오기
          </button>
        </div>
      </div>
    </div>
  );
}
