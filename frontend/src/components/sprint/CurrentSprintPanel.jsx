const status = { ACTIVE: '진행 중', PLANNING: '계획됨', COMPLETED: '완료' };
export default function CurrentSprintPanel({ sprints, onNavigate }) { return <aside className="currentSprint"><h2>현재 스프린트</h2>{sprints.slice(0, 3).map(sprint => <button onClick={() => onNavigate(sprint.id)} key={sprint.id}><i className={sprint.color}/><span>{sprint.name}</span><b>{status[sprint.status]}</b></button>)}</aside>; }
