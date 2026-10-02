import { CircleCheck, CircleDot, UsersRound, Archive } from "lucide-react";

// 담당자는 {id, name, initial} 객체일 수도, 이름 문자열일 수도 있어서 사람마다 하나의 키로 맞춰요.
// (id가 0인 "알 수 없는 담당자"가 여러 명 있어도 합쳐지지 않게 이름을 먼저 봐요.)
const assigneeKey = (assignee) =>
  typeof assignee === "string" ? assignee : (assignee?.name ?? assignee?.id);

// tasks의 status는 "TODO" | "IN_PROGRESS" | "DONE"(칸반 상태의 카테고리)이에요. 상세 화면이 스프린트의
// 작업 목록을 내려주면 여기서 개수를 직접 세요 — 숫자를 코드에 박아두면 작업을 바꿔도 그대로예요.
export default function SprintDetailMetrics({ isBacklog = false, tasks = [] }) {
  const countBy = (status) => tasks.filter((t) => t.status === status).length;
  const members = new Set(
    tasks.flatMap((t) => (t.assignees ?? []).map(assigneeKey)).filter((key) => key !== undefined),
  ).size;

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
        [CircleCheck, "완료", countBy("DONE"), "개", "green"],
        [UsersRound, "참여 인원", members, "명", "indigo"],
      ]
    : [
        [CircleDot, "할 일", countBy("TODO"), "개", "gray"],
        [CircleDot, "진행 중", countBy("IN_PROGRESS"), "개", "orange"],
        [CircleCheck, "완료", countBy("DONE"), "개", "green"],
        [UsersRound, "참여 인원", members, "명", "indigo"],
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
