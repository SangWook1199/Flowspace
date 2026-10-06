import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";

import * as authApi from "../../api/auth";
import { useAuth } from "../../context/useAuth";
import { getAvatarTone } from "../../utils/avatarColor";
import { getErrorMessage } from "../../utils/apiError";
import { getInitial } from "../../utils/initial";

const PROFILE_MAX_BYTES = 5 * 1024 * 1024;
const BIO_MAX = 100;
const NICKNAME_MAX = 30;

// 프로필 탭: 사진 · 이름 · 한 줄 소개를 바꿔요(이메일은 보여주기만 해요).
// 사진을 고르면 미리 보여주다가 "저장"을 눌러야 올라가고, "사진 삭제"는 바로 지워져요.
export default function ProfilePanel({ onSaved }) {
  const { user, setUser } = useAuth();

  const nicknameId = useId();
  const bioId = useId();
  const fileInputRef = useRef(null);

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  // 이미지 주소가 깨져 있으면(삭제/만료) 이니셜로 대신 보여줘요.
  const [failedImage, setFailedImage] = useState(null);
  const savedImage = user?.profileImageUrl && failedImage !== user.profileImageUrl ? user.profileImageUrl : null;
  const shownImage = previewUrl ?? savedImage;

  const trimmedNickname = nickname.trim();
  const dirty =
    trimmedNickname !== (user?.nickname ?? "") || bio.trim() !== (user?.bio ?? "") || Boolean(file);
  const valid = trimmedNickname.length > 0;

  const handleFile = (e) => {
    const picked = e.target.files?.[0];
    // 같은 파일을 다시 골라도 change 이벤트가 오도록 값을 비워둬요.
    e.target.value = "";
    if (!picked) return;

    if (!picked.type.startsWith("image/")) {
      setMessage({ type: "error", text: "이미지 파일만 프로필 사진으로 올릴 수 있어요." });
      return;
    }

    if (picked.size > PROFILE_MAX_BYTES) {
      setMessage({ type: "error", text: "프로필 사진은 5MB 이하만 올릴 수 있어요." });
      return;
    }

    setMessage(null);
    setFile(picked);
  };

  const handleRemoveImage = async () => {
    // 아직 올리지 않은 새 사진이면 선택만 취소해요.
    if (file) {
      setFile(null);
      return;
    }

    if (saving) return;
    if (!window.confirm("프로필 사진을 삭제할까요?")) return;
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await authApi.deleteProfileImage();
      setUser(data);
      setMessage({ type: "ok", text: "사진을 삭제했어요." });
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "사진을 삭제하지 못했어요.") });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dirty || !valid || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify({ nickname: trimmedNickname, bio: bio.trim() })], { type: "application/json" }),
      );
      if (file) formData.append("image", file);

      const { data } = await authApi.updateProfile(formData);
      setUser(data);
      setFile(null);
      setNickname(data.nickname);
      setBio(data.bio ?? "");
      setMessage({ type: "ok", text: "저장했어요." });
      onSaved?.();
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "저장하지 못했어요.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="wsSettings__panel" onSubmit={handleSubmit}>
      <h2>프로필</h2>

      <div className="accountAvatarRow">
        <button
          type="button"
          className={`accountAvatar avatar ${getAvatarTone(user?.userId ?? user?.id)}`}
          aria-label="프로필 사진 변경"
          onClick={() => fileInputRef.current?.click()}
        >
          {shownImage ? (
            <img src={shownImage} alt="" onError={() => setFailedImage(shownImage)} />
          ) : (
            getInitial(trimmedNickname || user?.nickname)
          )}
          <span className="accountAvatar__badge" aria-hidden="true">
            <Camera size={13} />
          </span>
        </button>

        <div className="accountAvatarHelp">
          <button type="button" className="wsSettings__link" onClick={() => fileInputRef.current?.click()}>
            사진 변경
          </button>
          {(file || savedImage) && (
            <button type="button" className="wsSettings__link" onClick={handleRemoveImage} disabled={saving}>
              {file ? "선택 취소" : "사진 삭제"}
            </button>
          )}
          <small>5MB 이하의 이미지</small>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </div>

      <div className="wsSettings__field">
        <label htmlFor={nicknameId}>이름</label>
        <input
          id={nicknameId}
          type="text"
          value={nickname}
          maxLength={NICKNAME_MAX}
          onChange={(e) => setNickname(e.target.value)}
        />
        <small>멤버 목록과 멘션에 이 이름이 보여요</small>
      </div>

      <div className="wsSettings__field">
        <label htmlFor={bioId}>한 줄 소개</label>
        <input
          id={bioId}
          type="text"
          value={bio}
          maxLength={BIO_MAX}
          placeholder="나를 소개하는 한 줄을 적어보세요"
          onChange={(e) => setBio(e.target.value)}
        />
        <small>
          {bio.length} / {BIO_MAX}
        </small>
      </div>

      <div className="wsSettings__field">
        <label>이메일</label>
        <input type="text" value={user?.email ?? ""} disabled readOnly />
      </div>

      {message && (
        <p className={`wsSettings__msg ${message.type}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}

      <div className="wsSettings__actions">
        <button type="submit" className="wsSettings__primary" disabled={!dirty || !valid || saving}>
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
