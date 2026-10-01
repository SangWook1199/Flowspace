import { CalendarDays, Target } from "lucide-react";
import styles from "../../styles/classes";
import { clampPercent } from "../../utils/date";

// sprint는 페이지가 날짜/작업 수로 계산해서 넘겨줘요(Day 수, 남은 일수, 진행률 모두 계산된 값).
export default function SprintBanner({ sprint }) {
  if (!sprint) return null;

  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        {/* 왼쪽 Sprint 영역 */}
        <div className={styles.heroLeft}>
          <small>{sprint.label ?? "진행 중인 스프린트"}</small>

          <div className={styles.heroTitle}>
            <h2>{sprint.name}</h2>
            {sprint.status && <span>{sprint.status}</span>}
          </div>

          <div className={styles.heroDate}>
            <CalendarDays size={16} />
            <span>
              {sprint.start} ~ {sprint.end}
            </span>
            {sprint.remain && <b>{sprint.remain}</b>}
          </div>

          {/* 진행률은 왼쪽 영역 안에서만 */}
          <div className={styles.heroProgress}>
            <div className={styles.heroProgressRow}>
              <div className={styles.heroBar}>
                <div
                  style={{
                    width: `${clampPercent(sprint.progress)}%`,
                  }}
                />
              </div>

              <strong>{sprint.progress}%</strong>
            </div>

            <div className={styles.heroPercent}>
              <span>
                {sprint.completed} / {sprint.total} 작업 완료
              </span>
            </div>
          </div>
        </div>

        {/* 오른쪽 목표 영역 */}
        <div className={styles.heroGoal}>
          <small>이번 스프린트 목표</small>

          <div className={styles.goalTitle}>
            <Target size={22} />

            <h4>{sprint.goal}</h4>
          </div>

          {sprint.goalDesc && <p>{sprint.goalDesc}</p>}
        </div>
      </div>
    </section>
  );
}
