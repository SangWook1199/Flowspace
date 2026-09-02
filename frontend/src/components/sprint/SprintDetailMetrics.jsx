import { CircleCheck, CircleDot, UsersRound } from "lucide-react";
const metrics = [
  [CircleDot, "할 일", "8", "개", "gray"],
  [CircleDot, "진행 중", "4", "개", "orange"],
  [CircleCheck, "완료", "3", "개", "green"],
  [UsersRound, "참여 인원", "4", "명", "indigo"],
];
export default function SprintDetailMetrics() {
  return (
    <section className="detailMetrics">
      {metrics.map(([Icon, label, value, unit, tone]) => (
        <article key={label}>
          <span className={tone}>
            <Icon size={23} />
          </span>
          <p>{label}</p>
          <strong>
            {value} <small>{unit}</small>
          </strong>
        </article>
      ))}
    </section>
  );
}
