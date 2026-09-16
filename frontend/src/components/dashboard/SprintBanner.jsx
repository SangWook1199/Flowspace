import { CalendarDays, Target } from "lucide-react";
import styles from "../../styles/classes";

export default function SprintBanner({ sprint }) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        {/* 왼쪽 Sprint 영역 */}
        <div className={styles.heroLeft}>
          <small>진행 중인 스프린트</small>

          <div className={styles.heroTitle}>
            <h2>{sprint.name}</h2>
            <span>{sprint.status}</span>
          </div>

          <div className={styles.heroDate}>
            <CalendarDays size={16} />
            <span>
              {sprint.start} ~ {sprint.end}
            </span>
            <b>{sprint.remain}</b>
          </div>

          {/* 진행률은 왼쪽 영역 안에서만 */}
          <div className={styles.heroProgress}>
            <div className={styles.heroProgressRow}>
              <div className={styles.heroBar}>
                <div
                  style={{
                    width: `${sprint.progress}%`,
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

          <p>{sprint.goalDesc}</p>
        </div>
      </div>
    </section>
  );
}
