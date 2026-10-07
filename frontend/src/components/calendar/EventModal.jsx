import { useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, Check, Clock, X } from "lucide-react";

import useModalFocus from "../../hooks/useModalFocus";
import { getErrorMessage } from "../../utils/apiError";
import { calendarColor } from "../../utils/calendarColors";
import { isLightHex, swatchStyle, tintStyle } from "../../utils/color";

const EVENT_COLORS = ["PURPLE", "BLUE", "GREEN", "ORANGE", "RED", "PINK", "GRAY", "WHITE"];

// 색상 버튼은 색만 있어서 스크린리더가 읽을 이름이 없어요. 그래서 aria-label용 한글 이름을 따로 둬요.
const COLOR_LABEL = {
  BLUE: "파랑",
  PURPLE: "보라",
  GREEN: "초록",
  RED: "빨강",
  ORANGE: "주황",
  PINK: "분홍",
  GRAY: "회색",
  WHITE: "흰색",
};

// 종료 시각을 한 번에 맞추는 빠른 버튼(시작 시각 기준 분)이에요.
const DURATIONS = [
  { label: "30분", minutes: 30 },
  { label: "1시간", minutes: 60 },
  { label: "2시간", minutes: 120 },
  { label: "종일", minutes: "allDay" },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n) => String(n).padStart(2, "0");

