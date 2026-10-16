import { useEffect, useState } from "react";
import { CalendarDays, Info, Plus, Trash2, X } from "lucide-react";

import FormActions from "../sprint/FormActions";

import useDialog from "../../context/useDialog";
import {
  AI_LIMITS,
  addSubtask,
  countDraft,
  isRangeInvalid,
  removeEvent,
  removeSprint,
  removeSubtask,
  removeTask,
  toApplyBody,
  toEditableDraft,
  updateEvent,
  updateSprint,
  updateSubtask,
  updateTask,
  validateDraft,
} from "../../utils/aiDraft";
import { getErrorMessage } from "../../utils/apiError";
import { PRIORITY_LABEL } from "../../utils/priority";

// AI가 만든 초안을 확인하고 고치는 화면이에요. 고칠 수 있는 건 이름·목표·기간, 작업의 제목·설명·담당자·중요도·기간이고,
// 스프린트·작업·일정은 지울 수 있어요(새 작업 추가는 만든 뒤 스프린트 화면에서 해요).
//   initialDraft: 서버 초안, members: 담당자로 고를 수 있는 워크스페이스 멤버
//   onApply(body): 만들기(Promise, 실패하면 예외), onDiscard(): 처음부터 다시
export default function AiDraftPreview({ initialDraft, members, onApply, onDiscard }) {
  const { confirm } = useDialog();
  const [draft, setDraft] = useState(() => toEditableDraft(initialDraft));
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");

  const counts = countDraft(draft);
  const problem = validateDraft(draft);

  // 만들기 전에 탭을 닫거나 새로고침하면 고친 내용이 사라져요. 브라우저 기본 경고를 띄워요.
  useEffect(() => {
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const apply = async (event) => {
    event.preventDefault();
    if (problem || applying) return;

    const ok = await confirm({
      title: "스프린트 만들기",
      message: `스프린트 ${counts.sprints}개, 작업 ${counts.tasks}개(하위 작업 ${counts.subtasks}개), 일정 ${counts.events}개를 만들어요.\n만든 뒤에는 한 번에 되돌릴 수 없고, 스프린트마다 지워야 해요.`,
      confirmLabel: "만들기",
    });
    if (!ok) return;

    setApplying(true);
    setMessage("");

    try {
      await onApply(toApplyBody(draft));
    } catch (err) {
      setMessage(getErrorMessage(err, "스프린트를 만들지 못했어요."));
      setApplying(false);
    }
  };

  const discard = async () => {
    const ok = await confirm({
      title: "처음부터 다시",
      message: "지금 고친 내용이 사라지고 입력 화면으로 돌아가요.",
      confirmLabel: "처음부터 다시",
      danger: true,
    });
    if (ok) onDiscard();
  };

  const dropSprint = async (sprint) => {
    if (sprint.tasks.length > 0) {
      const ok = await confirm({
        title: "스프린트 지우기",
        message: `'${sprint.name}'과 안의 작업 ${sprint.tasks.length}개를 초안에서 지워요.`,
        confirmLabel: "지우기",
        danger: true,
      });
      if (!ok) return;
    }
    setDraft((current) => removeSprint(current, sprint.key));
  };

  return (
    <form className="aiPreview" onSubmit={apply}>
      <p className="aiNotice info">
        <Info size={16} />
        <span>
          AI가 만든 초안이에요. 내용이 맞는지 꼭 확인하고, 고칠 곳은 고치거나 지워 주세요. 새 작업은 만든 뒤 스프린트 화면에서 추가할 수 있어요.
        </span>
      </p>

      <div className="aiCounts">
        <span>
          스프린트 <b>{counts.sprints}</b>개
        </span>
        <span>
          작업 <b>{counts.tasks}</b>개
        </span>
        <span>
          하위 작업 <b>{counts.subtasks}</b>개
        </span>
        <span>
          일정 <b>{counts.events}</b>개
        </span>
      </div>

      {draft.sprints.map((sprint, index) => (
        <section className="aiSprint" key={sprint.key}>
          <header>
            <span className="aiSprintNo">{index + 1}</span>
            <input
              className="aiSprintName"
              maxLength={100}
              value={sprint.name}
              aria-label={`스프린트 ${index + 1} 이름`}
              onChange={(e) => setDraft(updateSprint(draft, sprint.key, { name: e.target.value }))}
            />
            <DateRange
              start={sprint.startDate}
              end={sprint.endDate}
              label={`스프린트 ${index + 1}`}
              onChange={(patch) => setDraft(updateSprint(draft, sprint.key, patch))}
            />
            <button type="button" className="aiIconButton" aria-label={`스프린트 ${index + 1} 지우기`} onClick={() => dropSprint(sprint)}>
              <Trash2 size={16} />
            </button>
          </header>

          <input
            className="aiSprintGoal"
            maxLength={500}
            value={sprint.goal}
            placeholder="스프린트 목표"
            aria-label={`스프린트 ${index + 1} 목표`}
            onChange={(e) => setDraft(updateSprint(draft, sprint.key, { goal: e.target.value }))}
          />

          <div className="aiTaskScroll">
            <div className="aiTaskTable">
              <div className="aiTaskHead">
                <span>작업</span>
                <span>담당자</span>
                <span>중요도</span>
                <span>기간</span>
                <span />
              </div>

              {sprint.tasks.length === 0 && <p className="aiEmptyRow">작업이 없어요.</p>}

              {sprint.tasks.map((task) => (
                <div className="aiTaskRow" key={task.key}>
                  <div className="aiTaskTitle">
                    <input
                      maxLength={200}
                      value={task.title}
                      aria-label="작업 제목"
                      onChange={(e) => setDraft(updateTask(draft, sprint.key, task.key, { title: e.target.value }))}
                    />
                    <details>
                      <summary>설명{task.description ? "" : " 없음"}</summary>
                      <textarea
                        rows={2}
                        maxLength={2000}
                        value={task.description}
                        aria-label="작업 설명"
                        onChange={(e) => setDraft(updateTask(draft, sprint.key, task.key, { description: e.target.value }))}
                      />
                    </details>
                    <details>
                      <summary>하위 작업 {(task.subtasks ?? []).length}개</summary>
                      <div className="aiSubtaskList">
                        {(task.subtasks ?? []).map((subtask) => (
                          <div className="aiSubtaskItem" key={subtask.key}>
                            <input
                              maxLength={AI_LIMITS.MAX_SUBTASK_LENGTH}
                              value={subtask.content}
                              aria-label="하위 작업"
                              onChange={(e) => setDraft(updateSubtask(draft, sprint.key, task.key, subtask.key, e.target.value))}
                            />
                            <button
                              type="button"
                              className="aiIconButton"
                              aria-label="하위 작업 지우기"
                              onClick={() => setDraft(removeSubtask(draft, sprint.key, task.key, subtask.key))}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {(task.subtasks ?? []).length < AI_LIMITS.MAX_SUBTASKS && (
                          <button type="button" className="aiSubtaskAdd" onClick={() => setDraft(addSubtask(draft, sprint.key, task.key))}>
                            <Plus size={13} /> 하위 작업 추가
                          </button>
                        )}
                      </div>
                    </details>
                  </div>

                  <select
                    value={task.assigneeUserId ?? ""}
                    aria-label="담당자"
                    onChange={(e) =>
                      setDraft(updateTask(draft, sprint.key, task.key, { assigneeUserId: e.target.value ? Number(e.target.value) : null }))
                    }
                  >
                    <option value="">담당자 없음</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className={`aiPriority ${task.priority}`}
                    value={task.priority}
                    aria-label="중요도"
                    onChange={(e) => setDraft(updateTask(draft, sprint.key, task.key, { priority: e.target.value }))}
                  >
                    {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <DateRange
                    start={task.startDate}
                    end={task.endDate}
                    label="작업"
                    onChange={(patch) => setDraft(updateTask(draft, sprint.key, task.key, patch))}
                  />

                  <button
                    type="button"
                    className="aiIconButton"
                    aria-label={`'${task.title}' 지우기`}
                    onClick={() => setDraft(removeTask(draft, sprint.key, task.key))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="aiSprint">
        <header>
          <CalendarDays size={18} />
          <h2 className="aiEventsTitle">캘린더에 들어갈 일정</h2>
        </header>

        {draft.events.length === 0 && <p className="aiEmptyRow">만들 일정이 없어요.</p>}

        {draft.events.map((event) => (
          <div className="aiEventRow" key={event.key}>
            <input
              maxLength={200}
              value={event.title}
              aria-label="일정 이름"
              onChange={(e) => setDraft(updateEvent(draft, event.key, { title: e.target.value }))}
            />
            <input
              type="date"
              value={event.date}
              aria-label="일정 날짜"
              onChange={(e) => setDraft(updateEvent(draft, event.key, { date: e.target.value }))}
            />
            <button
              type="button"
              className="aiIconButton"
              aria-label={`'${event.title}' 일정 지우기`}
              onClick={() => setDraft(removeEvent(draft, event.key))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <p className="aiHint">스프린트 리뷰는 스프린트가 끝나는 날에 자동으로 넣었어요. 필요 없으면 지워 주세요.</p>
      </section>

      {(message || problem) && <p className="formMessage aiError">{message || problem}</p>}

      <FormActions
        onCancel={discard}
        cancelLabel="처음부터 다시"
        submitLabel={applying ? "만드는 중…" : `스프린트 ${counts.sprints}개 만들기`}
        disabled={Boolean(problem) || applying}
      />
    </form>
  );
}

// 시작일 ~ 종료일 입력(순서가 뒤집히면 빨갛게 표시하고, 만들기 버튼이 막혀요).
function DateRange({ start, end, label, onChange }) {
  const invalid = isRangeInvalid(start, end);

  return (
    <span className={`aiDateRange${invalid ? " invalid" : ""}`}>
      <input type="date" value={start} aria-label={`${label} 시작일`} aria-invalid={invalid || undefined} onChange={(e) => onChange({ startDate: e.target.value })} />
      <i>~</i>
      <input type="date" value={end} min={start} aria-label={`${label} 종료일`} aria-invalid={invalid || undefined} onChange={(e) => onChange({ endDate: e.target.value })} />
    </span>
  );
}
