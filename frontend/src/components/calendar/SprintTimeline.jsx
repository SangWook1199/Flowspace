import { CalendarDays, Flag } from "lucide-react";

export default function SprintTimeline({ sprint }) {
  return (
    <section className="sprint-timeline">
      <div className="sprint-timeline__header">
        <div className="sprint-timeline__left">
          <div className="sprint-icon">
            <Flag size={16} />
          </div>

          <div>
            <div className="sprint-title-row">
              <h3>{sprint.name}</h3>
              <span className="sprint-badge">진행 중</span>
            </div>

            <div className="sprint-date">
              <CalendarDays size={13} />
              <span>
                {sprint.start} ~ {sprint.end}
              </span>
            </div>
          </div>
        </div>

        <div className="sprint-dday">D-{sprint.dday}</div>
      </div>

      <div className="sprint-progress">
        <div
          className="sprint-progress__fill"
          style={{ width: `${sprint.progress}%` }}
        />
      </div>
    </section>
  );
}
