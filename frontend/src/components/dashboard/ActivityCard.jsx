import { ArrowRight } from "lucide-react";
import styles from "../../styles/classes";

export default function ActivityCard({ activities }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>최근 활동</h2>

        <button className={styles.more}>
          전체 보기
          <ArrowRight size={15} />
        </button>
      </div>

      <div className={styles.activityList}>
        {activities.map((item) => (
          <div key={item.id} className={styles.activityItem}>
            <div className={`${styles.avatar} ${styles[item.color]}`}>
              {item.initial}
            </div>

            <div className={styles.activityContent}>
              <p>{item.text}</p>
              <span>{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
