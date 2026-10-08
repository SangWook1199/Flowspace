import { SPRINT_COLORS } from "../../utils/color";

// 서버가 받는 스프린트 색(WorkspaceColor)과 1:1로 맞춰져 있어요.
// 흰색은 워크스페이스 아이콘(이모지)용이라 스프린트 색 선택지에서는 뺐어요. 이미 흰색인 스프린트는 그대로 보여요.
const colors = SPRINT_COLORS.filter((color) => color.name !== "WHITE").map((color) => color.hex);

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