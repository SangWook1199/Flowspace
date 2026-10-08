import { useEffect, useId, useState } from "react";
import { Smile } from "lucide-react";

import EmojiPicker from "../../common/EmojiPicker";
import WorkspaceIcon from "../../common/WorkspaceIcon";
import { WORKSPACE_COLORS, isLightHex } from "../../../utils/color";
import { getInitial } from "../../../utils/initial";
import { getErrorMessage } from "../../../utils/apiError";
import { roleLabel } from "../../../utils/workspaceRole";

// 이니셜은 최대 2글자(이모지는 Array.from으로 한 글자로 세요).
const limitInitials = (value) => Array.from(value).slice(0, 2).join("").toUpperCase();

// 일반 탭: 내 역할 + 이름·이니셜·색·아이콘. 수정은 소유자만 할 수 있어요(서버도 똑같이 막아요).
// 소유자가 아니면 같은 내용을 읽기 전용으로만 보여줘요.
export default function GeneralPanel({ workspace, isOwner, onSave }) {
  const nameId = useId();
  const initialsId = useId();
  const colorLabelId = useId();

  const [name, setName] = useState(workspace.name);
  const [initials, setInitials] = useState(workspace.initials);
  const [icon, setIcon] = useState(workspace.icon);
  const [color, setColor] = useState(workspace.color);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }

  // 이모지 선택창이 떠 있을 땐 Esc가 모달 전체가 아니라 선택창만 닫아요(모달 쪽은 선택창이 있으면 Esc를 무시해요).
  useEffect(() => {
    if (!pickerOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pickerOpen]);

  const trimmedName = name.trim();
  const dirty =
    trimmedName !== workspace.name ||
    icon !== workspace.icon ||
    color.toLowerCase() !== workspace.color.toLowerCase() ||
    (!icon && initials.trim() !== workspace.initials);
  const valid = trimmedName.length > 0 && (Boolean(icon) || initials.trim().length > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOwner || !dirty || !valid || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      await onSave({
        name: trimmedName,
        // 아이콘을 쓰는 동안에도 서버엔 이니셜이 필요해서, 비어 있으면 이름 첫 글자로 채워요.
        initials: initials.trim() || getInitial(trimmedName),
        color,
        icon,
      });
      setMessage({ type: "ok", text: "저장했어요." });
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "저장하지 못했어요.") });
    } finally {
      setSaving(false);
    }
  };

  const preview = { ...workspace, name, color, icon, initials: initials || getInitial(name, "H") };

  return (
    <form className="wsSettings__panel" onSubmit={handleSubmit}>
      <h2>일반</h2>

      <div className="wsSettings__row">
        <span className="wsSettings__label">내 역할</span>
        <span className={`wsSettings__role ${isOwner ? "owner" : workspace.role === "ADMIN" ? "admin" : ""}`}>
          {roleLabel(workspace.role)}
        </span>
      </div>

      {!isOwner && (
        <p className="wsSettings__hint">워크스페이스 정보는 소유자만 수정할 수 있어요.</p>
      )}

      <div className="wsSettings__iconRow">
        <div className="wsSettings__iconWrap">
          {isOwner ? (
            <button
              type="button"
              className="wsSettings__iconBtn"
              aria-label="워크스페이스 아이콘 선택"
              aria-haspopup="true"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((v) => !v)}
            >
              <WorkspaceIcon workspace={preview} className="wsSettings__icon" />
              <span className="wsSettings__iconBadge" aria-hidden="true">
                <Smile size={13} />
              </span>
            </button>
          ) : (
            <WorkspaceIcon workspace={preview} className="wsSettings__icon" />
          )}

          {pickerOpen && (
            <EmojiPicker
              onSelect={(emoji) => {
                setIcon(emoji);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        {isOwner && (
          <div className="wsSettings__iconHelp">
            {icon ? (
              <button type="button" className="wsSettings__link" onClick={() => setIcon("")}>
                이니셜로 되돌리기
              </button>
            ) : (
              <small>아이콘을 눌러 이모지로 바꿀 수 있어요</small>
            )}
          </div>
        )}
      </div>

      <div className="wsSettings__field">
        <label htmlFor={nameId}>이름</label>
        <input
          id={nameId}
          type="text"
          value={name}
          maxLength={50}
          disabled={!isOwner}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {!icon && (
        <div className="wsSettings__field">
          <label htmlFor={initialsId}>이니셜</label>
          <input
            id={initialsId}
            type="text"
            value={initials}
            placeholder="HE"
            disabled={!isOwner}
            onChange={(e) => setInitials(limitInitials(e.target.value))}
          />
          <small>최대 2글자</small>
        </div>
      )}

      <div className="wsSettings__field">
        <span id={colorLabelId} className="wsSettings__labelText">
          대표 색상
        </span>
        <div className="wsSettings__colors" role="group" aria-labelledby={colorLabelId}>
          {WORKSPACE_COLORS.map(({ name: colorName, hex }) => (
            <button
              key={colorName}
              type="button"
              className={`wsSettings__chip ${color.toLowerCase() === hex.toLowerCase() ? "selected" : ""} ${
                isLightHex(hex) ? "light" : ""
              }`}
              style={{ background: hex }}
              aria-label={`색상 ${colorName}`}
              aria-pressed={color.toLowerCase() === hex.toLowerCase()}
              disabled={!isOwner}
              onClick={() => setColor(hex)}
            />
          ))}
        </div>
      </div>

      {message && (
        <p className={`wsSettings__msg ${message.type}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}

      {isOwner && (
        <div className="wsSettings__actions">
          <button type="submit" className="wsSettings__primary" disabled={!dirty || !valid || saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      )}
    </form>
  );
}
