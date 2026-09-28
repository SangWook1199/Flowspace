import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import TaskDetailPanel from "../components/sprint/TaskDetailPanel";
import TaskTable from "../components/sprint/TaskTable";
import { PRIORITY_KO_TO_EN, PRIORITY_LABEL, toAssignee } from "../mock/sprintTasks";
import styles from "../components/sprint/TaskWorkspace.module.css";

export default function SprintTasks() {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  // 태스크 자체는 이제 MainLayout에서 끌어올린 세션 상태(sprintTasks)예요
  // — 칸반 보드·페이지 TASK 블록과 같은 배열을 봐요. 다만 이 화면
  // (TaskTable/TaskRow/TaskDetailPanel)은 원래부터 담당자 1명(문자열)·
  // 한글 우선순위를 기대하게 만들어져 있어서, 그 컴포넌트들은 그대로
  // 두고 여기서만 공용 모델(assignees 배열·영문 priority enum)과의
  // 차이를 흡수해요.
  const { sprintTasks, setSprintTasks } = useOutletContext();
  const [selectedId, setSelectedId] = useState("SP1-1");
  const [checkedIds, setCheckedIds] = useState([]);
  const [notice, setNotice] = useState("");

  const tasks = sprintTasks.map((task) => ({
    ...task,
    assignee: task.assignees?.[0]?.name ?? "",
    priority: PRIORITY_LABEL[task.priority] ?? task.priority,
  }));
  const selectedTask = tasks.find((task) => task.id === selectedId);

  // TaskDetailPanel은 onChange(key, value)로 "assignee"(문자열 이름)나
  // "priority"(한글)를 넘겨요 — 여기서 공용 모델 필드(assignees 배열,
  // 영문 priority)로 바꿔서 setSprintTasks에 반영해요. 그 외 필드
  // (title/startDate/dueDate/description)는 이름이 같아서 그대로 둬요.
  const toCanonicalPatch = (key, value) => {
    if (key === "assignee") return { assignees: [toAssignee(value)] };
    if (key === "priority") return { priority: PRIORITY_KO_TO_EN[value] ?? value };
    return { [key]: value };
  };

  const updateTask = (key, value) =>
    setSprintTasks((current) =>
      current.map((task) =>
        task.id === selectedId ? { ...task, ...toCanonicalPatch(key, value) } : task,
      ),
    );
  const toggleCheck = (id) => {
    if (id === "ALL")
      return setCheckedIds(
        checkedIds.length === tasks.length ? [] : tasks.map((task) => task.id),
      );
    setCheckedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };
  const addTask = () => {
    const id = `SP1-${sprintTasks.length + 1}`;
    setSprintTasks((current) => [
      ...current,
      {
        id,
        title: "새 작업",
        statusId: 1,
        assignees: [toAssignee("상욱")],
        priority: "MEDIUM",
        startDate: sprintTasks[0]?.startDate ?? "",
        dueDate: sprintTasks[0]?.dueDate ?? "",
        subtasks: [],
        description: "",
      },
    ]);
    setSelectedId(id);
    setCheckedIds([]);
  };
  const editSubtask = (index, checked) =>
    setSprintTasks((current) =>
      current.map((task) =>
        task.id === selectedId
          ? {
              ...task,
              subtasks: task.subtasks.map((item, itemIndex) =>
                itemIndex === index
                  ? { ...item, checked: checked ?? !item.checked }
                  : item,
              ),
            }
          : task,
      ),
    );
  const addSubtask = (multiple) =>
    setSprintTasks((current) =>
      current.map((task) =>
        task.id === selectedId
          ? {
              ...task,
              subtasks: [
                ...task.subtasks,
                ...(multiple
                  ? ["하위 작업 1", "하위 작업 2"]
                  : ["새 하위 작업"]
                ).map((text, i) => ({
                  id: task.subtasks.length + i + 1,
                  text,
                  checked: false,
                })),
              ],
            }
          : task,
      ),
    );
  const batchChange = (key, value) => {
    if (!value) return;
    setSprintTasks((current) =>
      current.map((task) =>
        checkedIds.includes(task.id) ? { ...task, ...toCanonicalPatch(key, value) } : task,
      ),
    );
  };
  const deleteChecked = () => {
    setSprintTasks((current) =>
      current.filter((task) => !checkedIds.includes(task.id)),
    );
    setCheckedIds([]);
    setSelectedId(null);
  };
  return (
    <div className={styles.workspace}>
      <section className={styles.workspaceMain}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Sprint {sprintId || 1} 작업</h1>
            <p>Sprint 1　|　2025.05.29 ~ 2025.06.11</p>
          </div>
          <div>
            <button onClick={() => navigate(`/sprints/${sprintId || 1}`)}>
              <ArrowLeft size={17} /> 스프린트로 돌아가기
            </button>
            <button onClick={() => setNotice("변경사항을 저장했습니다.")}>
              <Save size={17} /> 저장
            </button>
          </div>
        </header>
        {notice && <p className={styles.notice}>{notice}</p>}
        <TaskTable
          tasks={tasks}
          selectedId={selectedId}
          checkedIds={checkedIds}
          onCheck={toggleCheck}
          onSelect={(id) => {
            setSelectedId(id);
            if (checkedIds.length < 2) setCheckedIds([]);
          }}
          onAdd={addTask}
        />
      </section>
      <TaskDetailPanel
        task={selectedTask}
        selectedIds={checkedIds}
        onChange={updateTask}
        onClose={() => {
          setSelectedId(null);
          setCheckedIds([]);
        }}
        onAddSubtask={addSubtask}
        onToggleSubtask={editSubtask}
        onBatchChange={batchChange}
        onDelete={deleteChecked}
      />
    </div>
  );
}
