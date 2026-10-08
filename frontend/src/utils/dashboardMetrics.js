// 대시보드에 보여줄 숫자/문구를 데이터에서 계산하는 함수 모음 — 화면에 "Day 5", "14일 남음", "8건" 같은 값을
// 직접 적어두면 날짜나 데이터가 바뀌어도 그대로라서 서로 모순돼요. 여기서 계산하고 화면은 결과만 보여줘요.
import { formatDateDots, percentOf, clampPercent } from "./date";
import { getSprintPhase, normalizeDateKey } from "./sprintRange";

// 스프린트 배너(SprintBanner)에 넘길 값. 스프린트가 없으면 null이에요.
export const buildSprintBanner = (sprint, today, goalDesc = "") => {
  if (!sprint) return null;

  const info = getSprintPhase(sprint, today);
  const total = Number(sprint.total) || 0;
  const completed = Number(sprint.completed) || 0;

  let label = "진행 중인 스프린트";
  let status = "진행 중";
  let remain = "";

  if (info.phase === "before") {
    label = "예정된 스프린트";
    status = "예정";
    remain = `${info.daysUntilStart}일 후 시작`;
  } else if (info.phase === "during") {
    remain = info.daysLeft === 0 ? "오늘 종료" : `${info.daysLeft}일 남음`;
  } else if (info.phase === "after") {
    label = "최근 스프린트";
    status = "종료";
    remain = "종료됨";
  } else {
    label = "스프린트";
    status = "";
  }

  // 데이터에서 이미 완료 처리된 스프린트는 "완료"로 보여줘요(아직 시작 전이라는 날짜와 모순되는 경우는 날짜를 따라요).
  if (sprint.status === "COMPLETED" && info.phase !== "before") status = "완료";

  return {
    id: sprint.id,
    name: sprint.name,
    label,
    status,
    start: formatDateDots(normalizeDateKey(sprint.startDate)),
    end: formatDateDots(normalizeDateKey(sprint.endDate)),
    remain,
    // 작업 수로 계산한 완료율이에요. total이 0이면 0%(NaN 방지).
    progress: total > 0 ? percentOf(completed, total) : clampPercent(sprint.progress),
    total,
    completed,
    goal: sprint.goal,
    goalDesc,
    phase: info.phase,
  };
};

// 상단 헤더 오른쪽의 "Sprint 1 · Day 5" 문구. 스프린트가 없으면 빈 문자열이에요.
export const buildSprintDayLabel = (sprint, today) => {
  if (!sprint) return "";

  const info = getSprintPhase(sprint, today);

  if (info.phase === "during") return `${sprint.name} · Day ${info.passedDays}`;
  if (info.phase === "before") return `${sprint.name} · D-${info.daysUntilStart}`;
  if (info.phase === "after") return `${sprint.name} · 종료`;
  return sprint.name;
};

// KPI 카드 4개를 만들어요. kpiMeta는 mock의 모양 정보(아이콘/색/이름), 나머지는 계산에 쓰는 데이터예요.
export const buildKpis = (kpiMeta, { banner, tasks, schedule, members }) => {
  const openTasks = tasks.filter((task) => !task.done).length;
  const onlineMembers = members.filter((member) => member.online);

  const values = {
    completion: banner
      ? { value: `${banner.progress}%`, note: `${banner.completed} / ${banner.total} 작업 완료` }
      : { value: "-", note: "진행 중인 스프린트가 없어요" },
    todayTasks: { value: `${openTasks}건`, note: `전체 ${tasks.length}건 중` },
    todaySchedule: { value: `${schedule.length}건`, note: "오늘 예정된 일정" },
    online: {
      value: `${onlineMembers.length} / ${members.length}명`,
      note: "지금 함께 작업 중",
      // 온라인 팀원 아바타 목록 — MetricCard가 mock을 직접 import하지 않고 props로 받게 같이 넘겨요.
      members: onlineMembers,
    },
  };

  return kpiMeta.map((meta) => ({ ...meta, ...values[meta.key] }));
};
