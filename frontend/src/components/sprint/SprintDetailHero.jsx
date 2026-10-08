import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Flag, Archive, Pencil } from "lucide-react";
import SprintProgress from "./SprintProgress";
import { formatDateDots } from "../../utils/date";
import { htmlToText, sanitizeHtml } from "../../utils/sanitizeHtml";
import { SPRINT_STATUS_LABEL, sprintPercent, sprintRemainingLabel } from "../../utils/sprint";

const hasHtml = (html) => htmlToText(html).trim() !== "";

// 목표(한 줄로 줄여 보여줘서 전체는 여기서 봐요)와 스프린트를 만들 때 쓴 상세 설명(서식 있는 글)이에요.
// 카드 크기가 바뀌지 않게, 버튼을 누르면 카드 위에 떠서 보여주고(밀어내지 않아요) 바깥을 누르거나 Esc로 닫아요.
function DescriptionToggle({ goal, html }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="heroDescWrap" ref={wrapRef}>
      <button type="button" className={`heroAction${open ? " on" : ""}`} onClick={() => setOpen((prev) => !prev)} aria-expanded={open}>
        상세 설명
        <ChevronDown size={14} className={open ? "flip" : ""} />
      </button>

      {open && (
        <div className="heroDescPopover" role="region" aria-label="스프린트 상세 설명">
          {goal && (
            <section>
              <h3>목표</h3>
              <p>{goal}</p>
            </section>
          )}
          {hasHtml(html) && (
            <section>
              <h3>설명</h3>
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// onEdit이 있을 때만 "편집" 버튼을 보여줘요(백로그는 고칠 정보가 없어서 안 넘겨요).
export default function SprintDetailHero({ sprint, onEdit }) {
  const isBacklog = sprint.status === "BACKLOG";
  // 목표가 길어서 한 줄에 다 안 들어갈 수 있으니, 목표나 설명이 있으면 "상세 설명"에서 볼 수 있게 해요.
  const hasDescription = !isBacklog && (hasHtml(sprint.description) || (sprint.goal ?? "").length > 40);

  return (
    <section className="detailHero">
      <div className={`detailIcon ${isBacklog ? "gray" : sprint.color}`}>
        {isBacklog ? <Archive size={36} /> : <Flag size={36} />}
      </div>

      <div className="detailTitle">
        <h1>
          <em title={sprint.name}>{sprint.name}</em>
          {!isBacklog && <span>{SPRINT_STATUS_LABEL[sprint.status] ?? sprint.status}</span>}
        </h1>

        <p title={sprint.goal}>{sprint.goal}</p>

        <small>
          <CalendarDays size={15} />
          {isBacklog
            ? "스프린트 미배정"
            : `${formatDateDots(sprint.startDate)} ~ ${formatDateDots(sprint.endDate)}${
                sprintRemainingLabel(sprint) ? ` · ${sprintRemainingLabel(sprint)}` : ""
              }`}
        </small>

        {(hasDescription || onEdit) && (
          <div className="heroActions">
            {hasDescription && <DescriptionToggle goal={sprint.goal} html={sprint.description} />}
            {onEdit && (
              <button type="button" className="heroAction" onClick={onEdit}>
                <Pencil size={13} />
                편집
              </button>
            )}
          </div>
        )}
      </div>

      <div className="detailProgress">
        {isBacklog ? (
          <>
            <div className="backlogSummary">
              <small>미배정 작업</small>
              <h2>{sprint.total}개</h2>
            </div>

            <div className="backlogBar">
              <div />
            </div>

            <b>모든 작업이 아직 Sprint에 배정되지 않았습니다.</b>
          </>
        ) : (
          <>
            <SprintProgress progress={sprintPercent(sprint)} color={sprint.color} />
            <b>
              {sprint.completed ?? 0} / {sprint.total ?? 0} 완료
            </b>
          </>
        )}
      </div>
    </section>
  );
}
