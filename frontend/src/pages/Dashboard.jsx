import { useMemo, useState } from "react";

import SprintBanner from "../components/dashboard/SprintBanner";
import MetricCard from "../components/dashboard/MetricCard";
import TodayWorkCard from "../components/dashboard/TodayWorkCard";
import CalendarCard from "../components/dashboard/CalendarCard";
import ActivityCard from "../components/dashboard/ActivityCard";

import {
  members,
  sprintGoalDescriptions,
  kpis,
  todayTasks,
  todaySchedule,
  activities,
} from "../mock/dashboard";
import { sprints } from "../mock/sprints";

import { todayKey, formatDateWithWeekday } from "../utils/date";
import { pickCurrentSprint } from "../utils/sprintRange";
import {
  buildSprintBanner,
  buildSprintDayLabel,
  buildKpis,
} from "../utils/dashboardMetrics";

import { useAuth } from "../context/useAuth";
import styles from "../styles/classes";

export default function Dashboard() {
  // 인사말은 로그인한 사용자의 닉네임을 써요(예전엔 "상욱"이 고정이었어요).
  const { user } = useAuth();
  const displayName = user?.nickname || user?.name || "회원";
  // "오늘"은 처음 렌더링할 때 한 번만 정해요(테스트 때는 window.__TODAY__로 바꿀 수 있어요).
  const [today] = useState(todayKey);

  // 오늘이 기간에 들어가는 스프린트를 고르고, 없으면 가장 가까운 예정/최근 스프린트를 써요.
  // 스프린트가 하나도 없으면 null이라 배너와 "Day N" 문구를 그리지 않아요.
  // (지금은 mock이지만 API를 붙이면 sprints만 서버 응답으로 바꾸면 돼요.)
  const currentSprint = useMemo(() => pickCurrentSprint(sprints, today), [today]);

  const banner = useMemo(
    () =>
      buildSprintBanner(
        currentSprint,
        today,
        currentSprint ? sprintGoalDescriptions[currentSprint.id] : "",
      ),
    [currentSprint, today],
  );

  const dayLabel = buildSprintDayLabel(currentSprint, today);

  const metrics = useMemo(
    () =>
      buildKpis(kpis, {
        banner,
        tasks: todayTasks,
        schedule: todaySchedule,
        members,
      }),
    [banner],
  );

  return (
    <main className={styles.content}>
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

      {/* KPI */}
      <section className={styles.kpis}>
        {metrics.map((item) => (
          <MetricCard key={item.key} item={item} />
        ))}
      </section>

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
    </main>
  );
}
