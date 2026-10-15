import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/classes";
import { diffDays, formatDateWithWeekday } from "../../utils/date";

// date는 지금 보고 있는 날짜("YYYY-MM-DD"), today는 실제 오늘이에요. 날짜 문구를 화면에 직접 적어두면 실제 날짜와 어긋나서 prop으로 받아요.
// onPrev/onNext는 하루씩 앞뒤로 옮기는 버튼, onToday는 다른 날을 보고 있을 때만 "전체 보기" 왼쪽에 나오는 "오늘" 버튼이에요.
// (날짜 줄에 넣으면 버튼이 생길 때마다 날짜 위치가 움직여서 헤더에 뒀어요.)
export default function CalendarCard({ events = [], date, today, onPrev, onNext, onToday }) {
  const navigate = useNavigate();
  const isToday = diffDays(today, date) === 0;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>일정</h2>

        <div className={styles.calendarHeaderActions}>
          {!isToday && (
            <button type="button" className={styles.calendarToday} onClick={onToday}>
              오늘
            </button>
          )}

          <button type="button" className={styles.more} onClick={() => navigate("/calendar")}>
            전체 보기
          </button>
        </div>
      </div>

      {/* 날짜: < 날짜 > — 누른 만큼 하루씩 앞뒤로 옮겨요. */}
      <div className={styles.calendarDate}>
        <button type="button" onClick={onPrev} aria-label="이전 날" title="이전 날">
          <ChevronLeft size={16} />
        </button>

        <span aria-live="polite">{formatDateWithWeekday(date)}</span>

        <button type="button" onClick={onNext} aria-label="다음 날" title="다음 날">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 타임라인 */}
      <div className={styles.timeline}>
        {events.length === 0 && <p className={styles.emptyText}>{isToday ? "오늘 일정이 없어요." : "이 날은 일정이 없어요."}</p>}

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
