import { Settings } from "lucide-react";

export default function KanbanToolbar({
  sprint,
  onSprintChange,
  onStatusManage,
}) {
  return (
    <>
      <header className="kanbanHeader">
        <div>
          <h1>칸반 보드</h1>
          <p>현재 진행 중인 스프린트의 작업을 관리합니다.</p>
        </div>
      </header>

      <section className="kanbanToolbar">
        <div className="toolbarLeft">
          <select
            className="toolbarSelect"
            value={sprint}
            onChange={(e) => onSprintChange(e.target.value)}
          >
            <option>Sprint 1</option>
            <option>Sprint 2</option>
            <option>백로그</option>
          </select>

          <button className="toolbarButton">담당자</button>
          <button className="toolbarButton">우선순위</button>
        </div>

        <div className="toolbarRight">
          <button className="toolbarPrimary" onClick={onStatusManage}>
            <Settings size={16} />
            상태 관리
          </button>
        </div>
      </section>
    </>
  );
}
