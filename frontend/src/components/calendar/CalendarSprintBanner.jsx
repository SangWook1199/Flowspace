import { CalendarDays, Flag } from "lucide-react";

const SPRINT_COLOR = {
  BLUE: "#3B82F6",
  PURPLE: "#9333EA",
  GREEN: "#22C55E",
  RED: "#EF4444",
  ORANGE: "#F59E0B",
  PINK: "#EC4899",
  GRAY: "#64748B",
};

export default function CalendarSprintBanner({ sprint }) {
  const today = new Date("2026-09-16");

  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);

  const totalDays = Math.ceil((end - start) / 86400000) + 1;
  const passedDays = Math.max(0, Math.ceil((today - start) / 86400000) + 1);

  const progress = Math.min(100, Math.round((passedDays / totalDays) * 100));

  const dday = Math.ceil((end - today) / 86400000);

  const color = SPRINT_COLOR[sprint.color];

  return (
    <section className="calendarSprintBanner">
      <div className="bannerAccent" style={{ background: color }} />

      <div className="bannerLeft">
        <div
          className="bannerIcon"
          style={{
            background: `${color}18`,
            color,
          }}
        >
          <Flag size={28} />
        </div>

        <div>
          <h2>{sprint.name}</h2>

          <p>{sprint.goal}</p>

          <div className="bannerDate">
            <CalendarDays size={14} />

            <span>
              {sprint.startDate} ~ {sprint.endDate}
            </span>
          </div>
        </div>
      </div>

      <div className="bannerRight">
        <strong>{progress}%</strong>

        <span className="dDay" style={{ color }}>
          D-{dday}
        </span>

        <div className="bannerProgress">
          <i
            style={{
              width: `${progress}%`,
              background: color,
            }}
          />
        </div>

        <small>
          {passedDays}/{totalDays}일 진행
        </small>
      </div>
    </section>
  );
}
