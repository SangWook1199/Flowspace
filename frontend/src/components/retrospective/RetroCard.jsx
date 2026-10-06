import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CircleProgress from "./CircleProgress";

export default function RetroCard({ retrospective }) {
  const {
    id,
    sprintId,
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
  } = retrospective;

  // tags가 null로 올 수도 있어서(기본값은 undefined만 막아줘요) 따로 빈 배열로 바꿔요.
  const tags = retrospective.tags ?? [];

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
              {start} ~ {end}
              {members != null && ` · 참여자 ${members}명`}
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
        {/* 회고가 아직 없는 스프린트(예정·진행 중)는 숫자 대신 안내를 보여줘요. */}
        {status === "planned" || id == null ? (
          <div className="retro-card__planned">
            <span>스프린트 종료 후</span>
            <strong>자동 생성</strong>
          </div>
        ) : (
          <div className="retro-card__stats">
            <CircleProgress value={completion} />

            <div className="stat-item">
              <strong>{completed ?? 0}</strong>
              <span>완료</span>
            </div>

            <div className="stat-item">
              <strong>{incomplete ?? 0}</strong>
              <span>미완료</span>
            </div>

            <div className="stat-item">
              <strong>{actionItems ?? 0}</strong>
              <span>Action Item</span>
            </div>
          </div>
        )}

        <div className="retro-card__actions">
          {/* 상세 주소는 회고 id가 아니라 스프린트 id(:sprintId) 기준이에요. 회고가 아직 없는 스프린트(id가 null)는 열 곳이 없어서 막아둬요. */}
          <button
            className="retro-open-btn"
            disabled={sprintId == null || id == null}
            aria-label={`${sprint} 회고 열기`}
            onClick={() => navigate(`/retrospectives/${sprintId}`)}
          >
            열기
          </button>
          {/* 회고 메뉴 버튼은 기능이 없어서 뺐어요. */}
        </div>
      </div>
    </article>
  );
}
