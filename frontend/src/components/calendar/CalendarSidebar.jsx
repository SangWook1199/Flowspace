import { CalendarDays, Clock3, MapPin, Users, Flag } from "lucide-react";

/* ---------- Local Date ---------- */
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function CalendarSidebar({ sprint, events, selectedDate }) {
  const dateKey = formatDate(selectedDate);

  /* ---------- Today's Data ---------- */
  const todayTasks = events.filter(
    (item) =>
      item.type === "task" && dateKey >= item.start && dateKey <= item.end,
  );

  const todaySchedules = events.filter(
    (item) => item.type !== "task" && item.start === dateKey,
  );

  return (
    <aside className="calendar-sidebar">
      {/* ---------- Selected Date ---------- */}
      <div className="calendar-sidebar__header">
        <h3>
          {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
        </h3>
        <p>
          작업 {todayTasks.length} · 일정 {todaySchedules.length}
        </p>
      </div>

      {/* ---------- Current Sprint ---------- */}
      <div className="sidebar-section">
        <span className="sidebar-label">현재 스프린트</span>

        <div className="sidebar-sprint-card">
          <div className="sidebar-sprint-card__top">
            <div className="sidebar-sprint-icon">
              <Flag size={14} />
            </div>

            <div>
              <strong>{sprint.name}</strong>
              <p>진행 중</p>
            </div>
          </div>

          <div className="sidebar-sprint-date">
            <CalendarDays size={13} />
            <span>
              {sprint.start} ~ {sprint.end}
            </span>
          </div>

          <div className="sidebar-progress">
            <div
              className="sidebar-progress__fill"
              style={{ width: `${sprint.progress}%` }}
            />
          </div>

          <span className="sidebar-dday">D-{sprint.dday}</span>
        </div>
      </div>

      {/* ---------- Tasks ---------- */}
      <div className="sidebar-section">
        <span className="sidebar-label">작업</span>

        {todayTasks.length === 0 ? (
          <div className="sidebar-empty">오늘 예정된 작업이 없습니다.</div>
        ) : (
          todayTasks.map((task) => (
            <div key={task.id} className={`sidebar-task ${task.color}`}>
              <div className="sidebar-task__date">
                {task.start.replaceAll("-", ".")} ~{" "}
                {task.end.replaceAll("-", ".")}
              </div>

              <h4>{task.title}</h4>

              <div className="sidebar-task__bottom">
                <div className="sidebar-avatar">{task.assignee[0]}</div>

                <span>{task.assignee}</span>

                <span className="sidebar-status">{task.status}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ---------- Schedule ---------- */}
      <div className="sidebar-section">
        <span className="sidebar-label">일정</span>

        {todaySchedules.length === 0 ? (
          <div className="sidebar-empty">등록된 일정이 없습니다.</div>
        ) : (
          todaySchedules.map((item) => (
            <div key={item.id} className="sidebar-event">
              <div className="sidebar-event__badge">
                {item.type === "meeting" ? "회의" : "마일스톤"}
              </div>

              <h4>{item.title}</h4>

              <div className="sidebar-event__meta">
                <Clock3 size={13} />
                <span>{item.time}</span>
              </div>

              {item.place && (
                <div className="sidebar-event__meta">
                  <MapPin size={13} />
                  <span>{item.place}</span>
                </div>
              )}

              {item.members && (
                <div className="sidebar-event__meta">
                  <Users size={13} />
                  <span>{item.members.join(", ")}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
