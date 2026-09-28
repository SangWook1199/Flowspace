// 표/데이터베이스 컬럼 헤더 오른쪽 끝에 붙는 드래그 리사이즈 핸들이에요.
// DatabaseBlock과 SimpleTableBlock이 똑같이 쓰는 낮은 수준의 공용
// 부품이라 (기능 차이가 아니라 순전히 UI 상호작용이라) 따로 뺐어요.
// 드래그 중엔 프레임마다 onResize(width)를 그대로 호출해서 부모 state를
// 바로 갱신해요 — 지금 규모(표 몇 개, 컬럼 몇 개)에서는 굳이 로컬 미리보기
// state를 따로 둘 필요 없이 충분히 부드러워요.
const MIN_WIDTH = 90;
const MAX_WIDTH = 640;

export function clampColumnWidth(width) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

export default function ColumnResizeHandle({ width, onResize }) {
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent) => {
      onResize(clampColumnWidth(startWidth + (moveEvent.clientX - startX)));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      className="db-col-resize-handle"
      onMouseDown={handleMouseDown}
      // 더블클릭하면 다시 기본 너비로 — 실수로 너무 좁게/넓게 만들었을 때
      // 빠져나갈 방법이 있어야 해서요.
      onDoubleClick={() => onResize(undefined)}
    />
  );
}
