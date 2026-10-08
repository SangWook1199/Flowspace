import { useNavigate } from "react-router-dom";
import { File as FileIcon } from "lucide-react";
import * as eventApi from "../../../api/events";
import { useRequest } from "../../../hooks/useRequest";
import { useWorkspace } from "../../../context/WorkspaceContext";
import { PRIORITY_LABEL } from "../../../utils/priority";

// 우선순위는 영문 enum(HIGH/MEDIUM/LOW)이에요 — 여기선 CSS 클래스용 키만 영문으로 맞추고,
// 배지에 보여줄 한글 라벨은 PRIORITY_LABEL로 가져와요.
const PRIORITY_CLASS = { HIGH: "high", MEDIUM: "medium", LOW: "low" };
const EVENT_COLOR_CLASS = {
  RED: "red",
  ORANGE: "orange",
  GREEN: "green",
  BLUE: "blue",
  PURPLE: "purple",
  PINK: "pink",
  GRAY: "gray",
  WHITE: "white",
};

/* ================= TaskEmbed / EventEmbed =================
   노션에는 없는, FlowSpace만의 블록. 스프린트 태스크·캘린더 이벤트를
   페이지 안에 그대로 가져와서 보여주고 클릭하면 실제 화면으로 이동해요. */


export function TaskEmbed({ taskId, tasks, onChange, onToggleSubtask }) {
  const navigate = useNavigate();
  // taskId(참조)만 블록에 저장하고, 실제 내용은 매번 sprintTasks에서
  // 새로 찾아 그려요 — 스프린트 화면에서 이 태스크를 수정하면(제목,
  // 담당자, 서브태스크 체크 등) 페이지를 다시 열 때 여기도 최신 상태로
  // 보여요. sprintTasks가 상태로 안 올라와 있으면(정적 import 기본값)
  // 체크박스를 눌러도 onToggleSubtask가 없어서 조용히 무시돼요.
  const task = tasks?.find((t) => t.id === taskId) || null;

  if (!task) {
    return (
      <div className="embed-picker">
        <select
          defaultValue=""
          onChange={(e) => {
            const picked = tasks?.find((t) => String(t.id) === e.target.value);
            if (!picked) return;
            onChange(picked.id);
          }}
        >
          <option value="" disabled>
            {tasks?.length ? "연결할 태스크를 선택하세요" : "연결할 태스크가 아직 없어요"}
          </option>
          {tasks?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code ?? t.id} · {t.title}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const priorityClass = PRIORITY_CLASS[task.priority] || "medium";
  const subtasks = task.subtasks || [];
  const doneCount = subtasks.filter((s) => s.checked).length;

  return (
    <div className="embed-task-card">
      <button
        type="button"
        className="embed-task-card__link"
        onClick={() => navigate(`/sprints/${task.sprintId ?? "backlog"}/tasks`)}
        title="태스크로 이동"
      >
        <span className={`embed-priority embed-priority--${priorityClass}`}>
          {PRIORITY_LABEL[task.priority] ?? task.priority}
        </span>
        <span className="embed-task-card__title">{task.title}</span>
        <span className="embed-task-card__meta">
          <span className="embed-task-card__code">{task.code ?? task.id}</span>
          <span className="embed-task-card__assignee">{task.assignees?.[0]?.name}</span>
          {task.dueDate && <span className="embed-task-card__due">~{task.dueDate}</span>}
          {subtasks.length > 0 && (
            <span className="embed-task-card__subtask-count">
              {doneCount}/{subtasks.length}
            </span>
          )}
        </span>
      </button>

      {/* 서브태스크를 스프린트 화면까지 안 가도 여기서 바로 체크할 수
          있게 해요 — sprintTasks가 상위(MainLayout)에서 상태로 관리되면
          이 체크가 스프린트 태스크 목록에도 그대로 반영돼요. */}
      {subtasks.length > 0 && (
        <ul className="embed-task-card__subtasks">
          {subtasks.map((s, i) => (
            <li key={i}>
              <label>
                <input
                  type="checkbox"
                  checked={!!s.checked}
                  onChange={() => onToggleSubtask?.(task.id, i)}
                />
                <span className={s.checked ? "embed-task-card__subtask--done" : ""}>{s.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EventEmbed({ eventId, onChange }) {
  const navigate = useNavigate();
  const { currentWorkspaceId } = useWorkspace();

  // 연결된 일정은 한 건을 서버에서 받아와요(색까지 필요해서). 연결 전이면 선택 목록(제목 검색 전체)을 받아와요.
  const linked = useRequest(() => eventApi.getEvent(eventId), [eventId], { enabled: eventId != null });
  const choices = useRequest(() => eventApi.searchEvents(currentWorkspaceId), [currentWorkspaceId, eventId], {
    enabled: currentWorkspaceId != null && (eventId == null || Boolean(linked.error)),
    initialData: [],
  });

  const event = eventId != null ? linked.data : null;

  if (eventId != null && linked.loading) {
    return (
      <div className="embed-picker" role="status">
        일정을 불러오는 중이에요…
      </div>
    );
  }

  if (!event) {
    const list = choices.data ?? [];

    return (
      <div className="embed-picker">
        {linked.error && <p role="alert">연결된 일정을 불러오지 못했어요. 다른 일정을 선택해 주세요.</p>}
        <select
          defaultValue=""
          onChange={(e) => {
            const picked = list.find((ev) => String(ev.event_id) === e.target.value);
            if (!picked) return;
            onChange(picked.event_id);
          }}
        >
          <option value="" disabled>
            {list.length ? "연결할 이벤트를 선택하세요" : "연결할 이벤트가 아직 없어요"}
          </option>
          {list.map((ev) => (
            <option key={ev.event_id} value={ev.event_id}>
              {ev.title}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const colorClass = EVENT_COLOR_CLASS[event.color] || "blue";

  return (
    <div className={`embed-event-card embed-event-card--${colorClass}`}>
      <button
        type="button"
        className="embed-event-card__link"
        onClick={() => navigate("/calendar")}
        title="캘린더로 이동"
      >
        <span className="embed-event-card__bar" />
        <span className="embed-event-card__body">
          <strong>{event.title}</strong>
          <span>{formatEventRange(event.start_datetime, event.end_datetime)}</span>
        </span>
      </button>
    </div>
  );
}

/* ================= SprintEmbed =================
   TASK/EVENT와 마찬가지로 노션에는 없는, FlowSpace만의 블록이에요.
   개별 태스크나 이벤트 하나가 아니라 스프린트 자체를 연결해서, 그
   스프린트의 진행률·목표·기간을 페이지 안에서 실시간으로 보여줘요 —
   sprints 목(mock)의 progress/completed/total이 바뀌면 이 블록도 새로
   불러올 때마다 그대로 반영돼요(진짜 API가 붙으면 자동으로 최신
   상태가 돼요). 클릭하면 스프린트 상세 화면으로 이동해요. */

const SPRINT_STATUS_LABEL = {
  ACTIVE: "진행 중",
  PLANNING: "계획됨",
  COMPLETED: "완료",
};

export function SprintEmbed({ sprintId, onChange }) {
  const navigate = useNavigate();
  // 워크스페이스의 스프린트 목록(진행률·상태는 작업 데이터로 계산된 값)에서 찾아요.
  const { sprintsInWorkspace: sprints = [] } = useWorkspace();
  // sprintId만 갖고 있다가 매번 sprints에서 새로 찾아 그리니까, 주석에서
  // 원래 얘기했던 "progress/completed/total이 바뀌면 새로 불러올 때마다
  // 반영된다"는 게 스냅샷을 저장하던 예전 구현과 달리 이제 실제로도
  // 그래요.
  const sprint = sprints.find((s) => s.id === sprintId) || null;

  if (!sprint) {
    return (
      <div className="embed-picker">
        <select
          defaultValue=""
          onChange={(e) => {
            const picked = sprints.find((s) => String(s.id) === e.target.value);
            if (!picked) return;
            onChange(picked.id);
          }}
        >
          <option value="" disabled>
            연결할 스프린트를 선택하세요
          </option>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.goal}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`embed-sprint-card embed-sprint-card--${sprint.color || "indigo"}`}>
      <button
        type="button"
        className="embed-sprint-card__link"
        onClick={() => navigate(`/sprints/${sprint.id}`)}
        title="스프린트로 이동"
      >
        <span className="embed-sprint-card__bar" />

        <span className="embed-sprint-card__body">
          <span className="embed-sprint-card__top">
            <strong>{sprint.name}</strong>
            <span className="embed-sprint-card__status">
              {SPRINT_STATUS_LABEL[sprint.status] || sprint.status}
            </span>
          </span>

          <span className="embed-sprint-card__goal">{sprint.goal}</span>

          <span className="embed-sprint-card__progress">
            <span className="embed-sprint-card__progress-track">
              <span style={{ width: `${sprint.progress}%` }} />
            </span>
            <span className="embed-sprint-card__progress-label">
              {sprint.completed}/{sprint.total} · {sprint.progress}%
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

/* ================= PageLinkBlock =================
   하위 페이지도 "블록"으로 문서 흐름 안에 있어야 노션처럼 느껴져서,
   페이지 맨 아래에 따로 박스를 두는 대신 다른 블록들과 같은 줄 높이의
   링크 블록으로 넣었어요. 제목·아이콘은 pages 상태에서 바로 읽어오니까
   하위 페이지 이름을 바꿔도 이 블록이 따로 갱신될 필요가 없어요. */

export function PageLinkBlock({ page }) {
  const navigate = useNavigate();

  if (!page) {
    return <div className="page-link-block page-link-block--missing">삭제된 페이지예요</div>;
  }

  return (
    <button
      type="button"
      className="page-link-block"
      onClick={() => navigate(`/pages/${page.id}`)}
    >
      <span className="page-link-block__icon">{page.icon || <FileIcon size={14} />}</span>
      <span className="page-link-block__title">{page.title || "제목 없음"}</span>
    </button>
  );
}

export function formatEventRange(start, end) {
  const fmt = (iso) => {
    if (!iso) return "";
    const [date, time] = iso.split("T");
    const [, m, d] = date.split("-");
    return time ? `${m}.${d} ${time}` : `${m}.${d}`;
  };
  const s = fmt(start);
  const e = fmt(end);
  return e ? `${s} ~ ${e}` : s;
}
