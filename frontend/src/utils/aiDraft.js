import { diffDays, parseDateKey, toDateKey, todayKey } from "./date";

// 서버(AiDraftLimits)와 같은 한도예요. 넘기면 서버가 거절해서 미리 막아요.
export const AI_LIMITS = { MAX_SPRINTS: 12, MAX_EVENTS: 20, MAX_FIXED_EVENTS: 20 };

// 기본 기간(주)과 스프린트 길이 선택지
const DEFAULT_PERIOD_WEEKS = 6;
export const SPRINT_WEEK_OPTIONS = [1, 2, 3];

const addDays = (key, days) => {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

// 토·일이면 다음 월요일로 넘겨요.
const toWorkday = (key) => {
  const day = parseDateKey(key).getDay();
  if (day === 6) return addDays(key, 2);
  if (day === 0) return addDays(key, 1);
  return key;
};

// ---------- 입력 폼 ----------

// 새 프로젝트의 시작일 기본값: 이미 있는 스프린트가 끝난 다음 평일부터 이어서 만들어요
// (스프린트가 없거나 모두 지났으면 오늘부터예요).
export function defaultStartDate(sprints = [], today = todayKey()) {
  const ends = sprints.filter((sprint) => !sprint.isBacklog && sprint.endDate).map((sprint) => sprint.endDate.slice(0, 10));
  const latest = ends.length > 0 ? ends.reduce((a, b) => (a > b ? a : b)) : "";

  return toWorkday(latest && latest >= today ? addDays(latest, 1) : today);
}

export function defaultEndDate(startDate, weeks = DEFAULT_PERIOD_WEEKS) {
  return addDays(startDate, weeks * 7 - 1);
}

// 기간을 스프린트 길이로 나눴을 때 스프린트가 몇 개인지(서버와 같은 계산: 남는 기간은 마지막에 짧게 둬요).
export function countSprints(startDate, endDate, weeks) {
  const days = diffDays(startDate, endDate);
  if (days === null || days < 0 || !(weeks > 0)) return 0;
  return Math.ceil((days + 1) / (weeks * 7));
}

// 입력한 기간과 겹치는 기존 스프린트(백로그는 제외)
export function findOverlaps(sprints = [], startDate, endDate) {
  return sprints.filter(
    (sprint) =>
      !sprint.isBacklog &&
      sprint.startDate &&
      sprint.endDate &&
      sprint.startDate.slice(0, 10) <= endDate &&
      sprint.endDate.slice(0, 10) >= startDate,
  );
}

let keySeq = 0;
export const newKey = () => `ai-${++keySeq}`;

// 처음 폼 값. 멤버는 아무도 고르지 않은 상태로 시작하고, 역할은 비워 둬요(사용자가 직접 적어야 해요).
export function makeInitialForm(sprints = []) {
  const startDate = defaultStartDate(sprints);

  return {
    topic: "",
    startDate,
    endDate: defaultEndDate(startDate),
    sprintWeeks: 2,
    members: {}, // { [userId]: { on: boolean, role: string } }
    features: "",
    techStack: "",
    projectType: "",
    teamExperience: "",
    exclusions: "",
    fixedEvents: [], // [{ key, title, date }]
  };
}

// 제출을 막아야 하는 이유를 한 문장으로 돌려줘요(없으면 빈 문자열).
export function validateForm(form) {
  if (!form.topic.trim()) return "프로젝트 주제를 입력해주세요.";
  if (!parseDateKey(form.startDate) || !parseDateKey(form.endDate)) return "시작일과 종료일을 모두 입력해주세요.";
  if (diffDays(form.startDate, form.endDate) < 0) return "종료일은 시작일보다 빠를 수 없어요.";

  const count = countSprints(form.startDate, form.endDate, form.sprintWeeks);
  if (count > AI_LIMITS.MAX_SPRINTS) {
    return `스프린트가 ${count}개가 돼요. ${AI_LIMITS.MAX_SPRINTS}개 이하가 되게 기간을 줄이거나 스프린트 길이를 늘려 주세요.`;
  }

  const picked = Object.values(form.members).filter((member) => member.on);
  if (picked.length === 0) return "함께할 멤버를 한 명 이상 골라주세요.";
  if (picked.some((member) => !member.role.trim())) return "고른 멤버마다 역할을 적어 주세요.";

  if (form.fixedEvents.some((event) => Boolean(event.title.trim()) !== Boolean(event.date))) {
    return "고정 일정은 이름과 날짜를 모두 적어 주세요.";
  }

  return "";
}

// 서버 AiProjectRequest 모양으로 바꿔요(비운 선택 항목은 보내지 않아요).
export function buildRequest(form) {
  const text = (value) => value.trim() || undefined;
  const fixedEvents = form.fixedEvents
    .filter((event) => event.title.trim() && event.date)
    .map((event) => ({ title: event.title.trim(), date: event.date }));

  return {
    topic: form.topic.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    sprintWeeks: Number(form.sprintWeeks),
    members: Object.entries(form.members)
      .filter(([, member]) => member.on)
      .map(([userId, member]) => ({ userId: Number(userId), role: member.role.trim() })),
    features: text(form.features),
    techStack: text(form.techStack),
    projectType: text(form.projectType),
    teamExperience: text(form.teamExperience),
    exclusions: text(form.exclusions),
    fixedEvents: fixedEvents.length > 0 ? fixedEvents : undefined,
  };
}

// 걸린 시간을 "1분 5초"처럼 보여줘요.
export function formatElapsed(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  return minutes > 0 ? `${minutes}분 ${total % 60}초` : `${total}초`;
}

// ---------- 미리보기(초안 수정) ----------

// 서버 초안에 화면용 key를 붙여요(목록에서 지우고 고쳐도 입력창이 뒤섞이지 않게요).
export function toEditableDraft(draft) {
  return {
    sprints: (draft?.sprints ?? []).map((sprint) => ({
      ...sprint,
      key: newKey(),
      goal: sprint.goal ?? "",
      tasks: (sprint.tasks ?? []).map((task) => ({
        ...task,
        key: newKey(),
        description: task.description ?? "",
        assigneeUserId: task.assigneeUserId ?? null,
      })),
    })),
    events: (draft?.events ?? []).map((event) => ({ ...event, key: newKey() })),
  };
}

// 만들기 요청에 보낼 모양(key 제거, 비운 값은 null/생략)
export function toApplyBody(draft) {
  return {
    sprints: draft.sprints.map((sprint) => ({
      name: sprint.name.trim(),
      goal: sprint.goal.trim() || null,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      tasks: sprint.tasks.map((task) => ({
        title: task.title.trim(),
        description: task.description.trim() || null,
        priority: task.priority,
        assigneeUserId: task.assigneeUserId ?? null,
        startDate: task.startDate,
        endDate: task.endDate,
      })),
    })),
    events: draft.events.map((event) => ({ title: event.title.trim(), date: event.date })),
  };
}

export const countDraft = (draft) => ({
  sprints: draft.sprints.length,
  tasks: draft.sprints.reduce((sum, sprint) => sum + sprint.tasks.length, 0),
  events: draft.events.length,
});

export const isRangeInvalid = (start, end) => !parseDateKey(start) || !parseDateKey(end) || diffDays(start, end) < 0;

// 만들기 전에 막아야 하는 첫 번째 문제(없으면 빈 문자열)
export function validateDraft(draft) {
  if (draft.sprints.length === 0) return "스프린트가 하나도 없어요. 처음부터 다시 만들어 주세요.";

  for (const sprint of draft.sprints) {
    if (!sprint.name.trim()) return "이름이 비어 있는 스프린트가 있어요.";
    if (isRangeInvalid(sprint.startDate, sprint.endDate)) return `'${sprint.name}'의 기간(시작일·종료일)을 확인해주세요.`;

    for (const task of sprint.tasks) {
      if (!task.title.trim()) return `'${sprint.name}'에 제목이 비어 있는 작업이 있어요.`;
      if (isRangeInvalid(task.startDate, task.endDate)) return `'${task.title}'의 기간(시작일·종료일)을 확인해주세요.`;
    }
  }

  for (const event of draft.events) {
    if (!event.title.trim()) return "이름이 비어 있는 일정이 있어요.";
    if (!parseDateKey(event.date)) return `'${event.title}'의 날짜를 확인해주세요.`;
  }

  return "";
}

const mapAt = (list, key, patch) => list.map((item) => (item.key === key ? { ...item, ...patch } : item));

export const updateSprint = (draft, sprintKey, patch) => ({ ...draft, sprints: mapAt(draft.sprints, sprintKey, patch) });

export const removeSprint = (draft, sprintKey) => ({ ...draft, sprints: draft.sprints.filter((sprint) => sprint.key !== sprintKey) });

export const updateTask = (draft, sprintKey, taskKey, patch) =>
  updateSprint(draft, sprintKey, { tasks: mapAt(draft.sprints.find((sprint) => sprint.key === sprintKey).tasks, taskKey, patch) });

export const removeTask = (draft, sprintKey, taskKey) =>
  updateSprint(draft, sprintKey, { tasks: draft.sprints.find((sprint) => sprint.key === sprintKey).tasks.filter((task) => task.key !== taskKey) });

export const updateEvent = (draft, eventKey, patch) => ({ ...draft, events: mapAt(draft.events, eventKey, patch) });

export const removeEvent = (draft, eventKey) => ({ ...draft, events: draft.events.filter((event) => event.key !== eventKey) });

// ---------- 진행 중인 작업 id 보관(새로고침해도 이어서 보려고요) ----------

const jobKey = (workspaceId) => `flowspace.aiJob.${workspaceId}`;

export const loadJobId = (workspaceId) => {
  try {
    return window.sessionStorage.getItem(jobKey(workspaceId)) || null;
  } catch {
    return null;
  }
};

export const saveJobId = (workspaceId, jobId) => {
  try {
    window.sessionStorage.setItem(jobKey(workspaceId), jobId);
  } catch {
    // 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 새로고침 시 이어보기만 안 돼요.
  }
};

export const forgetJobId = (workspaceId) => {
  try {
    window.sessionStorage.removeItem(jobKey(workspaceId));
  } catch {
    // 위와 같아요.
  }
};
