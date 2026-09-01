import { MessageSquare, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CircleProgress from "./CircleProgress";

export default function RetroCard({ retrospective }) {
  const {
    sprint,
    status,
    start,
    end,
    members,
    completion,
    completed,
    incomplete,
    actionItems,
    description,
    tags,
  } = retrospective;

  const statusLabel =
    status === "latest"
      ? "최신"
      : status === "done"
        ? "완료"
        : status === "progress"
          ? "진행 중"
          : "예정";

  const navigate = useNavigate();

  return (
    <article className="retro-card">
      {/* 아이콘 */}
      <div className={`retro-card__icon ${status}`}>
        <MessageSquare size={28} />
      </div>

      {/* 내용 */}
      <div className="retro-card__content">
        <div className="retro-card__header">
          <div>
            <h3>{sprint} 회고</h3>
            <p>
              {start} ~ {end} · 참여자 {members}명
            </p>
          </div>

          <span className={`retro-status ${status}`}>{statusLabel}</span>
        </div>

        <p className="retro-card__description">{description}</p>

        {tags.length > 0 && (
          <div className="retro-card__tags">
            {tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* 우측 */}
      <div className="retro-card__right">
        {status === "planned" ? (
          <div className="retro-card__planned">
            <span>스프린트 종료 후</span>
            <strong>자동 생성</strong>
          </div>
        ) : (
          <div className="retro-card__stats">
            <CircleProgress value={completion} />

            <div className="stat-item">
              <strong>{completed}</strong>
              <span>완료</span>
            </div>

            <div className="stat-item">
              <strong>{incomplete}</strong>
              <span>미완료</span>
            </div>

            <div className="stat-item">
              <strong>{actionItems}</strong>
              <span>Action Item</span>
            </div>
          </div>
        )}

        <div className="retro-card__actions">
          <button
            className="retro-open-btn"
            onClick={() =>
              navigate(`/retrospectives/${retrospective.sprintId}`)
            }
          >
            열기
          </button>
          <button className="retro-more-btn">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
