export default function CircleProgress({ value }) {
  const degree = value * 3.6;

  return (
    <div
      className="circle-progress"
      style={{
        background: `conic-gradient(#22c55e ${degree}deg, #e5e7eb ${degree}deg)`,
      }}
    >
      <div className="circle-progress__inner">
        <strong>{value}</strong>
        <span>%</span>
      </div>
    </div>
  );
}
