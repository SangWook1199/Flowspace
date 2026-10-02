import { useId, useState } from "react";
import { ArrowLeft, ArrowRight, Smile } from "lucide-react";

import EmojiPicker from "../common/EmojiPicker";
import WorkspaceIcon from "../common/WorkspaceIcon";
import { isLightHex } from "../../utils/color";

export default function WorkspaceAppearanceStep({
  workspace,
  colors,
  onInitialsChange,
  onColorChange,
  onIconChange,
  onPrev,
  onNext,
}) {
  // 아이콘을 고르면 이니셜은 안 써도 돼요(서버엔 이니셜도 같이 가서, 비어 있으면 이름에서 만들어요).
  const isValid = Boolean(workspace.icon) || workspace.initials.trim().length > 0;
  const [pickerOpen, setPickerOpen] = useState(false);
  const initialsId = useId();
  const colorLabelId = useId();

  return (
    <section className="workspace-step">
      <span className="step-label">STEP 2 / 3</span>

      <h1>워크스페이스 모양을 꾸며보세요</h1>

      <p className="step-description">
        아이콘(또는 이니셜)과 대표 색상은 사이드바와 팀 화면에서 사용됩니다.
      </p>

      {/* 미리보기 — 아이콘을 누르면 이모지를 고를 수 있어요(페이지 아이콘과 같은 방식). 고르면 이니셜 대신 이 아이콘이 보여요. */}
      <div className="workspace-appearance-preview">
        <div className="workspace-preview-icon">
          <button
            type="button"
            className="workspace-preview-btn"
            aria-label="워크스페이스 아이콘 선택"
            aria-haspopup="true"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((v) => !v)}
          >
            <WorkspaceIcon
              workspace={{ ...workspace, initials: workspace.initials || "H" }}
              className="workspace-preview-avatar"
            />
            <span className="workspace-preview-badge" aria-hidden="true">
              <Smile size={14} />
            </span>
          </button>

          {pickerOpen && (
            <EmojiPicker
              onSelect={(emoji) => {
                onIconChange(emoji);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        <strong>{workspace.name || "Human EXE"}</strong>
        <span>워크스페이스 미리보기</span>

        {workspace.icon ? (
          <button type="button" className="workspace-icon-clear" onClick={() => onIconChange("")}>
            이니셜로 되돌리기
          </button>
        ) : (
          <small className="workspace-preview-tip">아이콘을 눌러 이모지로 바꿀 수 있어요</small>
        )}
      </div>

      {/* 이니셜 — 이모지 아이콘을 고르지 않았을 때만 입력해요. */}
      {!workspace.icon && (
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
      )}

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
              }${isLightHex(color) ? " light" : ""}`}
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
