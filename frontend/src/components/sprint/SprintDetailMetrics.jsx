import { CircleCheck, CircleDot, UsersRound, Archive } from "lucide-react";

export default function SprintDetailMetrics({ isBacklog = false, tasks = [] }) {
  const metrics = isBacklog
    ? [
        [Archive, "미배정", tasks.length, "개", "gray"],
        [
          CircleDot,
          "높은 우선순위",
          tasks.filter((t) => t.priority === "HIGH").length,
          "개",
          "red",
        ],
        [
          CircleCheck,
          "완료",
          tasks.filter((t) => t.status === "DONE").length,
          "개",
          "green",
        ],
        [
          UsersRound,
          "참여 인원",
          new Set(tasks.flatMap((t) => t.assignees ?? [])).size,
          "명",
          "indigo",
        ],
      ]
    : [
        [CircleDot, "할 일", 8, "개", "gray"],
        [CircleDot, "진행 중", 4, "개", "orange"],
        [CircleCheck, "완료", 3, "개", "green"],
        [UsersRound, "참여 인원", 4, "명", "indigo"],
      ];

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