// "YYYY-MM-DD" + "HH:mm" → Date (둘 중 하나라도 비면 null)
const toDate = (date, time) => {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dateText = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeText = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const durationText = (minutes) => {
  if (minutes <= 0) return "";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return [days && `${days}일`, hours && `${hours}시간`, mins && `${mins}분`].filter(Boolean).join(" ");
};

const dayText = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;

const createInitial = (dateKey) => ({
  title: "",
  description: "",
  color: "PURPLE",
  startDate: dateKey,
  startTime: "09:00",
  endDate: dateKey,
  endTime: "10:00",
});

// 고칠 일정의 값("2026-10-06T09:00")을 날짜 칸/시간 칸으로 나눠요.
const fromEvent = (event) => ({
  title: event.title ?? "",
  description: event.description ?? "",
  color: event.color ?? "PURPLE",
  startDate: String(event.start_datetime ?? "").slice(0, 10),
  startTime: String(event.start_datetime ?? "").slice(11, 16),
  endDate: event.end_datetime ? String(event.end_datetime).slice(0, 10) : "",
  endTime: event.end_datetime ? String(event.end_datetime).slice(11, 16) : "",
});

// 일정 만들기/고치기 모달이에요. 제목을 먼저 쓰고, 색과 시간을 고른 뒤 저장해요.
// event를 주면 그 일정을 고치는 모드, 없으면 initialDate 날짜에 새로 만드는 모드예요.
// onSubmit(form)은 서버에 저장하는 함수이고, 실패하면 던진 오류를 모달 안에 보여줘요.
export default function EventModal({ event, initialDate, onClose, onSubmit }) {
  const editing = Boolean(event);
  const [form, setForm] = useState(() => (event ? fromEvent(event) : createInitial(initialDate)));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);

  const patch = (changes) => {
    setForm((prev) => ({ ...prev, ...changes }));
    setError("");
  };

  // 시작을 바꾸면 종료도 같은 길이만큼 같이 옮겨요(시작만 뒤로 가서 종료가 앞서는 일이 없게요).
  const changeStart = (changes) => {
    setForm((prev) => {
      const next = { ...prev, ...changes };
      const oldStart = toDate(prev.startDate, prev.startTime);
      const oldEnd = toDate(prev.endDate, prev.endTime);
      const newStart = toDate(next.startDate, next.startTime);

      if (oldStart && oldEnd && newStart && oldEnd >= oldStart) {
        const shifted = new Date(newStart.getTime() + (oldEnd.getTime() - oldStart.getTime()));
        next.endDate = dateText(shifted);
        next.endTime = timeText(shifted);
      }

      return next;
    });
    setError("");
  };

  const applyDuration = (minutes) => {
    const start = toDate(form.startDate, form.startTime);
    if (!start) return;

    if (minutes === "allDay") {
      patch({ startTime: "00:00", endDate: form.startDate, endTime: "23:59" });
      return;
    }

    const end = new Date(start.getTime() + minutes * 60000);
    patch({ endDate: dateText(end), endTime: timeText(end) });
  };

  useModalFocus(dialogRef, onClose);

  const start = toDate(form.startDate, form.startTime);
  const end = form.endDate ? toDate(form.endDate, form.endTime || form.startTime) : null;
  const minutes = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;

  const hex = calendarColor(form.color);
  const light = isLightHex(hex);

  // 선택한 시간을 한 줄로 요약해서 보여줘요.
  const summary = useMemo(() => {
    if (!start) return "시작 일시를 골라 주세요.";
    if (!end) return `${dayText(start)} ${timeText(start)}`;
    if (end < start) return "종료가 시작보다 빨라요.";

    const sameDay = dateText(start) === dateText(end);
    const left = `${dayText(start)} ${timeText(start)}`;
    const right = sameDay ? timeText(end) : `${dayText(end)} ${timeText(end)}`;
    return `${left} – ${right} · ${durationText(minutes)}`;
  }, [start, end, minutes]);

  const submit = async (e) => {
    e?.preventDefault();
    if (saving) return;

    const title = form.title.trim();

    // 저장을 막는 이유를 alert 대신 모달 안에 보여줘요(alert는 화면 흐름을 끊고 접근성도 나빠요).
    if (!title) {
      setError("일정 제목을 입력해 주세요.");
      return;
    }

    if (!start) {
      setError("시작 날짜와 시간을 입력해 주세요.");
      return;
    }

    if (end && end < start) {
      setError("종료는 시작보다 빠를 수 없어요.");
      return;
    }

    setSaving(true);

    try {
      await onSubmit({
        title,
        description: form.description,
        color: form.color,
        start_datetime: `${form.startDate}T${form.startTime}`,
        end_datetime: end ? `${form.endDate}T${form.endTime || form.startTime}` : "",
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "일정을 만들지 못했어요."));
      setSaving(false);
    }
  };

  return (
    <div
      className="evmOverlay"
      onMouseDown={(e) => {
        // 글자를 드래그하다가 바깥에서 손을 떼도 닫히지 않게, 바깥을 "눌렀을 때"만 닫아요.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        ref={dialogRef}
        className="evmDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evmHeading"
        onSubmit={submit}
        onKeyDown={(e) => {
          // 메모 칸에서는 Enter가 줄바꿈이라 Ctrl/⌘+Enter로 저장해요.
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(e);
        }}
        noValidate
      >
        <div className="evmStripe" style={{ background: light ? "#CBD5E1" : hex }} />

        <header className="evmHeader">
          <h2 id="evmHeading">{editing ? "일정 수정" : "새 일정"}</h2>
          <button type="button" className="evmClose" aria-label="닫기" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="evmBody">
          <input
            className="evmTitle"
            autoFocus
            onFocus={(e) => editing && e.target.select()}
            aria-label="일정 제목"
            placeholder="일정 제목"
            maxLength={100}
            value={form.title}
            onChange={(e) => patch({ title: e.target.value })}
          />

          <div className="evmColors" role="group" aria-label="색상">
            {EVENT_COLORS.map((color) => {
              const value = calendarColor(color);
              const selected = form.color === color;

              return (
                <button
                  key={color}
                  type="button"
                  className={`evmSwatch${selected ? " selected" : ""}`}
                  aria-label={COLOR_LABEL[color]}
                  aria-pressed={selected}
                  title={COLOR_LABEL[color]}
                  style={{
                    background: value,
                    boxShadow: isLightHex(value) ? "inset 0 0 0 1.5px #111827" : undefined,
                    "--ring": isLightHex(value) ? "#111827" : value,
                  }}
                  onClick={() => patch({ color })}
                >
                  {selected && <Check size={12} strokeWidth={3.5} color={isLightHex(value) ? "#111827" : "#fff"} />}
                </button>
              );
            })}
          </div>

          <section className="evmTime" aria-label="일시">
            <div className="evmRow">
              <span className="evmRowLabel">
                <CalendarIcon size={14} /> 시작
              </span>
              <input
                type="date"
                aria-label="시작 날짜"
                value={form.startDate}
                onChange={(e) => changeStart({ startDate: e.target.value })}
              />
              <input
                type="time"
                aria-label="시작 시간"
                value={form.startTime}
                onChange={(e) => changeStart({ startTime: e.target.value })}
              />
            </div>

            <div className="evmRow">
              <span className="evmRowLabel">
                <Clock size={14} /> 종료
              </span>
              <input
                type="date"
                aria-label="종료 날짜"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => patch({ endDate: e.target.value })}
              />
              <input
                type="time"
                aria-label="종료 시간"
                value={form.endTime}
                onChange={(e) => patch({ endTime: e.target.value })}
              />
            </div>

            <div className="evmQuick" role="group" aria-label="길이 빠른 선택">
              {DURATIONS.map(({ label, minutes: value }) => (
                <button key={label} type="button" onClick={() => applyDuration(value)}>
                  {label}
                </button>
              ))}
            </div>

            <p className={`evmSummary${end && start && end < start ? " bad" : ""}`}>{summary}</p>
          </section>

          <textarea
            className="evmMemo"
            aria-label="메모"
            rows={3}
            placeholder="메모를 남겨 보세요 (선택)"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
          />

          <div className="evmPreview" aria-hidden="true">
            <span>달력에서는 이렇게 보여요</span>
            <div className="eventPill" style={{ ...tintStyle(hex, "22"), color: "#1f2328" }}>
              <i style={swatchStyle(hex)} />
              <time>{form.startTime}</time>
              <span>{form.title.trim() || "일정 제목"}</span>
            </div>
          </div>

          {error && (
            <p className="evmError" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="evmFooter">
          <span className="evmHint">Ctrl+Enter로 저장</span>
          <button type="button" className="evmCancel" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="evmSubmit" disabled={saving}>
            {saving ? (editing ? "저장 중…" : "만드는 중…") : editing ? "저장" : "일정 만들기"}
          </button>
        </footer>
      </form>
    </div>
  );
}
