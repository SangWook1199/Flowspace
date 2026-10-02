import { useId } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function WorkspaceAppearanceStep({
  workspace,
  colors,
  onInitialsChange,
  onColorChange,
  onPrev,
  onNext,
}) {
  const isValid = workspace.initials.trim().length > 0;
  const initialsId = useId();
  const colorLabelId = useId();

  return (
    <section className="workspace-step">
      <span className="step-label">STEP 2 / 3</span>

      <h1>워크스페이스 모양을 꾸며보세요</h1>

      <p className="step-description">
        이니셜과 대표 색상은 사이드바와 팀 화면에서 사용됩니다.
      </p>

      {/* 미리보기 */}
      <div className="workspace-appearance-preview">
        <div
          className="workspace-preview-avatar"
          style={{ background: workspace.color }}
        >
          {workspace.initials || "H"}
        </div>

        <strong>{workspace.name || "Human EXE"}</strong>
        <span>워크스페이스 미리보기</span>
      </div>

      {/* 이니셜 */}
      <div className="workspace-field">
        <label htmlFor={initialsId}>이니셜</label>

        <div className="workspace-input">
          {/* maxLength는 이모지 한 글자를 2로 세서 "A😀" 같은 입력을 막아요 —
              글자 수 제한(최대 2글자)은 onInitialsChange 쪽에서 Array.from으로 해요. */}
          <input
            id={initialsId}
            type="text"
            value={workspace.initials}
            placeholder="HE"
            onChange={(e) => onInitialsChange(e.target.value)}
          />

          <small>최대 2글자</small>
        </div>
      </div>

      {/* 색상 */}
      <div className="workspace-field">
        <label id={colorLabelId}>대표 색상</label>

        <div className="workspace-color-grid" role="group" aria-labelledby={colorLabelId}>
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-chip ${
                workspace.color === color ? "selected" : ""
              }`}
              style={{ background: color }}
              aria-label={`색상 ${color}`}
              aria-pressed={workspace.color === color}
              onClick={() => onColorChange(color)}
            />
          ))}
        </div>
      </div>

      {/* 버튼 */}
      <div className="workspace-actions between">
        <button type="button" className="workspace-prev" onClick={onPrev}>
          <ArrowLeft size={18} />
          이전
        </button>

        <button type="button" className="workspace-next" disabled={!isValid} onClick={onNext}>
          다음
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}
