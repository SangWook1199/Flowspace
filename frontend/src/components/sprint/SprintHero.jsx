import { Plus, Sparkles } from "lucide-react";
// onCreateWithAi를 주면 "AI로 구성" 버튼이 새 스프린트 버튼 옆에 나와요(관리자이고 AI를 쓸 수 있을 때만 넘겨요).
export default function SprintHero({ summary, onCreate, onCreateWithAi }) {
  return (
    <>
      <section className="sprintListHeading">
        <div>
          <h1>스프린트 목록</h1>
          <p>모든 스프린트를 한눈에 보고 관리하세요.</p>
        </div>
        <div className="sprintHeadingActions">
          {onCreateWithAi && (
            <button type="button" className="aiEntryButton" onClick={onCreateWithAi}>
              <Sparkles size={18} /> AI로 구성
            </button>
          )}
          <button type="button" onClick={onCreate}>
            <Plus size={18} /> 새 스프린트
          </button>
        </div>
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
