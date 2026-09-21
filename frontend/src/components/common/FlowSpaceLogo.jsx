import "../../styles/common.css";
import flowspaceIcon from "../../assets/flowspace-icon.png";

// 예전엔 span/i/b 세 조각으로 로고 아이콘을 CSS로 직접 그렸는데, 이제
// assets/flowspace-icon.png(실제 브랜드 아이콘)가 생겨서 그걸 그대로
// 써요. 아이콘 자체가 이미 그라디언트 배경 + 둥근 사각형이라, 감싸던
// .logoMark의 배경/그라디언트는 필요 없어지고 그림자만 살짝 더했어요.
export default function FlowSpaceLogo() {
  return (
    <div className="flowspace-brand">
      <img className="flowspace-brand__icon" src={flowspaceIcon} alt="FlowSpace" />
      <strong className="flowspace-brand__name">
        <span className="flowspace-brand__name--dark">Flow</span>
        <span className="flowspace-brand__name--accent">Space</span>
      </strong>
    </div>
  );
}
