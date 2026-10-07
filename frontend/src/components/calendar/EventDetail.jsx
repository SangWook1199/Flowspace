import { useRef, useState } from "react";
import { AlignLeft, CalendarDays, Pencil, Trash2, X } from "lucide-react";

import useModalFocus from "../../hooks/useModalFocus";
import { getErrorMessage } from "../../utils/apiError";
import { calendarColor } from "../../utils/calendarColors";
import { isLightHex } from "../../utils/color";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const dayText = (d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
const timeText = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const durationText = (minutes) => {
  if (minutes <= 0) return "";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return [days && `${days}일`, hours && `${hours}시간`, mins && `${mins}분`].filter(Boolean).join(" ");
};

// 일정의 기간을 읽기 좋은 문장으로 바꿔요. 같은 날이면 "날짜 / 시작 – 종료", 며칠에 걸치면 두 줄로 보여줘요.
const describeRange = (event) => {
  const start = new Date(event.start_datetime);
  const end = event.end_datetime ? new Date(event.end_datetime) : null;
  if (Number.isNaN(start.getTime())) return { lines: [""], length: "" };
  if (!end || Number.isNaN(end.getTime())) return { lines: [`${dayText(start)} ${timeText(start)}`], length: "" };

  const length = durationText(Math.round((end.getTime() - start.getTime()) / 60000));

  if (start.toDateString() === end.toDateString()) {
    return { lines: [dayText(start), `${timeText(start)} – ${timeText(end)}`], length };
  }

  return { lines: [`${dayText(start)} ${timeText(start)}`, `~ ${dayText(end)} ${timeText(end)}`], length };
};

// 일정 하나를 자세히 보여주는 창이에요(설명 전체, 기간). 여기서 고치거나 지울 수 있어요.
// onDelete는 서버에서 지우는 함수이고, 실패하면 오류를 이 창 안에 보여줘요.
export default function EventDetail({ event, onClose, onEdit, onDelete }) {
  const dialogRef = useRef(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useModalFocus(dialogRef, onClose);

  const hex = calendarColor(event.color);
  const { lines, length } = describeRange(event);

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    setError("");

    try {
      await onDelete(event);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "일정을 지우지 못했어요."));
      setDeleting(false);
    }
  };

  return (
    <div
      className="evmOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="evmDialog evdDialog" role="dialog" aria-modal="true" aria-labelledby="evdTitle">
        <div className="evmStripe" style={{ background: isLightHex(hex) ? "#CBD5E1" : hex }} />

        <header className="evmHeader">
          <h2>일정</h2>
          <button type="button" className="evmClose" aria-label="닫기" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="evmBody">
          <h3 id="evdTitle" className="evdTitle">
            <i style={{ background: hex, boxShadow: isLightHex(hex) ? "inset 0 0 0 1.5px #111827" : undefined }} />
            {event.title}
          </h3>

          <div className="evdRow">
            <CalendarDays size={15} />
            <div>
              {lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {length && <small>{length}</small>}
            </div>
          </div>

          <div className="evdRow">
            <AlignLeft size={15} />
            {event.description?.trim() ? (
              <p className="evdDesc">{event.description}</p>
            ) : (
              <p className="evdDesc empty">설명이 없어요.</p>
            )}
          </div>

          {error && (
            <p className="evmError" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="evmFooter">
          {confirming ? (
            <>
              <span className="evdConfirm">이 일정을 지울까요? 되돌릴 수 없어요.</span>
              <button type="button" className="evmCancel" onClick={() => setConfirming(false)} disabled={deleting}>
                아니요
              </button>
              <button type="button" className="evmSubmit danger" onClick={remove} disabled={deleting}>
                {deleting ? "지우는 중…" : "지우기"}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="evdDelete" onClick={() => setConfirming(true)}>
                <Trash2 size={14} /> 삭제
              </button>
              <button type="button" className="evmSubmit" onClick={() => onEdit(event)}>
                <Pencil size={14} /> 수정
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
