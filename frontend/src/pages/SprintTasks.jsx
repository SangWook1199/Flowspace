import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TaskDetailPanel from '../components/sprint/TaskDetailPanel';
import TaskTable from '../components/sprint/TaskTable';
import { sprintTaskRows } from '../mock/sprintTasks';
import styles from '../components/sprint/TaskWorkspace.module.css';

export default function SprintTasks() {
  const { sprintId } = useParams(); const navigate = useNavigate(); const [tasks, setTasks] = useState(sprintTaskRows); const [selectedId, setSelectedId] = useState('SP1-1'); const [checkedIds, setCheckedIds] = useState([]); const [notice, setNotice] = useState('');
  const selectedTask = tasks.find(task => task.id === selectedId);
  const updateTask = (key, value) => setTasks(current => current.map(task => task.id === selectedId ? { ...task, [key]: value } : task));
  const toggleCheck = id => { if (id === 'ALL') return setCheckedIds(checkedIds.length === tasks.length ? [] : tasks.map(task => task.id)); setCheckedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]); };
  const addTask = () => { const id = `SP1-${tasks.length + 1}`; setTasks(current => [...current, { ...sprintTaskRows[0], id, title: '새 작업', assignee: '상욱', priority: '보통', subtasks: [] }]); setSelectedId(id); setCheckedIds([]); };
  const editSubtask = (index, checked) => setTasks(current => current.map(task => task.id === selectedId ? { ...task, subtasks: task.subtasks.map((item, itemIndex) => itemIndex === index ? { ...item, checked: checked ?? !item.checked } : item) } : task));
  const addSubtask = multiple => setTasks(current => current.map(task => task.id === selectedId ? { ...task, subtasks: [...task.subtasks, ...(multiple ? ['하위 작업 1', '하위 작업 2'] : ['새 하위 작업']).map(text => ({ text, checked: false }))] } : task));
  const batchChange = (key, value) => { if (!value) return; setTasks(current => current.map(task => checkedIds.includes(task.id) ? { ...task, [key]: value } : task)); };
  const deleteChecked = () => { setTasks(current => current.filter(task => !checkedIds.includes(task.id))); setCheckedIds([]); setSelectedId(null); };
  return <div className={styles.workspace}><section className={styles.workspaceMain}><header className={styles.pageHeader}><div><h1>Sprint {sprintId || 1} 작업</h1><p>Sprint 1　|　2025.05.29 ~ 2025.06.11</p></div><div><button onClick={() => navigate(`/sprints/${sprintId || 1}`)}><ArrowLeft size={17}/> 스프린트로 돌아가기</button><button onClick={() => setNotice('변경사항을 저장했습니다.')}><Save size={17}/> 저장</button></div></header>{notice && <p className={styles.notice}>{notice}</p>}<TaskTable tasks={tasks} selectedId={selectedId} checkedIds={checkedIds} onCheck={toggleCheck} onSelect={id => { setSelectedId(id); if (checkedIds.length < 2) setCheckedIds([]); }} onAdd={addTask}/></section><TaskDetailPanel task={selectedTask} selectedIds={checkedIds} onChange={updateTask} onClose={() => { setSelectedId(null); setCheckedIds([]); }} onAddSubtask={addSubtask} onToggleSubtask={editSubtask} onBatchChange={batchChange} onDelete={deleteChecked}/></div>;
}
