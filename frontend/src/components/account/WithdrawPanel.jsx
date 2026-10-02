import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";

import * as authApi from "../../api/auth";
import { useAuth } from "../../context/useAuth";
import { getErrorMessage } from "../../utils/apiError";

const nameList = (list) => list.map((w) => `'${w.name}'`).join(", ");

// 회원 탈퇴 탭: 탈퇴하면 어떤 일이 생기는지 먼저 보여주고, 본인 확인(이메일 계정은 비밀번호,
// 구글·마이크로소프트 계정은 이메일 입력)을 한 뒤에 탈퇴해요.
// 다른 멤버가 있는 워크스페이스의 소유자는 소유권을 넘기거나 멤버를 내보내기 전에는 탈퇴할 수 없어요(서버도 막아요).
export default function WithdrawPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const confirmId = useId();

  const isLocal = !user?.provider || user.provider === "LOCAL";

  const [check, setCheck] = useState(null);
  const [checkError, setCheckError] = useState(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    authApi
      .getWithdrawCheck()
      .then((data) => {
        if (!cancelled) setCheck(data);
      })
      .catch((err) => {
        if (!cancelled) setCheckError(getErrorMessage(err, "탈퇴 정보를 불러오지 못했어요."));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const ready = check?.canWithdraw && value.trim() !== "" && !busy;

  const handleWithdraw = async () => {
    if (!ready) return;
    if (!window.confirm("정말 탈퇴할까요? 탈퇴하면 되돌릴 수 없어요.")) return;

    setBusy(true);
    setError(null);
    try {
      await authApi.withdraw(isLocal ? { password: value } : { confirmEmail: value.trim() });
      // 서버가 계정을 정리했으니 이 기기의 로그인 정보도 지우고 로그인 화면으로 보내요.
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "탈퇴하지 못했어요."));
      setBusy(false);
    }
  };

  return (
    <div className="wsSettings__panel">
      <h2 className="wsSettings__dangerTitle">회원 탈퇴</h2>

      <div className="wsSettings__danger">
        <strong>FlowSpace 계정 삭제</strong>
        <p>
          이름·이메일·프로필 사진 같은 개인정보가 삭제되고, 이 계정으로는 다시 로그인할 수 없어요. 내가 남긴 작업과
          댓글은 다른 멤버들에게 필요해서 <b>탈퇴한 사용자</b>로 바뀌어 남아요. 되돌릴 수 없어요.
        </p>

        {checkError && (
          <p className="wsSettings__hint" role="alert">
            {checkError}
          </p>
        )}

        {check && check.blocking.length > 0 && (
          <p className="wsSettings__hint" role="alert">
            다른 멤버가 있는 워크스페이스({nameList(check.blocking)})의 소유자라서 아직 탈퇴할 수 없어요. 소유권을
            다른 멤버에게 넘기거나 멤버를 내보낸 뒤에 다시 시도해주세요.
          </p>
        )}

        {check && check.deleting.length > 0 && (
          <p>
            나 혼자 쓰는 워크스페이스 <b>{nameList(check.deleting)}</b>은(는) 안의 페이지·작업과 함께 삭제돼요.
          </p>
        )}

        {check && check.leaving.length > 0 && (
          <p>
            멤버로 있는 워크스페이스 <b>{nameList(check.leaving)}</b>에서는 자동으로 나가요.
          </p>
        )}

        <label htmlFor={confirmId}>
          {isLocal ? (
            "확인을 위해 현재 비밀번호를 입력하세요."
          ) : (
            <>
              확인을 위해 계정 이메일 <b>{user?.email}</b>을(를) 입력하세요.
            </>
          )}
        </label>
        <input
          id={confirmId}
          type={isLocal ? "password" : "text"}
          value={value}
          placeholder={isLocal ? "" : user?.email}
          autoComplete={isLocal ? "current-password" : "off"}
          onChange={(e) => setValue(e.target.value)}
        />

        {error && (
          <p className="wsSettings__msg error" role="alert">
            {error}
          </p>
        )}

        <button type="button" className="wsSettings__dangerBtn" disabled={!ready} onClick={handleWithdraw}>
          {busy ? "탈퇴 중…" : "회원 탈퇴"}
        </button>
      </div>
    </div>
  );
}
