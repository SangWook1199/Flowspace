import { useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";

import SocialLogin from "./SocialLogin";
import TermsModal from "./TermsModal";
import ResendVerification from "./ResendVerification";
import { useAuth } from "../../context/useAuth";
import { getInitial } from "../../utils/initial";
import { getErrorMessage, getErrorCode } from "../../utils/apiError";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_RULE_TEXT } from "../../utils/passwordRule";

// 입력 규칙. 닉네임 30자는 users.nickname 컬럼(length 30)에 맞춘 값이라,
// 이보다 길게 보내면 서버에서 저장하다 실패해요.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_MAX_LENGTH = 30;

export default function SignupForm() {
  const navigate = useNavigate();
  const { signup } = useAuth();

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
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // 약관 보기 창: null(닫힘) | "terms" | "privacy"
  const [termsTab, setTermsTab] = useState(null);

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
  // 가입 메일을 보냈다고 안내 중인 이메일 (null이면 가입 폼을 보여줘요)
  const [sentTo, setSentTo] = useState(null);

  // 단계를 오갈 때 이전 단계에서 났던 오류가 남아 있으면, 지금 단계와
  // 상관없는 메시지가 보이니까 같이 지워요.
  const goStep = (next) => {
    setError("");
    setStep(next);
  };

  const handleSignup = async () => {
    if (!signupValid || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    // 공백만 다른 이메일/닉네임이 따로 가입되지 않도록 보내기 전에 다듬어요.
    const email = form.email.trim();
    const nickname = form.nickname.trim();

    try {
      // 가입하면 인증 메일이 가요. 로그인은 메일의 링크로 인증한 뒤에 할 수 있어서 안내 화면으로 넘어가요.
      await signup({
        email,
        password: form.password,
        nickname,
      });

      setSentTo(email);
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
  const passwordValid = form.password.length >= PASSWORD_MIN_LENGTH && form.password.length <= PASSWORD_MAX_LENGTH;
  const confirmValid = form.password === form.confirmPassword;

  // 1단계에서 지금 보여줄 규칙 위반 메시지 하나(위에서부터 우선순위).
  const step1Hint =
    touched.email && form.email && !emailValid
      ? "올바른 이메일 형식이 아니에요."
      : touched.password && form.password && !passwordValid
        ? `비밀번호는 ${PASSWORD_RULE_TEXT}로 입력해 주세요.`
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

  if (sentTo) {
    return (
      <div className="login-form">
        <span className="login-label">SIGN UP</span>

        <h1>인증 메일을 보냈어요</h1>
        <p>
          <b>{sentTo}</b>로 인증 메일을 보냈어요. 메일의 인증 버튼을 누르면 가입이 끝나요. 링크는 24시간 동안만 쓸 수 있고, 메일이 안
          보이면 스팸함도 확인해주세요.
        </p>

        <button type="button" className="login-button" onClick={() => navigate("/login")}>
          로그인으로 가기
        </button>

        <ResendVerification email={sentTo} startWaiting />
      </div>
    );
  }

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
                placeholder={`비밀번호를 입력하세요 (${PASSWORD_RULE_TEXT})`}
                maxLength={PASSWORD_MAX_LENGTH}
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
                {previewText ? <span>{previewText}</span> : <User size={28} />}
              </div>
            </div>

            <p>닉네임 첫 글자가 프로필로 표시돼요. 사진은 가입 후 내 계정에서 올릴 수 있어요.</p>
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
              <span>
                <button type="button" className="signup-terms-link" onClick={(e) => { e.preventDefault(); setTermsTab("terms"); }}>
                  이용약관
                </button>{" "}
                및{" "}
                <button type="button" className="signup-terms-link" onClick={(e) => { e.preventDefault(); setTermsTab("privacy"); }}>
                  개인정보 처리방침
                </button>
                에 동의합니다.
              </span>
            </label>
          </div>

          {termsTab && (
            <TermsModal
              initialTab={termsTab}
              onClose={() => setTermsTab(null)}
              onAgree={() => {
                updateField("agree", true);
                setTermsTab(null);
              }}
            />
          )}

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
