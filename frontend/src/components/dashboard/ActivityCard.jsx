import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/classes";
import { getAvatarTone } from "../../utils/avatarColor";

export default function ActivityCard({ activities = [] }) {
  const navigate = useNavigate();

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>최근 활동</h2>

        <button type="button" className={styles.more} onClick={() => navigate("/activities")}>
          전체 보기
          <ArrowRight size={15} />
        </button>
      </div>

      <div className={styles.activityList}>
        {activities.length === 0 && <p className={styles.emptyText}>최근 활동이 없어요.</p>}

        {activities.map((item) => (
          <div key={item.id} className={styles.activityItem}>
            <div className={`${styles.avatar} ${styles[getAvatarTone(item.userId)]}`}>
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
