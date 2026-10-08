import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import SprintBanner from "../components/dashboard/SprintBanner";
import MetricCard from "../components/dashboard/MetricCard";
import TodayWorkCard from "../components/dashboard/TodayWorkCard";
import CalendarCard from "../components/dashboard/CalendarCard";
import ActivityCard from "../components/dashboard/ActivityCard";

// KPI 카드의 모양(아이콘/색/이름)만 목데이터 파일에 남아 있어요. 숫자와 문구는 아래에서 계산해요.
import { KPI_CARDS } from "../utils/dashboardKpis";

import * as eventApi from "../api/events";
import * as activityApi from "../api/activities";
import { toActivity } from "../api/mappers";
import { useRequest } from "../hooks/useRequest";
import { todayKey, formatDateDots, formatDateWithWeekday, parseDateKey } from "../utils/date";
import { pickCurrentSprint } from "../utils/sprintRange";
import { isEventOnDate, sortEventsByStart } from "../utils/calendarRange";
import { htmlToText } from "../utils/sanitizeHtml";
import {
  buildSprintBanner,
  buildSprintDayLabel,
  buildKpis,
} from "../utils/dashboardMetrics";

import { useAuth } from "../context/useAuth";
import styles from "../styles/classes";

const PRIORITY_LABEL = { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" };
// 상태 카테고리 → 대시보드 작업 표의 상태 값/라벨
const CATEGORY_STATUS = { TODO: "todo", IN_PROGRESS: "progress", DONE: "done" };
const STATUS_HEX = {
  GRAY: "#64748B",
  BLUE: "#2563EB",
  PURPLE: "#9333EA",
  GREEN: "#16A34A",
  RED: "#EF4444",
  ORANGE: "#F59E0B",
  PINK: "#EC4899",
  WHITE: "#FFFFFF",
};

// "2026-06-17T14:00" → "14:00"
const timeOf = (datetime) => (datetime ? datetime.slice(11, 16) : "");

// 서버 일정 → 오늘의 일정 카드 항목. 시작이 오늘이 아닌(여러 날에 걸친) 일정은 시각 대신 "종일"로 보여줘요.
const toScheduleItem = (event, today) => {
  const startsToday = (event.start_datetime ?? "").slice(0, 10) === today;
  const start = timeOf(event.start_datetime);
  const end = timeOf(event.end_datetime);
  const range = startsToday ? `${start}${end ? ` - ${end}` : ""}` : "여러 날에 걸친 일정";

  return {
    id: event.event_id,
    time: startsToday ? start : "종일",
    title: event.title,
    desc: event.description ? `${range} · ${event.description}` : range,
    color: (event.color ?? "BLUE").toLowerCase(),
  };
};

export default function Dashboard() {
  // 인사말은 로그인한 사용자의 닉네임을 써요(예전엔 "상욱"이 고정이었어요).
  const { user } = useAuth();
  const displayName = user?.nickname || user?.name || "회원";
  // 스프린트·작업·팀원은 서버에서 불러와 MainLayout(WorkspaceProvider)이 내려줘요.
  const { workspaceId, sprints, sprintTasks, taskStatuses, members, pages, sprintDataLoading, sprintDataError, reloadSprintData } =
    useOutletContext();
  // "오늘"은 처음 렌더링할 때 한 번만 정해요(테스트 때는 window.__TODAY__로 바꿀 수 있어요).
  const [today] = useState(todayKey);

  // 오늘이 기간에 들어가는 스프린트를 고르고, 없으면 가장 가까운 예정/최근 스프린트를 써요.
  // 스프린트가 하나도 없으면 null이라 배너와 "Day N" 문구를 그리지 않아요.
  const currentSprint = useMemo(() => pickCurrentSprint(sprints, today), [sprints, today]);

  const banner = useMemo(
    () =>
      buildSprintBanner(
        currentSprint,
        today,
        currentSprint ? htmlToText(currentSprint.description) : "",
      ),
    [currentSprint, today],
  );

  const dayLabel = buildSprintDayLabel(currentSprint, today);

  // 오늘의 작업: 기간(시작일~마감일)에 오늘이 들어가는, 스프린트에 배정된 작업 중 아직 끝나지 않은 것이에요.
  const todayTasks = useMemo(() => {
    const statusById = Object.fromEntries(taskStatuses.map((status) => [status.id, status]));

    return sprintTasks
      .filter(
        (task) =>
          task.sprintId !== null &&
          task.startDate &&
          today >= task.startDate &&
          today <= (task.dueDate || task.startDate),
      )
      .map((task) => {
        const status = statusById[task.statusId];
        const state = CATEGORY_STATUS[status?.category] ?? "todo";

        return {
          id: task.id,
          title: task.title,
          priority: (task.priority ?? "").toLowerCase(),
          priorityLabel: PRIORITY_LABEL[task.priority] ?? "",
          status: state,
          statusName: status?.name ?? task.statusName,
          statusColor: STATUS_HEX[status?.color] ?? STATUS_HEX.GRAY,
          assignees: task.assignees ?? [],
          // 작업에는 시각이 없어서 마감일을 보여줘요.
          time: task.dueDate ? `~ ${formatDateDots(task.dueDate)}` : "-",
          // 마감일 정렬에 쓰는 원래 날짜예요(없으면 빈 문자열).
          dueDate: task.dueDate || "",
        };
      })
      // 끝난 작업은 "오늘 해야 할 일"이 아니라서 뺐어요.
      .filter((task) => task.status !== "done");
  }, [sprintTasks, taskStatuses, today]);

  // 오늘의 일정: 오늘이 든 달(앞뒤 한 달 포함)의 일정 중 오늘에 걸친 것이에요.
  const base = parseDateKey(today) ?? new Date();
  const { data: events, error: eventsError } = useRequest(
    () => eventApi.getEventsAround(workspaceId, base.getFullYear(), base.getMonth() + 1),
    [workspaceId, today],
    { initialData: [] },
  );
  const todaySchedule = useMemo(
    () =>
      sortEventsByStart((events ?? []).filter((event) => isEventOnDate(event, today))).map((event) =>
        toScheduleItem(event, today),
      ),
    [events, today],
  );

  // 최근 활동: 서버가 준 활동에 화면이 가진 작업·스프린트·페이지 이름을 붙여 문구를 만들어요.
  const { data: rawActivities, error: activitiesError } = useRequest(() => activityApi.getRecentActivities(workspaceId), [workspaceId], {
    initialData: [],
  });
  const activities = useMemo(() => {
    const lookup = {
      task: (id) => sprintTasks.find((task) => task.id === id)?.title,
      sprint: (id) => sprints.find((sprint) => sprint.id === id)?.name,
      page: (id) => pages.find((page) => page.id === id)?.title,
    };
    const now = Date.now();
    return (rawActivities ?? []).map((item) => toActivity(item, lookup, now));
  }, [rawActivities, sprintTasks, sprints, pages]);

  const metrics = useMemo(
    () =>
      buildKpis(KPI_CARDS, {
        banner,
        tasks: todayTasks,
        schedule: todaySchedule,
        members,
      }),
    [banner, todayTasks, todaySchedule, members],
  );

  return (
    // MainLayout이 이미 <main>을 그려서 여기서는 div로 둬요(<main> 중첩 방지).
    <div className={styles.content}>
      {/* 상단 */}
      <section className={styles.welcome}>
        <div>
          <h1>안녕하세요, {displayName}님 👋</h1>
          <p>오늘도 FlowSpace와 함께 더 나은 협업을 만들어가요.</p>
        </div>

        <div className={styles.welcomeInfo}>
          <time dateTime={today}>{formatDateWithWeekday(today)}</time>
          {dayLabel && <span>{dayLabel}</span>}
        </div>
      </section>

      {/* 배너 */}
      {banner && <SprintBanner sprint={banner} />}
      {/* 스프린트가 하나도 없으면(불러오는 중·실패가 아닐 때) 배너 자리가 비지 않게 안내해요. */}
      {!banner && !sprintDataLoading && !sprintDataError && (
        <section className={styles.hero}>
          <p className={styles.heroEmpty}>아직 스프린트가 없어요. 스프린트를 만들면 진행 상황이 여기에 보여요.</p>
        </section>
      )}

      {/* KPI */}
      <section className={styles.kpis}>
        {metrics.map((item) => (
          <MetricCard key={item.key} item={item} />
        ))}
      </section>

      {/* 불러오는 중·실패 상태를 보여줘요(없으면 빈 숫자만 보여서 고장 난 것처럼 보여요). */}
      {sprintDataError && (
        <p role="alert" style={{ color: "#ef4444", margin: "0 0 12px" }}>
          스프린트와 작업을 불러오지 못했어요. {sprintDataError}{" "}
          {reloadSprintData && (
            <button type="button" onClick={reloadSprintData}>
              다시 시도
            </button>
          )}
        </p>
      )}
      {sprintDataLoading && !sprintDataError && (
        <p role="status" style={{ color: "#64748b", margin: "0 0 12px" }}>
          불러오는 중이에요…
        </p>
      )}

      {eventsError && (
        <p role="alert" style={{ color: "#ef4444", margin: "0 0 12px" }}>
          오늘의 일정을 불러오지 못했어요. {eventsError}
        </p>
      )}

      {activitiesError && (
        <p role="alert" style={{ color: "#ef4444", margin: "0 0 12px" }}>
          최근 활동을 불러오지 못했어요. {activitiesError}
        </p>
      )}

      {/* 핵심 3열 */}
      <section className={styles.dashboardMain}>
        <div className={styles.workSection}>
          <TodayWorkCard tasks={todayTasks} />
        </div>

        <div className={styles.scheduleSection}>
          <CalendarCard events={todaySchedule} date={today} />
        </div>

        <div className={styles.activitySection}>
          <ActivityCard activities={activities} />
        </div>
      </section>
    </div>
  );
}
