import { useState } from "react";
import { CheckCircle2, AlertTriangle, Lightbulb, Plus } from "lucide-react";

export default function RetroReviewSection({ review }) {
  const [keep, setKeep] = useState(review.keep);
  const [problem, setProblem] = useState(review.problem);
  const [tryItems, setTryItems] = useState(review.try);

  const addItem = (setter) => {
    setter((prev) => [
      ...prev,
      {
        id: Date.now(),
        content: "",
      },
    ]);
  };

  const updateItem = (list, setter, id, value) => {
    setter(
      list.map((item) => (item.id === id ? { ...item, content: value } : item)),
    );
  };

  const renderItems = (list, setter, color, label) => (
    <>
      <div className="review-item-list">
        {list.map((item) => (
          <textarea
            key={item.id}
            className={`review-item-textarea ${color}`}
            value={item.content}
            onChange={(e) => updateItem(list, setter, item.id, e.target.value)}
            placeholder={`${label} 내용을 작성하세요.`}
            rows={2}
          />
        ))}
      </div>

      <button
        className={`review-add-btn ${color}`}
        onClick={() => addItem(setter)}
      >
        <Plus size={16} />
        {label} 추가...
      </button>
    </>
  );

  return (
    <section className="retro-section">
      <div className="retro-section__header">
        <h2>회고 작성</h2>
        <p>이번 스프린트를 돌아보고 Keep · Problem · Try를 기록하세요.</p>
      </div>

      <div className="review-grid">
        {/* Keep */}
        <article className="review-card keep">
          <div className="review-card__header">
            <CheckCircle2 size={20} />
            <h3>Keep</h3>
          </div>

          <p>잘했던 점, 유지하고 싶은 경험</p>

          {renderItems(keep, setKeep, "keep", "Keep")}
        </article>

        {/* Problem */}
        <article className="review-card problem">
          <div className="review-card__header">
            <AlertTriangle size={20} />
            <h3>Problem</h3>
          </div>

          <p>아쉬웠던 점과 개선이 필요한 부분</p>

          {renderItems(problem, setProblem, "problem", "Problem")}
        </article>

        {/* Try */}
        <article className="review-card try">
          <div className="review-card__header">
            <Lightbulb size={20} />
            <h3>Try</h3>
          </div>

          <p>다음 스프린트에서 시도할 개선안</p>

          {renderItems(tryItems, setTryItems, "try", "Try")}
        </article>
      </div>
    </section>
  );
}
