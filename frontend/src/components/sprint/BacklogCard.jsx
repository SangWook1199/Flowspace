import { Inbox, ArrowRight } from "lucide-react";

export default function BacklogCard({ backlog, onClick }) {
  return (
    <article
      className="backlogCard"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        // 마우스 없이도 Enter/Space로 열 수 있게 해요(Space는 페이지가 아래로 스크롤되지 않게 막아요).
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="backlogTop">
        <div className="backlogIcon">
          <Inbox size={20} />
        </div>

        <span className="backlogCount">{backlog.taskCount}개 작업</span>
      </div>

      <h3>{backlog.name}</h3>
      <p>{backlog.description}</p>

      <div className="backlogBottom">
        <span>스프린트 미배정</span>
        <ArrowRight size={18} />
      </div>
    </article>
  );
}
