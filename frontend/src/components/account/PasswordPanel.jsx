import { useId, useState } from "react";

import { useAuth } from "../../context/useAuth";
import { getErrorMessage } from "../../utils/apiError";

const MIN_LENGTH = 8;
const MAX_LENGTH = 20;

// 비밀번호 탭: 현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿔요.
// 바꾸면 다른 기기에서는 로그아웃되고, 지금 쓰는 기기는 그대로 이어져요.
// 구글·마이크로소프트로 가입한 계정은 비밀번호가 없어서 안내만 보여줘요.
export default function PasswordPanel() {
  const { user, changePassword } = useAuth();

  const currentId = useId();
  const nextId = useId();
  const confirmId = useId();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }

  if (user && user.provider && user.provider !== "LOCAL") {
    return (
      <div className="wsSettings__panel">
        <h2>비밀번호</h2>
        <p className="wsSettings__hint">
          {user.provider === "GOOGLE" ? "Google" : "Microsoft"} 계정으로 로그인하고 있어서 FlowSpace 비밀번호가 없어요.
          비밀번호는 해당 계정에서 관리해주세요.
        </p>
      </div>
    );
  }

  const lengthOk = next.length >= MIN_LENGTH && next.length <= MAX_LENGTH;
  const matches = next === confirm;
  const valid = current !== "" && lengthOk && matches;

  // 입력 중에 바로 알려주는 한 줄(저장을 누른 뒤의 서버 오류는 message로 보여줘요).
  const hint = !next
    ? `${MIN_LENGTH}~${MAX_LENGTH}자로 입력해주세요`
    : !lengthOk
      ? `${MIN_LENGTH}~${MAX_LENGTH}자로 입력해주세요`
      : confirm && !matches
        ? "새 비밀번호가 서로 달라요"
        : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage({ type: "ok", text: "비밀번호를 바꿨어요. 다른 기기에서는 다시 로그인해야 해요." });
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "비밀번호를 바꾸지 못했어요.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="wsSettings__panel" onSubmit={handleSubmit}>
      <h2>비밀번호</h2>

      {/* 비밀번호 관리자가 계정 이름을 알 수 있도록 숨겨진 아이디 칸을 둬요. */}
      <input type="text" name="username" autoComplete="username" value={user?.email ?? ""} readOnly hidden />

      <div className="wsSettings__field">
        <label htmlFor={currentId}>현재 비밀번호</label>
        <input
          id={currentId}
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>

      <div className="wsSettings__field">
        <label htmlFor={nextId}>새 비밀번호</label>
        <input
          id={nextId}
          type="password"
          autoComplete="new-password"
          maxLength={MAX_LENGTH}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        {hint && <small>{hint}</small>}
      </div>

      <div className="wsSettings__field">
        <label htmlFor={confirmId}>새 비밀번호 확인</label>
        <input
          id={confirmId}
          type="password"
          autoComplete="new-password"
          maxLength={MAX_LENGTH}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {message && (
        <p className={`wsSettings__msg ${message.type}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}

      <div className="wsSettings__actions">
        <button type="submit" className="wsSettings__primary" disabled={!valid || saving}>
          {saving ? "변경 중…" : "비밀번호 변경"}
        </button>
      </div>
    </form>
  );
}
