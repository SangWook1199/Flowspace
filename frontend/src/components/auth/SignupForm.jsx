import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, X } from "lucide-react";

import SocialLogin from "./SocialLogin";
import { useAuth } from "../../context/useAuth";
import * as authApi from "../../api/auth";
import { getInitial } from "../../utils/initial";
import { getErrorMessage, getErrorCode } from "../../utils/apiError";

// 입력 규칙. 닉네임 30자는 users.nickname 컬럼(length 30)에 맞춘 값이라,
// 이보다 길게 보내면 서버에서 저장하다 실패해요.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const NICKNAME_MAX_LENGTH = 30;
const PROFILE_MAX_BYTES = 5 * 1024 * 1024;

export default function SignupForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { signup, setUser } = useAuth();

  // label ↔ input 연결용 id (같은 화면에 폼이 겹쳐도 충돌하지 않게 useId)
  const uid = useId();
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const confirmId = `${uid}-confirm`;
  const nicknameId = `${uid}-nickname`;

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    nickname: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
    profile: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const updateField = (key, value) => {
    // 입력을 고치기 시작하면 이전 시도의 오류(예: 이메일 중복)는 더 이상
    // 맞지 않는 안내라서 지워요.
    setError("");
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 한 번 건드린(blur) 입력창에만 규칙 위반 메시지를 보여줘요. 아직 입력도
  // 안 한 칸에 처음부터 빨간 글씨가 뜨면 부담스럽기 때문이에요.
  const [touched, setTouched] = useState({});
  const touch = (key) => setTouched((prev) => ({ ...prev, [key]: true }));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // state는 다음 렌더에야 반영돼서 엔터 연타 같은 같은 순간의 두 번째
  // 제출을 못 막을 수 있어요. ref로 즉시 잠가요.
  const submittingRef = useRef(false);

  // 단계를 오갈 때 이전 단계에서 났던 오류가 남아 있으면, 지금 단계와
  // 상관없는 메시지가 보이니까 같이 지워요.
  const goStep = (next) => {
    setError("");
    setStep(next);
  };

  const handleProfile = (e) => {
    const file = e.target.files?.[0];

    // 같은 파일을 다시 골라도 change 이벤트가 오도록 값을 비워둬요.
    e.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 프로필 사진으로 올릴 수 있어요.");
      return;
    }

    if (file.size > PROFILE_MAX_BYTES) {
      setError("프로필 사진은 5MB 이하만 올릴 수 있어요.");
      return;
    }

    setError("");
    updateField("profile", file);
  };

  const removeProfile = () => {
    updateField("profile", null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 미리보기 주소(blob URL)는 렌더마다 새로 만들면 안 돼요. 만들 때마다
  // 브라우저 메모리에 파일이 붙잡혀서 revoke 전까지 계속 쌓여요(누수).
  // 파일이 바뀔 때 한 번만 만들고, 바뀌거나 사라질 때 revoke해요. effect
  // 안에서 만들고 정리하면 개발 모드의 이중 실행에서도 안전해요.
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!form.profile) return;

    const url = URL.createObjectURL(form.profile);
    setPreview({ file: form.profile, url });

    return () => URL.revokeObjectURL(url);
  }, [form.profile]);

  const previewImage =
    preview && preview.file === form.profile ? preview.url : null;

  const handleSignup = async () => {
    if (!signupValid || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    // 공백만 다른 이메일/닉네임이 따로 가입되지 않도록 보내기 전에 다듬어요.
    const email = form.email.trim();
    const nickname = form.nickname.trim();

    try {
      await signup(
        {
          email,
          password: form.password,
          nickname,
        },
        // 가입이 끝나면 로그인 상태로 넘어가기 전에 성공했다고 한 번 알려줘요.
        { beforeLogin: () => window.alert("회원가입에 성공했어요!") },
      );

      // 프로필 사진은 가입 요청(email/password/nickname)에는 안 들어가요
      // — 가입이 끝난 뒤 발급된 토큰으로 PATCH /auth/me/profile을 따로
      // 호출해서 붙여줘요. 여기서 실패해도 가입 자체는 이미 성공한
      // 상태라 화면 이동은 그대로 진행해요(사진은 나중에 다시 올리면 됨).
      if (form.profile) {
        try {
          const profileData = new FormData();
          profileData.append(
            "data",
            new Blob([JSON.stringify({ nickname })], {
              type: "application/json",
            }),
          );
          profileData.append("image", form.profile);

          const { data: updated } = await authApi.updateProfile(profileData);
          setUser(updated);
        } catch {
          // 프로필 사진 업로드만 실패 — 조용히 넘어가요.
        }
      }

      navigate("/");
    } catch (err) {
      const message = getErrorMessage(err, "회원가입에 실패했어요. 다시 시도해주세요.");

      // 409는 이메일 중복과 닉네임 중복 둘 다 쓰는 상태 코드라서, 응답의
      // 코드/메시지로 이메일 문제일 때만 1단계로 돌려보내요. 닉네임 중복은
      // 사용자가 지금 있는 2단계에서 바로 고치면 되니까요.
      const isEmailConflict =
        err.response?.status === 409 &&
        /EMAIL|이메일/i.test(`${getErrorCode(err) ?? ""} ${message}`);

      if (isEmailConflict) {
        setStep(1);
        touch("email");
      }

      setError(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const emailTrimmed = form.email.trim();
  const emailValid = EMAIL_PATTERN.test(emailTrimmed);
  const passwordValid = form.password.length >= PASSWORD_MIN_LENGTH;
  const confirmValid = form.password === form.confirmPassword;

  // 1단계에서 지금 보여줄 규칙 위반 메시지 하나(위에서부터 우선순위).
  const step1Hint =
    touched.email && form.email && !emailValid
      ? "올바른 이메일 형식이 아니에요."
      : touched.password && form.password && !passwordValid
        ? `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 해요.`
        : touched.confirmPassword && form.confirmPassword && !confirmValid
          ? "비밀번호가 서로 달라요."
          : "";

  const step1Valid = emailValid && passwordValid && confirmValid;

  const nicknameTrimmed = form.nickname.trim();
  const signupValid =
    step1Valid &&
    nicknameTrimmed !== "" &&
    nicknameTrimmed.length <= NICKNAME_MAX_LENGTH &&
    form.agree;

  // 이니셜은 첫 글자(이모지 같은 서로게이트 쌍도 안 깨지게)로 만들어요.
  const previewText = nicknameTrimmed ? getInitial(nicknameTrimmed) : null;

  // <form>으로 감싸서 엔터로도 "다음"/"가입하기"가 동작해요. 1단계에서는
  // 제출이 곧 "다음 단계로"예요.
  const handleSubmit = (e) => {
    e.preventDefault();

    if (step === 1) {
      if (step1Valid) goStep(2);
      return;
    }

    handleSignup();
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <span className="login-label">SIGN UP</span>

      <h1>회원가입</h1>
      <p>FlowSpace와 함께 협업을 시작하세요</p>

      {/* Progress */}
      <div className="signup-progress">
        <div className="signup-progress-bar">
          <div className={`signup-progress-fill ${step === 2 ? "full" : ""}`} />
        </div>

        <span>STEP {step} / 2</span>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <>
          <div className="login-field">
            <label htmlFor={emailId}>이메일</label>

            <div className="login-input">
              <Mail size={18} />
              <input
                id={emailId}
                type="email"
                autoComplete="username"
                placeholder="이메일을 입력하세요"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                onBlur={() => touch("email")}
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor={passwordId}>비밀번호</label>

            <div className="login-input">
              <Lock size={18} />

              <input
                id={passwordId}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={`비밀번호를 입력하세요 (${PASSWORD_MIN_LENGTH}자 이상)`}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                onBlur={() => touch("password")}
              />

              <button
                type="button"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="login-field">
            <label htmlFor={confirmId}>비밀번호 확인</label>

            <div className="login-input">
              <Lock size={18} />

              <input
                id={confirmId}
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="비밀번호를 다시 입력하세요"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                onBlur={() => touch("confirmPassword")}
              />

              <button
                type="button"
                aria-label={showConfirm ? "비밀번호 숨기기" : "비밀번호 표시"}
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {(error || step1Hint) && (
            <p className="login-error" role="alert">
              {error || step1Hint}
            </p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={!step1Valid}
          >
            다음
          </button>

          <SocialLogin />

          <div className="signup-link">
            <span>이미 계정이 있으신가요?</span>

            <button type="button" onClick={() => navigate("/login")}>
              로그인
            </button>
          </div>
        </>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <>
          <div className="profile-preview">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {previewImage ? (
                  <img src={previewImage} alt="프로필 미리보기" />
                ) : previewText ? (
                  <span>{previewText}</span>
                ) : (
                  <User size={28} />
                )}
              </div>

              {previewImage && (
                <button
                  type="button"
                  className="profile-remove"
                  aria-label="프로필 사진 제거"
                  onClick={removeProfile}
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              )}
            </div>

            <p>사진을 선택하지 않으면 닉네임 첫 글자가 프로필로 표시됩니다.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleProfile}
            />

            <button
              type="button"
              className="profile-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              프로필 사진 선택
            </button>
          </div>

          <div className="login-field">
            <label htmlFor={nicknameId}>닉네임</label>

            <div className="login-input">
              <User size={18} />

              <input
                id={nicknameId}
                type="text"
                maxLength={NICKNAME_MAX_LENGTH}
                autoComplete="nickname"
                placeholder="닉네임을 입력하세요"
                value={form.nickname}
                onChange={(e) => updateField("nickname", e.target.value)}
              />
            </div>
          </div>

          <div className="login-options signup-agree">
            <label>
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => updateField("agree", e.target.checked)}
              />
              이용약관 및 개인정보 처리방침에 동의합니다.
            </label>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <div className="signup-actions">
            <button
              type="button"
              className="signup-back"
              onClick={() => goStep(1)}
            >
              이전
            </button>

            <button
              type="submit"
              className="login-button"
              disabled={!signupValid || submitting}
            >
              {submitting ? "가입 중..." : "가입하기"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
