import { ArrowLeft, ArrowRight } from "lucide-react";
import styles from "../../styles/classes";

export default function CalendarCard({ events }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>오늘의 일정</h2>

        <button className={styles.more}>전체 보기</button>
      </div>

      {/* 날짜 */}
      <div className={styles.calendarDate}>
        <button>
          <ArrowLeft size={16} />
        </button>

        <span>2025.05.28 (수)</span>

        <button>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* 타임라인 */}
      <div className={styles.timeline}>
        {events.map((event) => (
          <div key={event.time} className={styles.timelineRow}>
            <time>{event.time}</time>

            <div className={`${styles.timelineBar} ${styles[event.color]}`} />

            <div className={styles.timelineCard}>
              <h4>{event.title}</h4>
              <p>{event.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
