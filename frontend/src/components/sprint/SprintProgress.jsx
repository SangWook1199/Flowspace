import { clampPercent } from "../../utils/date";

export default function SprintProgress({ progress, color }) {
  // 0~100 밖의 값이나 NaN이 와도 막대/숫자가 깨지지 않게 잘라서 써요.
  const percent = clampPercent(progress);

  return (
    <div className="sprintProgress">
      <span>진행률</span>
      <strong className={color}>{percent}%</strong>
      <div>
        <i className={color} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
