import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import TaskDetailPanel from "../components/sprint/TaskDetailPanel";
import TaskTable from "../components/sprint/TaskTable";
import { PRIORITY_KO_TO_EN, PRIORITY_LABEL, taskMembers, toAssignee } from "../mock/sprintTasks";
import { sprints } from "../mock/sprints";
import { statuses } from "../mock/kanban";
import { formatDateDots, isRangeReversed } from "../utils/date";
import { nextNumericId, nextPrefixedKey } from "../utils/id";
import styles from "../components/sprint/TaskWorkspace.module.css";

// :sprintId 경로 값으로 스프린트를 찾아요. 없는 스프린트(숫자가 아니거나 목록에 없음)면 첫 번째
// 스프린트로 대신 보여주지 않고 "찾을 수 없어요" 화면을 보여줘요. 실제 화면은 SprintTasksBody예요 —
// key로 스프린트가 바뀔 때 선택/체크 상태가 새로 시작하게 하려고 나눠뒀어요.
export default function SprintTasks() {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  const sprint = sprints.find((item) => String(item.id) === sprintId) ?? null;

  if (!sprint) {
    return (
      <div className={styles.workspace}>
        <section className={styles.workspaceMain}>
          <div className="emptySprints" role="alert">
            <p>스프린트를 찾을 수 없어요</p>
            <button type="button" className="sprintDetail" onClick={() => navigate("/sprints")}>
              ‹ 스프린트 목록으로
            </button>
          </div>
        </section>
      </div>
    );
  }

  return <SprintTasksBody key={sprint.id} sprint={sprint} />;
}

function SprintTasksBody({ sprint }) {
  const navigate = useNavigate();
  // 태스크 자체는 이제 MainLayout에서 끌어올린 세션 상태(sprintTasks)예요
  // — 칸반 보드·페이지 TASK 블록과 같은 배열을 봐요. 다만 이 화면
  // (TaskTable/TaskRow/TaskDetailPanel)은 원래부터 담당자 1명(문자열)·
  // 한글 우선순위를 기대하게 만들어져 있어서, 그 컴포넌트들은 그대로
  // 두고 여기서만 공용 모델(assignees 배열·영문 priority enum)과의
  // 차이를 흡수해요.
  const { sprintTasks, setSprintTasks } = useOutletContext();

  // 이 스프린트의 작업만 보여줘요(작업마다 sprintId가 있어요).
  const sprintOwnTasks = useMemo(
    () => sprintTasks.filter((task) => task.sprintId === sprint.id),
    [sprintTasks, sprint.id],
  );
  const [selectedId, setSelectedId] = useState(() => sprintOwnTasks[0]?.id ?? null);
  const [checkedIds, setCheckedIds] = useState([]);
  const [notice, setNotice] = useState("");

  // "작업 추가"를 빠르게 연달아 눌러도 같은 id가 안 나오게, 다음 id는 렌더가 끝나길 기다리지 않고
  // "방금까지 반영된 최신 목록"에서 계산해요(렌더 때마다 최신 상태로 맞추고, 추가할 때 바로 갱신해요).
  const latestTasksRef = useRef(sprintTasks);
  useEffect(() => {
    latestTasksRef.current = sprintTasks;
  }, [sprintTasks]);

  const tasks = sprintOwnTasks.map((task) => ({
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
    // 예전엔 `SP1-${목록 길이 + 1}`로 만들어서, 중간 작업을 지운 뒤 추가하면 이미 있는 id와 겹쳤어요.
    // 이제는 "이 스프린트 접두사를 가진 id 중 가장 큰 번호 + 1"이에요(스프린트 id는 sprint.id 그대로).
    const id = nextPrefixedKey(latestTasksRef.current, `SP${sprint.id}-`);
    const newTask = {
      id,
      sprintId: sprint.id,
      title: "새 작업",
      statusId: statuses[0]?.id ?? 1,
      assignees: taskMembers[0] ? [toAssignee(taskMembers[0])] : [],
      priority: "MEDIUM",
      startDate: sprint.startDate ?? "",
      dueDate: sprint.endDate ?? "",
      subtasks: [],
      description: "",
    };

    latestTasksRef.current = [...latestTasksRef.current, newTask];
    // 혹시 그 사이 같은 id가 이미 들어와 있으면(다른 화면에서 추가 등) 건너뛰어요.
    setSprintTasks((current) =>
      current.some((task) => task.id === id) ? current : [...current, newTask],
    );
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
                  // 하위 작업을 중간에 지운 뒤에도 id가 안 겹치게 "지금 있는 id의 최댓값 + 1"부터 매겨요.
                  id: nextNumericId(task.subtasks) + i,
                  text,
                  checked: false,
                })),
              ],
            }
          : task,
      ),
    );
  // 일괄 편집은 체크한 작업에 한 번에 적용해요. 날짜는 작업마다 시작일/마감일이 뒤집히는지 따로
  // 확인해서, 뒤집히는 작업은 건너뛰고 몇 개를 건너뛰었는지 알려줘요.
  const batchChange = (key, value) => {
    if (!value) return;

    const isDateKey = key === "startDate" || key === "dueDate";
    const skipped = isDateKey
      ? sprintTasks.filter(
          (task) =>
            checkedIds.includes(task.id) &&
            isRangeReversed(
              key === "startDate" ? value : task.startDate,
              key === "dueDate" ? value : task.dueDate,
            ),
        ).length
      : 0;

    setSprintTasks((current) =>
      current.map((task) => {
        if (!checkedIds.includes(task.id)) return task;
        if (
          isDateKey &&
          isRangeReversed(
            key === "startDate" ? value : task.startDate,
            key === "dueDate" ? value : task.dueDate,
          )
        )
          return task;
        return { ...task, ...toCanonicalPatch(key, value) };
      }),
    );
    setNotice(
      skipped ? `시작일이 마감일보다 늦어지는 작업 ${skipped}개는 건너뛰었어요.` : "",
    );
  };
  const deleteChecked = () => {
    // 지운 작업은 되돌릴 수 없어서 한 번 더 물어봐요.
    if (!window.confirm(`선택한 작업 ${checkedIds.length}개를 삭제할까요?`)) return;

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
            <h1>{sprint.name} 작업</h1>
            <p>{sprint.name}　|　{formatDateDots(sprint.startDate)} ~ {formatDateDots(sprint.endDate)}</p>
          </div>
          <div>
            <button type="button" onClick={() => navigate(`/sprints/${sprint.id}`)}>
              <ArrowLeft size={17} /> 스프린트로 돌아가기
            </button>
            <button type="button" onClick={() => setNotice("변경사항을 저장했습니다.")}>
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
        members={taskMembers}
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
