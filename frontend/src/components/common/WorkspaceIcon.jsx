import { isLightHex } from "../../utils/color";

// 워크스페이스 아이콘: 이모지 아이콘이 있으면 그걸, 없으면 이니셜을 대표 색 배경 위에 보여줘요.
// 크기·모양은 쓰는 자리의 클래스(className)가 정해요(사이드바 40px, 미리보기 82px 등).
// 이모지일 때는 workspace-icon--emoji가 붙어서 글자(이니셜)보다 크게 보여줘요.
// 대표 색이 흰색이면 글자가 안 보이고 배경과 구분이 안 돼서, 진한 글자색과 얇은 테두리를 줘요.
export default function WorkspaceIcon({ workspace, className = "" }) {
  const light = isLightHex(workspace.color);
  return (
    <span
      className={`${className}${workspace.icon ? " workspace-icon--emoji" : ""}${light ? " workspace-icon--light" : ""}`}
      style={{ background: workspace.color, color: light ? "#334155" : "#fff" }}
    >
      {workspace.icon || workspace.initials}
    </span>
  );
}
