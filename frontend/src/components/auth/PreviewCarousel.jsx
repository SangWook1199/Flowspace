import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PreviewCarousel({ items, current, onChange }) {
  // 5초마다 자동 전환
  useEffect(() => {
    const timer = setInterval(() => {
      onChange((current + 1) % items.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [current, items.length, onChange]);

  const prev = () => {
    onChange((current - 1 + items.length) % items.length);
  };

  const next = () => {
    onChange((current + 1) % items.length);
  };

  const active = items[current];

  return (
    <div className="preview-carousel">
      <div className="preview-image">
        <img src={active.image} alt={active.title} />
      </div>

      <div className="preview-content">
        <span className="preview-label">FLOWSPACE</span>

        <h2>{active.title}</h2>

        <p>{active.description}</p>
      </div>

      <div className="preview-footer">
        <div className="preview-dots">
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              className={index === current ? "active" : ""}
              aria-label={`${index + 1}번째 소개 보기`}
              aria-current={index === current ? "true" : undefined}
              onClick={() => onChange(index)}
            />
          ))}
        </div>

        <div className="preview-controls">
          <button type="button" aria-label="이전 소개" onClick={prev}>
            <ChevronLeft size={18} />
          </button>

          <button type="button" aria-label="다음 소개" onClick={next}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
