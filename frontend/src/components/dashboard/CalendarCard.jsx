import { ArrowLeft, ArrowRight } from "lucide-react";
import styles from "../../styles/classes";
import { formatDateWithWeekday } from "../../utils/date";

// date는 "YYYY-MM-DD" 오늘 날짜예요. 날짜 문구를 화면에 직접 적어두면 실제 오늘과 어긋나서 prop으로 받아요.
export default function CalendarCard({ events = [], date }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>오늘의 일정</h2>

        <button className={styles.more}>전체 보기</button>
      </div>

      {/* 날짜 */}
      <div className={styles.calendarDate}>
        <button aria-label="이전 날">
          <ArrowLeft size={16} />
        </button>

        <span>{formatDateWithWeekday(date)}</span>

        <button aria-label="다음 날">
          <ArrowRight size={16} />
        </button>
      </div>

      {/* 타임라인 */}
      <div className={styles.timeline}>
        {events.map((event, index) => (
          // 같은 시각에 일정이 둘 이상이면 time만으로는 key가 겹쳐요. id가 있으면 id, 없으면 순번을 같이 써요.
          <div key={event.id ?? `${event.time}-${index}`} className={styles.timelineRow}>
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
