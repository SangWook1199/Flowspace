import * as Icons from "lucide-react";
import { members } from "../../mock/dashboard";
import styles from "../../styles/classes";

export default function MetricCard({ item }) {
  const Icon = Icons[item.icon];

  return (
    <article className={styles.metricCard}>
      <div className={styles.metricHeader}>
        <div className={`${styles.metricIcon} ${styles[item.color]}`}>
          <Icon size={18} />
        </div>
      </div>

      <div className={styles.metricBody}>
        <p>{item.label}</p>
        <h3>{item.value}</h3>
        <span>{item.note}</span>
      </div>

      {item.label === "온라인 팀원" && (
        <div className={styles.memberStack}>
          {members
            .filter((m) => m.online)
            .map((m) => (
              <div
                key={m.name}
                className={`${styles.avatar} ${styles[m.tone]}`}
              >
                {m.initial}
              </div>
            ))}
        </div>
      )}
    </article>
  );
}
