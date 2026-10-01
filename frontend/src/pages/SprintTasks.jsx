import { ArrowLeft, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import TaskDetailPanel from "../components/sprint/TaskDetailPanel";
import TaskTable from "../components/sprint/TaskTable";
import { useAuth } from "../context/useAuth";
import { formatDateDots, isRangeReversed } from "../utils/date";
import styles from "../components/sprint/TaskWorkspace.module.css";

// 작업의 우선순위는 서버/공용 모델에서는 영문 enum(HIGH/MEDIUM/LOW)이고, 이 화면의 표·상세 패널은
// 한글 라벨을 기대해서 여기서만 서로 바꿔요.
const PRIORITY_LABEL = { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" };
const PRIORITY_KO_TO_EN = { 높음: "HIGH", 보통: "MEDIUM", 낮음: "LOW" };

// :sprintId 경로 값으로 스프린트(또는 "backlog")를 찾아요. 없으면 "찾을 수 없어요" 화면을 보여줘요.
// 실제 화면은 SprintTasksBody예요 — key로 스프린트가 바뀔 때 선택/체크 상태가 새로 시작하게 하려고 나눠뒀어요.
export default function SprintTasks() {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  const { sprints = [], backlog, sprintDataLoading, sprintDataError, reloadSprintData } = useOutletContext();

  const sprint = sprintId === "backlog" ? backlog : (sprints.find((item) => String(item.id) === sprintId) ?? null);

  if (sprintDataLoading || sprintDataError || !sprint) {
    return (
      <div className={styles.workspace}>
        <section className={styles.workspaceMain}>
          {sprintDataLoading ? (
            <p className="emptySprints" role="status">작업을 불러오는 중이에요…</p>
          ) : (
            <div className="emptySprints" role="alert">
              <p>{sprintDataError ?? "스프린트를 찾을 수 없어요"}</p>
              {sprintDataError && (
                <button type="button" className="sprintDetail" onClick={reloadSprintData}>
                  다시 시도
                </button>
              )}
              <button type="button" className="sprintDetail" onClick={() => navigate("/sprints")}>
                ‹ 스프린트 목록으로
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  return <SprintTasksBody key={sprint.id} sprint={sprint} />;
}

function SprintTasksBody({ sprint }) {
  const navigate = useNavigate();
  const auth = useAuth();
  // 작업은 서버에서 불러온 공용 데이터예요 — 칸반 보드·페이지 TASK 블록과 같은 배열을 봐요. 다만 이 화면
  // (TaskTable/TaskRow/TaskDetailPanel)은 원래부터 담당자 1명(문자열)·한글 우선순위를 기대하게 만들어져
  // 있어서, 그 컴포넌트들은 그대로 두고 여기서만 공용 모델(assignees 배열·영문 priority enum)과의 차이를 흡수해요.
  const {
    sprints = [],
    members = [],
    taskStatuses = [],
    sprintTasks,
    createTask,
    updateTask,
    deleteTasks,
    toggleSubtask,
    addSubtasks,
    deleteSubtask,
  } = useOutletContext();

  const isBacklog = sprint.id === "backlog";
  const ownerId = isBacklog ? null : sprint.id;

  // 이 스프린트(백로그면 미배정)의 작업만 보여줘요.
  const sprintOwnTasks = useMemo(
    () => sprintTasks.filter((task) => task.sprintId === ownerId),
    [sprintTasks, ownerId],
  );
  const [selectedId, setSelectedId] = useState(() => sprintOwnTasks[0]?.id ?? null);
  const [checkedIds, setCheckedIds] = useState([]);
  const [notice, setNotice] = useState("");

  const tasks = sprintOwnTasks.map((task) => ({
    ...task,
    assignee: task.assignees?.[0]?.name ?? "",
    priority: PRIORITY_LABEL[task.priority] ?? task.priority,
  }));
  const selectedTask = tasks.find((task) => task.id === selectedId);
  const memberNames = members.map((member) => member.name);

  // TaskDetailPanel은 onChange(key, value)로 "assignee"(문자열 이름)나 "priority"(한글)를 넘겨요 —
  // 여기서 공용 모델 필드(assignees 배열, 영문 priority)로 바꿔요. 그 외 필드
  // (title/startDate/dueDate/description)는 이름이 같아서 그대로 둬요.
  const toCanonicalPatch = (key, value) => {
    if (key === "assignee") {
      const member = members.find((item) => item.name === value);
      return member ? { assignees: [member] } : {};
    }
    if (key === "priority") return { priority: PRIORITY_KO_TO_EN[value] ?? value };
    return { [key]: value };
  };

  const updateSelected = (key, value) => {
    if (selectedId != null) updateTask(selectedId, toCanonicalPatch(key, value));
  };

  const toggleCheck = (id) => {
    if (id === "ALL")
      return setCheckedIds(checkedIds.length === tasks.length ? [] : tasks.map((task) => task.id));
    setCheckedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const addTask = async () => {
    const me = members.find((member) => member.id === auth?.user?.id);
    const created = await createTask(ownerId, {
      title: "새 작업",
      statusId: taskStatuses[0]?.id,
      assignees: me ? [me] : [],
      priority: "MEDIUM",
      startDate: sprint.startDate ?? "",
      dueDate: sprint.endDate ?? "",
      description: "",
    });

    if (created) {
      setSelectedId(created.id);
      setCheckedIds([]);
    }
  };

  const toggleSubtaskAt = (index) => {
    if (selectedId != null) toggleSubtask(selectedId, index);
  };
  const addSubtask = (multiple) => {
    if (selectedId == null) return;
    addSubtasks(selectedId, multiple ? ["하위 작업 1", "하위 작업 2"] : ["새 하위 작업"]);
  };
  const removeSubtask = (index) => {
    const subtask = selectedTask?.subtasks?.[index];
    if (subtask) deleteSubtask(selectedId, subtask.id);
  };

  // 일괄 편집은 체크한 작업에 한 번에 적용해요. 날짜는 작업마다 시작일/마감일이 뒤집히는지 따로
  // 확인해서, 뒤집히는 작업은 건너뛰고 몇 개를 건너뛰었는지 알려줘요.
  const batchChange = (key, value) => {
    if (!value) return;

    const isDateKey = key === "startDate" || key === "dueDate";
    let skipped = 0;

    sprintOwnTasks
      .filter((task) => checkedIds.includes(task.id))
      .forEach((task) => {
        if (
          isDateKey &&
          isRangeReversed(key === "startDate" ? value : task.startDate, key === "dueDate" ? value : task.dueDate)
        ) {
          skipped += 1;
          return;
        }
        updateTask(task.id, toCanonicalPatch(key, value));
      });

    setNotice(skipped ? `시작일이 마감일보다 늦어지는 작업 ${skipped}개는 건너뛰었어요.` : "");
  };

  const deleteChecked = () => {
    // 지운 작업은 되돌릴 수 없어서 한 번 더 물어봐요.
    if (!window.confirm(`선택한 작업 ${checkedIds.length}개를 삭제할까요?`)) return;

    deleteTasks(checkedIds);
    setCheckedIds([]);
    setSelectedId(null);
  };

  // 체크한 작업을 다른 스프린트(또는 백로그)로 옮겨요. 서버가 새 스프린트 안의 순서를 정해요.
  const moveChecked = (target) => {
    if (!target || checkedIds.length === 0) return;

    const sprintId = target === "backlog" ? null : Number(target);
    checkedIds.forEach((id) => updateTask(id, { sprintId }));
    setNotice(`작업 ${checkedIds.length}개를 옮겼어요.`);
    setCheckedIds([]);
    setSelectedId(null);
  };

  // 옮길 수 있는 곳: 지금 화면이 아닌 곳 중 끝나지 않은 스프린트, 그리고 (백로그가 아니면) 백로그.
  const moveTargets = sprints.filter((item) => item.id !== sprint.id && item.status !== "COMPLETED");

  return (
    <div className={styles.workspace}>
      <section className={styles.workspaceMain}>
        <header className={styles.pageHeader}>
          <div>
            <h1>{sprint.name} 작업</h1>
            <p>
              {sprint.name}
              {!isBacklog && `　|　${formatDateDots(sprint.startDate)} ~ ${formatDateDots(sprint.endDate)}`}
            </p>
          </div>
          <div>
            {checkedIds.length > 0 && (
              <select
                aria-label="선택한 작업 옮기기"
                value=""
                onChange={(e) => moveChecked(e.target.value)}
              >
                <option value="">{checkedIds.length}개 옮기기…</option>
                {!isBacklog && <option value="backlog">백로그</option>}
                {moveTargets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
            <button type="button" onClick={() => navigate(`/sprints/${sprint.id}`)}>
              <ArrowLeft size={17} /> {isBacklog ? "백로그로 돌아가기" : "스프린트로 돌아가기"}
            </button>
            <button type="button" onClick={() => setNotice("변경사항은 자동으로 저장돼요.")}>
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
        members={memberNames}
        selectedIds={checkedIds}
        onChange={updateSelected}
        onClose={() => {
          setSelectedId(null);
          setCheckedIds([]);
        }}
        onAddSubtask={addSubtask}
        onToggleSubtask={toggleSubtaskAt}
        onDeleteSubtask={removeSubtask}
        onBatchChange={batchChange}
        onDelete={deleteChecked}
      />
    </div>
  );
}
