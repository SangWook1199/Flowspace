// 스프린트 기간 계산 공용 함수 — 캘린더 배너, 대시보드 배너/헤더가 "오늘이 스프린트의 몇 일째인지"를
// 각자 계산하면 숫자가 서로 어긋나고(14일 남음처럼 문자열이 mock에 박혀 있으면 날짜가 지나도 안 바뀌어요),
// 그래서 날짜 계산은 한 곳에서 하고 화면은 결과만 보여줘요. API를 붙여도 startDate/endDate만 주면 그대로 동작해요.
import { diffDays, inclusiveDays, parseDateKey, clampPercent } from "./date";

// mock/sprints.js는 "2026.05.29"처럼 점으로 구분하고 API는 "2026-05-29"로 줄 수 있어서,
// 어느 쪽이 와도 date.js가 읽을 수 있는 "YYYY-MM-DD"로 맞춰줘요. 읽을 수 없으면 빈 문자열이에요.
export const normalizeDateKey = (value) => {
  if (typeof value !== "string") return "";
  const key = value.trim().replace(/[./]/g, "-").slice(0, 10);
  return parseDateKey(key) ? key : "";
};

// 스프린트와 오늘 날짜로 지금 어느 단계인지 계산해요.
// phase: "before"(시작 전) | "during"(진행 중) | "after"(종료) | "invalid"(날짜가 없거나 종료가 시작보다 앞섬)
export const getSprintPhase = (sprint, today) => {
  const start = normalizeDateKey(sprint?.startDate);
  const end = normalizeDateKey(sprint?.endDate);
  const total = inclusiveDays(start, end);

  // 종료가 시작보다 앞서면 inclusiveDays가 0이라 여기서 걸러져요(NaN이 화면에 나오지 않게).
  if (!start || !end || total === 0) {
    return { phase: "invalid", start, end, totalDays: 0, passedDays: 0, daysLeft: 0, daysUntilStart: 0, timeProgress: 0 };
  }

  const sinceStart = diffDays(start, today);
  const untilEnd = diffDays(today, end);

  if (sinceStart === null || untilEnd === null) {
    return { phase: "invalid", start, end, totalDays: total, passedDays: 0, daysLeft: 0, daysUntilStart: 0, timeProgress: 0 };
  }

  if (sinceStart < 0) {
    return { phase: "before", start, end, totalDays: total, passedDays: 0, daysLeft: untilEnd, daysUntilStart: -sinceStart, timeProgress: 0 };
  }

  if (untilEnd < 0) {
    return { phase: "after", start, end, totalDays: total, passedDays: total, daysLeft: 0, daysUntilStart: 0, timeProgress: 100 };
  }

  const passedDays = sinceStart + 1;

  return {
    phase: "during",
    start,
    end,
    totalDays: total,
    passedDays,
    daysLeft: untilEnd,
    daysUntilStart: 0,
    timeProgress: clampPercent(Math.round((passedDays / total) * 100)),
  };
};

// 오늘이 기간 안에 있는 스프린트를 고르고, 없으면 가장 가까운 예정 스프린트 → 가장 최근에 끝난 스프린트 순으로 골라요.
// (대시보드가 "오늘 해당하는 스프린트가 없어도" 빈 화면 대신 가장 의미 있는 스프린트를 보여주기 위해서예요.)
// 날짜가 잘못된 스프린트는 후보에서 빼고, 후보가 하나도 없으면 null이에요.
export const pickCurrentSprint = (sprints, today) => {
  const candidates = (sprints || [])
    .map((sprint) => ({ sprint, info: getSprintPhase(sprint, today) }))
    .filter(({ info }) => info.phase !== "invalid");

  const during = candidates.find(({ info }) => info.phase === "during");
  if (during) return during.sprint;

  const upcoming = candidates
    .filter(({ info }) => info.phase === "before")
    .sort((a, b) => a.info.daysUntilStart - b.info.daysUntilStart)[0];
  if (upcoming) return upcoming.sprint;

  const recent = candidates.filter(({ info }) => info.phase === "after").sort((a, b) => (a.info.end < b.info.end ? 1 : -1))[0];
  return recent ? recent.sprint : null;
};

// 대시보드가 보여줄 스프린트를 골라요. 날짜만 보면 이미 "완료"한 스프린트도 기간이 안 끝났다는 이유로 "진행 중"으로 뽑혀서,
// 스프린트의 상태(status)를 먼저 따라요: 진행 중(ACTIVE) → 계획됨 → 완료됨 순이에요. 같은 상태 안에서는 pickCurrentSprint 규칙을 써요
// (진행 중 스프린트는 직접 시작한 거라 기간이 오늘과 안 맞아도 그걸 보여줘요). 백로그는 스프린트가 아니라서 뺐어요.
export const pickDashboardSprint = (sprints, today) => {
  const list = (sprints || []).filter((sprint) => sprint.status !== "BACKLOG");
  const active = list.filter((sprint) => sprint.status === "ACTIVE");
  const planned = list.filter((sprint) => sprint.status !== "ACTIVE" && sprint.status !== "COMPLETED");
  const completed = list.filter((sprint) => sprint.status === "COMPLETED");

  return pickCurrentSprint(active, today) ?? active[0] ?? pickCurrentSprint(planned, today) ?? pickCurrentSprint(completed, today) ?? null;
};
