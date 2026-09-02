import { Plus } from "lucide-react";
export default function SprintHero({ summary, onCreate }) {
  return (
    <>
      <section className="sprintListHeading">
        <div>
          <div className="breadcrumb">
            <span>스프린트</span>
            <b>›</b>
            <strong>스프린트 목록</strong>
          </div>
          <h1>스프린트 목록</h1>
          <p>모든 스프린트를 한눈에 보고 관리하세요.</p>
        </div>
        <button onClick={onCreate}>
          <Plus size={18} /> 새 스프린트
        </button>
      </section>
      <section className="sprintSummary">
        {summary.map((item) => (
          <article key={item.label}>
            <span className={item.tone} />
            <p>{item.label}</p>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>
    </>
  );
}
