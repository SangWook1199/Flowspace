import { CalendarDays } from "lucide-react";
import styles from "../../styles/classes.js";

export default function SprintBanner() {
  return (
    <section className={styles.hero}>
      <div>
        <small>진행 중인 스프린트</small>

        <h2>
          Sprint 1 <span>진행 중</span>
        </h2>

        <p>
          <CalendarDays size={15} />
          2026.09.01 ~ 2026.09.14 <b>14일 남음</b>
        </p>
      </div>

      <div className={styles.heroProgress}>
        <div>
          <i />
        </div>
        <b>68%</b>
      </div>
    </section>
  );
}