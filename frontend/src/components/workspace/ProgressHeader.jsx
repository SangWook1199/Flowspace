const STEPS = [
  { id: 1, title: "이름 설정" },
  { id: 2, title: "모양 설정" },
  { id: 3, title: "팀원 초대" },
];

export default function ProgressHeader({ currentStep }) {
  return (
    <section className="workspace-progress">
      {STEPS.map((step, index) => (
        <div key={step.id} className="progress-item">
          <div
            className={`progress-circle ${
              currentStep >= step.id ? "active" : ""
            }`}
          >
            {step.id}
          </div>

          <span
            className={`progress-title ${
              currentStep === step.id ? "active" : ""
            }`}
          >
            {step.title}
          </span>

          {index !== STEPS.length - 1 && (
            <div
              className={`progress-line ${
                currentStep > step.id ? "active" : ""
              }`}
            />
          )}
        </div>
      ))}
    </section>
  );
}
