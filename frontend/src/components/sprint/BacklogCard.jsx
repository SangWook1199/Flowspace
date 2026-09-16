import { Inbox, ArrowRight } from "lucide-react";

export default function BacklogCard({ backlog, onClick }) {
  return (
    <article className="backlogCard" onClick={onClick}>
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
