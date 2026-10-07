import { isLightHex } from "../../utils/color";

// 작업 상태 아이콘: 완료만 체크 표시가 든 채운 원이고, 나머지(할 일·진행 중 등)는 빈 원이에요.
// 상태 이름은 글자로 따로 나오니까 모양은 완료 여부만 구분해요.
// color는 그 상태에 DB에서 지정한 색이에요(초록 고정이 아니에요). 흰색 상태는 흰 바탕에서 안 보여서 진한 테두리·체크로 그려요.
export default function StatusIcon({ category, color = "#64748B", size = 14 }) {
  const common = { width: size, height: size, viewBox: "0 0 16 16", "aria-hidden": true, style: { color, flex: "none" } };

  const light = isLightHex(color);

  if (category === "DONE") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="7" fill="currentColor" stroke={light ? "#111827" : "none"} strokeWidth="1.2" />
        <path d="M5 8.2l2 2L11 6" fill="none" stroke={light ? "#111827" : "#fff"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="6" fill="none" stroke={light ? "#111827" : "currentColor"} strokeWidth="1.6" />
    </svg>
  );
}
