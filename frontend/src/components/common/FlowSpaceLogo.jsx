import { useNavigate } from "react-router-dom";
import "../../styles/common.css";

export default function FlowSpaceLogo() {
  const navigate = useNavigate();

  return (
    <button
      className="flowspace-brand flowspace-logo-btn"
      onClick={() => navigate("/")}
      type="button"
    >
      <div className="logoMark">
        <span />
        <i />
        <b />
      </div>

      <strong className="logo">FlowSpace</strong>
    </button>
  );
}
