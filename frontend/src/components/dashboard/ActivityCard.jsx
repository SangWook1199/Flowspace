import { ArrowRight } from "lucide-react";
import styles from "../../styles/classes.js";

export default function ActivityCard({ activities }) {
  return (
    <section className={`${styles.panel} ${styles.activity}`}>
      <div className={styles.panelHeader}>
        <h2>최근 활동</h2>

        <button className={styles.more}>
          전체 보기
          <ArrowRight size={15} />
        </button>
      </div>

      {activities.map(([initial, text, time, tone], index) => (
        <div className={styles.activityRow} key={index}>
          <span className={`${styles.avatar} ${styles[tone]}`}>
            {initial}
          </span>

          <div>
            <p>{text}</p>
            <small>{time}</small>
          </div>
        </div>
      ))}
    </section>
  );
}