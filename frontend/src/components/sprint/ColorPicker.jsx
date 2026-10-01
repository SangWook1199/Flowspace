import { SPRINT_COLORS } from "../../utils/color";

// 서버가 받는 스프린트 색(WorkspaceColor 7종)과 1:1로 맞춰져 있어요.
const colors = SPRINT_COLORS.map((color) => color.hex);

export default function ColorPicker({ value, onChange }) {
  return (
    <section className="colorPicker">
      <label>스프린트 색상</label>

      <div>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${color} 색상`}
            onClick={() => onChange(color)}
            className={value === color ? "picked" : ""}
            style={{ backgroundColor: color }}
          >
            {value === color && "✓"}
          </button>
        ))}
      </div>

      <small>스프린트를 구분할 색상을 선택하세요.</small>
    </section>
  );
}