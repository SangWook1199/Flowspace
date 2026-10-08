import { useId, useState } from "react";

import { getErrorMessage } from "../../../utils/apiError";
import useDialog from "../../../context/useDialog";

// 위험 구역: 일반 멤버는 "나가기", 소유자는 "삭제"(이름을 직접 입력해야 눌려요).
// 내가 속한 워크스페이스가 이것 하나뿐이면 둘 다 막혀요(서버도 막아요) — 쓸 곳이 없어지니까요.
export default function DangerPanel({ workspace, isOwner, isOnlyWorkspace, onLeave, onDelete }) {
  const { confirm } = useDialog();
  const confirmId = useId();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err, "처리하지 못했어요."));
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    const ok = await confirm({
      title: "워크스페이스 나가기",
      message: `'${workspace.name}' 워크스페이스에서 나갈까요?\n다시 들어오려면 초대를 받아야 해요.`,
      confirmLabel: "나가기",
      danger: true,
    });
    if (!ok) return;
    run(onLeave);
  };

  const nameMatches = typed.trim() === workspace.name.trim();

  return (
    <div className="wsSettings__panel">
      <h2 className="wsSettings__dangerTitle">위험 구역</h2>

      <div className="wsSettings__danger">
        {isOwner ? (
          <>
            <strong>워크스페이스 삭제</strong>
            <p>
              워크스페이스와 안의 페이지·스프린트·작업·회고가 모두 사라지고, 되돌릴 수 없어요.
              소유자는 워크스페이스를 나갈 수 없고, 소유권을 넘기면 나갈 수 있어요.
            </p>

            {isOnlyWorkspace ? (
              <p className="wsSettings__hint">
                내 마지막 워크스페이스는 삭제할 수 없어요. 새 워크스페이스를 만든 뒤에 삭제해주세요.
              </p>
            ) : (
              <>
                <label htmlFor={confirmId}>
                  확인을 위해 워크스페이스 이름 <b>{workspace.name}</b>을(를) 입력하세요.
                </label>
                <input
                  id={confirmId}
                  type="text"
                  value={typed}
                  placeholder={workspace.name}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="wsSettings__dangerBtn"
                  disabled={!nameMatches || busy}
                  onClick={() => run(onDelete)}
                >
                  {busy ? "삭제 중…" : "워크스페이스 삭제"}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <strong>워크스페이스 나가기</strong>
            <p>나가면 이 워크스페이스의 내용을 더 이상 볼 수 없어요. 다시 들어오려면 초대를 받아야 해요.</p>

            {isOnlyWorkspace ? (
              <p className="wsSettings__hint">내 마지막 워크스페이스에서는 나갈 수 없어요.</p>
            ) : (
              <button type="button" className="wsSettings__dangerBtn" disabled={busy} onClick={handleLeave}>
                {busy ? "나가는 중…" : "워크스페이스 나가기"}
              </button>
            )}
          </>
        )}

        {error && (
          <p className="wsSettings__msg error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
