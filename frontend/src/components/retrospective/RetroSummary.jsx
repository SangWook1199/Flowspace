import { CheckCircle2, Clock3, Users } from "lucide-react";

export default function RetroSummary({ summary, participants }) {
  return (
    <section className="retro-section">
      <div className="retro-section__header">
        <h2>회고 요약</h2>
        <p>스프린트 종료 시점의 진행 현황입니다.</p>
      </div>

      <div className="retro-summary">
        {/* 완료율 */}
        <div className="summary-card summary-rate">
          <div className="summary-circle">
            <strong>{summary.completionRate}%</strong>
          </div>

          <div className="summary-content">
            <span>완료율</span>
            <h3>
              {summary.completed} / {summary.total}
            </h3>
            <p>전체 태스크 기준</p>
          </div>
        </div>

        {/* 완료 */}
        <div className="summary-card">
          <div className="summary-icon green">
            <CheckCircle2 size={24} />
          </div>

          <div className="summary-content">
            <span>완료</span>
            <h3>{summary.completed}</h3>
            <p>완료된 태스크</p>
          </div>
        </div>

        {/* 미완료 */}
        <div className="summary-card">
          <div className="summary-icon red">
            <Clock3 size={24} />
          </div>

          <div className="summary-content">
            <span>미완료</span>
            <h3>{summary.incomplete}</h3>
            <p>다음 Sprint 이관</p>
          </div>
        </div>

        {/* 참여자 */}
        <div className="summary-card">
          <div className="summary-icon orange">
            <Users size={24} />
          </div>

          <div className="summary-content">
            <span>참여자</span>
            <h3>{participants.length}명</h3>

            <div className="summary-members">
              {participants.map((member) => (
                <div
                  key={member.id}
                  className={`summary-avatar ${member.tone}`}
                  title={member.name}
                >
                  {member.initial}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
