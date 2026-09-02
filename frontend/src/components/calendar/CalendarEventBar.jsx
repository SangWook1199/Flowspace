export default function CalendarEventBar({ event }) {
  const color = {
    blue: "event-blue",
    green: "event-green",
    yellow: "event-yellow",
    purple: "event-purple",
    pink: "event-pink",
    gray: "event-gray",
  }[event.color];

  return (
    <div
      className={`calendar-event ${color}`}
      style={{
        gridColumn: `${event.column} / span ${event.span}`,
        gridRow: `${event.week * 4 + event.row + 1}`,
      }}
    >
      <span>{event.title}</span>
    </div>
  );
}
