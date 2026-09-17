import { CalendarDays, Clock3, Flag } from "lucide-react";

const STATUS_COLOR = {
  GRAY: "#64748B",
  BLUE: "#3B82F6",
  PURPLE: "#9333EA",
  GREEN: "#22C55E",
};

const EVENT_COLOR = {
  BLUE: "#3B82F6",
  PURPLE: "#9333EA",
  GREEN: "#22C55E",
  RED: "#EF4444",
  ORANGE: "#F59E0B",
  PINK: "#EC4899",
  GRAY: "#64748B",
};

const PRIORITY_LABEL = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

export default function DaySidebar({ sprint, tasks, events }) {
  return (
    <aside className="daySidebar">
      <section className="sidebarSection sprintInfoCard">
        <div className="sprintInfoTop">
          <Flag size={16} />
          <span>{sprint.name}</span>
        </div>

        <strong>{sprint.goal}</strong>

        <div className="sprintInfoBottom">
          <span>{sprint.startDate}</span>
          <span>{sprint.endDate}</span>
        </div>
      </section>

      <section className="sidebarSection">
        <div className="sectionTitle">
          <h3>Task</h3>
          <b>{tasks.length}</b>
        </div>

        {tasks.length === 0 ? (
          <p className="emptyText">해당 날짜의 작업이 없습니다.</p>
        ) : (
          tasks.map((task) => (
            <div className="sidebarTask" key={task.id}>
              <div className="taskHeader">
                <span
                  className="statusDot"
                  style={{
                    background: STATUS_COLOR[task.status.color],
                  }}
                />

                <small>{task.code}</small>
              </div>

              <h4>{task.title}</h4>

              <div className="taskMeta">
                <em className={task.priority.toLowerCase()}>
                  {PRIORITY_LABEL[task.priority]}
                </em>

                <span>
                  {task.complete}/{task.total}
                </span>
              </div>

              <div className="taskDate">
                <CalendarDays size={13} />
                {task.start} ~ {task.end}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="sidebarSection">
        <div className="sectionTitle">
          <h3>Event</h3>
          <b>{events.length}</b>
        </div>

        {events.length === 0 ? (
          <p className="emptyText">등록된 일정이 없습니다.</p>
        ) : (
          events.map((event) => {
            const start = new Date(event.start_datetime);
            const end = event.end_datetime
              ? new Date(event.end_datetime)
              : null;

            const isMultiDay =
              end && start.toDateString() !== end.toDateString();

            return (
              <div className="sidebarEvent" key={event.event_id}>
                <div
                  className="eventLine"
                  style={{
                    background: EVENT_COLOR[event.color],
                  }}
                />

                <div className="eventContent">
                  <strong>{event.title}</strong>

                  {event.description && <p>{event.description}</p>}

                  <div className="eventTime">
                    <Clock3 size={13} />

                    {isMultiDay ? (
                      <span>
                        {formatDate(start)} {formatTime(start)}
                        {"  ~  "}
                        {formatDate(end)} {formatTime(end)}
                      </span>
                    ) : (
                      <span>
                        {formatTime(start)}
                        {end && ` ~ ${formatTime(end)}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </aside>
  );
}

function formatTime(date) {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
