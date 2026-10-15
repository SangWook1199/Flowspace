import { CalendarDays, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CircleProgress from "./CircleProgress";

// 스프린트 목록 카드(SprintCard)와 같은 틀이에요: 아이콘+이름/설명/기간 | 완료율(원형) | 숫자 | 열기.
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

  // 상세 주소는 회고 id가 아니라 스프린트 id(:sprintId) 기준이에요. 회고가 아직 없는 스프린트(id가 null)는 열 곳이 없어서 막아둬요.
  const canOpen = sprintId != null && id != null;
  const open = () => navigate(`/retrospectives/${sprintId}`);

  // 열 수 있는 카드는 어디를 눌러도(또는 포커스를 두고 Enter/Space) 상세 화면으로 가요.
  const linkProps = canOpen
    ? {
        role: "link",
        tabIndex: 0,
        "aria-label": `${sprint} 회고 열기`,
        onClick: open,
        onKeyDown: (e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            open();
          }
        },
      }
    : {};

  return (
    <article className={`retro-card ${status}`} {...linkProps}>
      <div className="retro-card__identity">
        <div className={`retro-card__icon ${status}`}>
          <MessageSquare size={27} />
        </div>

        <div className="retro-card__content">
          <h3>
            <em className="retro-card__name" title={`${sprint} 회고`}>
              {sprint} 회고
            </em>
            <span className={`retro-status ${status}`}>{statusLabel}</span>
          </h3>

          {description && <p className="retro-card__description">{description}</p>}

          <small className="retro-card__meta">
            <CalendarDays size={13} />
            {/* 날짜는 api 매퍼가 이미 "2026.10.13" 꼴로 바꿔서 줘요. */}
            {start} ~ {end}
            {members != null && (
              <span className="retro-card__members">· 참여자 {members}명</span>
            )}
          </small>

          {tags.length > 0 && (
            <div className="retro-card__tags">
              {tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 회고가 아직 없는 스프린트(예정·진행 중)는 숫자 대신 안내를 보여줘요. */}
      {status === "planned" || id == null ? (
        <div className="retro-card__planned">
          <span>스프린트 종료 후</span>
          <strong>자동 생성</strong>
        </div>
      ) : (
        <>
          <div className="retro-ring">
            <CircleProgress value={completion} />
          </div>

          <div className="retro-numbers">
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
        </>
      )}

      <button
        type="button"
        className="retro-open-btn"
        disabled={!canOpen}
        aria-label={`${sprint} 회고 열기`}
        onClick={(e) => {
          e.stopPropagation(); // 카드 클릭과 겹쳐서 두 번 이동하지 않게 해요.
          open();
        }}
      >
        열기{"\u3000"}›
      </button>
      {/* 회고 메뉴 버튼은 기능이 없어서 뺐어요. */}
    </article>
  );
}
