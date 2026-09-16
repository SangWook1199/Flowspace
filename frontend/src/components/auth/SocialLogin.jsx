import googleIcon from "../../assets/login/google-icon.png";
import microsoftIcon from "../../assets/login/microsoft-icon.png";

export default function SocialLogin() {
  const handleGoogleLogin = () => {
    // TODO : Google OAuth API
  };

  const handleMicrosoftLogin = () => {
    // TODO : Kakao OAuth API
  };

  return (
    <div className="social-login">
      <div className="social-divider">
        <span>또는</span>
      </div>

      <div className="social-buttons">
        <button
          type="button"
          className="social-button google"
          onClick={handleGoogleLogin}
        >
          <img src={googleIcon} alt="Google" />
          Google
        </button>

        <button
          type="button"
          className="social-button microsoft"
          onClick={handleMicrosoftLogin}
        >
          <img src={microsoftIcon} alt="Microsoft" />
          Microsoft
        </button>
      </div>
    </div>
  );
}
