import * as Icons from "lucide-react";
import styles from "../../styles/classes.js";

export default function MetricCard({ item }) {
  const Icon = Icons[item.icon];

  return (
    <article className={styles.kpi}>
      <div className={`${styles.kpiIcon} ${styles[item.tone]}`}>
        <Icon strokeWidth={1.9} />
      </div>

      <p>{item.label}</p>
      <strong>{item.value}</strong>
      <span className={styles.change}>{item.change}</span>

      <small>
        {item.label === "온라인 팀원" && <em className={styles.onlineDot} />}
        {item.note}
      </small>
    </article>
  );
}