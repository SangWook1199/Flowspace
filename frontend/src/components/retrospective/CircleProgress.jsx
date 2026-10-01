import { clampPercent } from "../../utils/date";

export default function CircleProgress({ value }) {
  // 값이 null/NaN이거나 100을 넘으면 원이 깨지거나 "NaN%"가 보여서 0~100으로 맞춰요.
  const percent = clampPercent(value);
  const degree = percent * 3.6;

  return (
    <div
      className="circle-progress"
      role="img"
      aria-label={`완료율 ${percent}%`}
      style={{
        background: `conic-gradient(#22c55e ${degree}deg, #e5e7eb ${degree}deg)`,
      }}
    >
      <div className="circle-progress__inner">
        <strong>{percent}</strong>
        <span>%</span>
      </div>
    </div>
  );
}
