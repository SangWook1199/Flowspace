import SprintBanner from "../components/dashboard/SprintBanner";
import MetricCard from "../components/dashboard/MetricCard";
import TodayWorkCard from "../components/dashboard/TodayWorkCard";
import CalendarCard from "../components/dashboard/CalendarCard";
import ActivityCard from "../components/dashboard/ActivityCard";

import {
  sprint,
  kpis,
  todayTasks,
  todaySchedule,
  activities,
} from "../mock/dashboard";

import styles from "../styles/classes";

export default function Dashboard() {
  return (
    <main className={styles.content}>
      {/* 상단 */}
      <section className={styles.welcome}>
        <div>
          <h1>안녕하세요, 상욱님 👋</h1>
          <p>오늘도 FlowSpace와 함께 더 나은 협업을 만들어가요.</p>
        </div>

        <div className={styles.welcomeInfo}>
          <time>2025.05.28 (수)</time>
          <span>Sprint 1 · Day 5</span>
        </div>
      </section>

      {/* 배너 */}
      <SprintBanner sprint={sprint} />

      {/* KPI */}
      <section className={styles.kpis}>
        {kpis.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </section>

      {/* 핵심 3열 */}
      <section className={styles.dashboardMain}>
        <div className={styles.workSection}>
          <TodayWorkCard tasks={todayTasks} />
        </div>

        <div className={styles.scheduleSection}>
          <CalendarCard events={todaySchedule} />
        </div>

        <div className={styles.activitySection}>
          <ActivityCard activities={activities} />
        </div>
      </section>
    </main>
  );
}
