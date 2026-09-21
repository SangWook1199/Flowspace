import "../../styles/common.css";
import flowspaceIcon from "../../assets/flowspace-icon.png";

// 예전엔 span/i/b 세 조각으로 로고 아이콘을 CSS로 직접 그렸는데, 이제
// assets/flowspace-icon.png(실제 브랜드 아이콘)가 생겨서 그걸 그대로
// 써요. 아이콘 자체가 이미 그라디언트 배경 + 둥근 사각형이라, 감싸던
// .logoMark의 배경/그라디언트는 필요 없어지고 그림자만 살짝 더했어요.
//
// onClick이 오면(사이드바에서 홈으로 가게 넘겨줌) 로고 전체(아이콘+글자)를
// <button>으로 그려서 눌러도 되게 해요 — 거의 모든 앱에서 로고를 누르면
// 홈으로 가는 익숙한 패턴이라, 이미 있는 "홈" 네비 항목과 겹쳐도 어디서든
// 바로 홈으로 갈 수 있는 지름길이 하나 느는 거라 나쁠 게 없어요. onClick이
// 없으면(재사용 시 대비) 예전처럼 그냥 div로 그려서 클릭 가능한 것처럼
// 보이지 않게 해요.
export default function FlowSpaceLogo({ onClick }) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      className="flowspace-brand"
      onClick={onClick}
    >
      <img className="flowspace-brand__icon" src={flowspaceIcon} alt="FlowSpace" />
      <strong className="flowspace-brand__name">
        <span className="flowspace-brand__name--dark">Flow</span>
        <span className="flowspace-brand__name--accent">Space</span>
      </strong>
    </Tag>
  );
}
