import { CalendarDays, CheckCircle2, ClipboardCheck, Target, Users } from "lucide-react";
import styles from "../../styles/classes";
import { getAvatarTone } from "../../utils/avatarColor";

// `import * as Icons`로 전체 아이콘을 끌어오면 번들이 커지고, 오타 난 이름이면 undefined라 렌더링이 죽어요.
// 그래서 KPI에 쓰는 아이콘만 명시적으로 모아두고, 모르는 이름이 오면 기본 아이콘으로 대체해요.
const ICONS = { CheckCircle2, ClipboardCheck, CalendarDays, Users };

// item.members(온라인 팀원 목록)는 페이지가 props로 넘겨줘요 — 컴포넌트가 mock을 직접 import하지 않게 하려고요.
export default function MetricCard({ item }) {
  const Icon = ICONS[item.icon] ?? Target;
  const members = item.members ?? [];

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

      {members.length > 0 && (
        <div className={styles.memberStack}>
          {members.map((m) => (
            <div
              key={m.id}
              className={`${styles.avatar} ${styles[getAvatarTone(m.id)]}`}
            >
              {m.initial}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
