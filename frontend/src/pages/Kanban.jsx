import { useMemo, useState, Fragment } from "react";
import { Plus } from "lucide-react";
import { useOutletContext } from "react-router-dom";

import KanbanColumn from "../components/kanban/KanbanColumn";
import StatusModal from "../components/kanban/StatusModal";

import { nextNumericId } from "../utils/id";

import { activeSprint, statuses as statusesMock } from "../mock/kanban";

export default function Kanban() {
  // 태스크 자체(sprintTasks)는 이제 MainLayout에서 끌어올린 세션
  // 상태예요 — 스프린트 작업 목록(SprintTasks.jsx)·페이지 TASK 블록
  // (BlockEditor.jsx)과 이 배열을 그대로 같이 써서, 어느 화면에서
  // 바꾸든 나머지에도 반영돼요. 컬럼(statuses) 순서/카드 위치는 아직
  // 이 화면(칸반 보드)만의 관심사라 로컬 상태로 남겨뒀어요.
  const { sprintTasks, setSprintTasks } = useOutletContext();
  const [createOpen, setCreateOpen] = useState(false);

  // 컬럼(상태) 순서도 카드랑 똑같은 방식이에요 — 드래그 중엔 배열을 안
  // 건드리고 "여기 놓으면 이 컬럼 앞으로/뒤로 들어간다"는 목표 위치만
  // 들고 있다가, 드롭할 때 한 번만 실제로 순서를 바꿔요(commitColumnDrop).
  // 드래그 중인 컬럼은 원래 자리에서 반투명하게만 보이고, 목표 위치는
  // 카드와 같은 색의 세로줄(.dropIndicatorVertical)로 보여줘요. 아직
  // 로그인/API 연동 전이라 실제로는 프론트에서만 순서가 바뀌고 새로고침
  // 하면 원래대로 돌아가요. 나중에 API가 붙으면 PATCH
  // /api/task-statuses/reorder 에 { workspaceId, statuses: [{statusId,
  // position}] } 를 지금 순서 그대로(0,1,2...) 보내면 돼요 — status의
  // position은 백엔드에서도 그냥 정수라 배열 인덱스를 그대로 쓰면 됩니다.
  const [statuses, setStatuses] = useState(() =>
    [...statusesMock].sort((a, b) => a.position - b.position),
  );
  const [dragStatusId, setDragStatusId] = useState(null);
  const [statusDropTarget, setStatusDropTarget] = useState(null); // { beforeStatusId }

  // 예전엔 다른 컬럼 헤더에 "들어오면"(dragenter) 무조건 "그 컬럼 앞"
  // 으로만 판단했어요. 그러면 뒤쪽에 놓고 싶어도 항상 앞으로만 잡혀서
  // 어색했어요. 그래서 이제는 dragover(커서가 그 헤더 위에서 움직일
  // 때마다 계속 불려요)로 커서가 그 컬럼 너비의 2/3 지점을 넘었는지를
  // 계산해서, 못 넘었으면 "이 컬럼 앞", 넘었으면 "이 컬럼 뒤(=다음
  // 컬럼 앞, 이게 마지막 컬럼이면 맨 끝)"로 판단해요 — 지라처럼 정확히
  // 그 경계까지 가지 않아도 절반 이상 지나가면 자연스럽게 반응해요.
  const handleColumnDragOver = (hoveredStatusId, isAfter) => {
    if (dragStatusId === null || dragStatusId === hoveredStatusId) return;

    const hoveredIndex = statuses.findIndex((s) => s.id === hoveredStatusId);
    const nextStatus = isAfter ? statuses[hoveredIndex + 1] : null;
    const beforeStatusId = isAfter ? (nextStatus ? nextStatus.id : null) : hoveredStatusId;

    // 드래그 중인 컬럼 바로 앞 컬럼을, 그 컬럼의 2/3 지점을 넘어서
    // 호버하면 "다음 컬럼"이 드래그 중인 컬럼 자신이 돼요 — 즉
    // "자기 자신 앞에 넣기"라는 의미 없는 목표라 지금 자리 그대로인
    // 셈인데, 아래 인덱스 비교(targetIndex === fromIndex + 1)로는 안
    // 걸러져서(targetIndex가 fromIndex와 같아짐) 따로 먼저 걸러줘요.
    if (beforeStatusId === dragStatusId) {
      setStatusDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    // 실제로 순서가 안 바뀌는 자리(지금 있는 자리 그대로)면 줄을 숨겨요.
    const fromIndex = statuses.findIndex((s) => s.id === dragStatusId);
    if (beforeStatusId === null) {
      if (fromIndex === statuses.length - 1) {
        setStatusDropTarget((prev) => (prev === null ? prev : null));
        return;
      }
    } else {
      const targetIndex = statuses.findIndex((s) => s.id === beforeStatusId);
      if (targetIndex === fromIndex + 1) {
        setStatusDropTarget((prev) => (prev === null ? prev : null));
        return;
      }
    }

    setStatusDropTarget((prev) =>
      prev && prev.beforeStatusId === beforeStatusId ? prev : { beforeStatusId },
    );
  };

  // 마지막 컬럼 오른쪽의 전용 드롭 영역(boardEndZone) — 컬럼이 하나도
  // 없거나(빈 보드) 보드 폭이 컬럼들 전체보다 넓어서 마지막 컬럼 오른쪽에
  // 순수하게 빈 공간이 남는 경우를 위한 보험이에요. 컬럼 위에서는 이제
  // 위쪽의 2/3 로직이 "마지막 컬럼 뒤로 보내기"도 처리해줘요.
  const handleBoardEndDragEnter = () => {
    if (dragStatusId === null) return;

    const fromIndex = statuses.findIndex((s) => s.id === dragStatusId);
    if (fromIndex === statuses.length - 1) {
      setStatusDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    setStatusDropTarget((prev) =>
      prev && prev.beforeStatusId === null ? prev : { beforeStatusId: null },
    );
  };

  // cancelled가 true면(Esc로 취소했거나 보드 밖에 놓아서 드롭이 안 일어난 경우) 순서는 건드리지 않고
  // 드래그 상태만 정리해요 — 예전엔 dragend마다 무조건 커밋해서 취소해도 컬럼이 움직였어요.
  const commitColumnDrop = (cancelled = false) => {
    if (!cancelled && dragStatusId !== null && statusDropTarget) {
      setStatuses((prev) => {
        const next = [...prev];
        const fromIndex = next.findIndex((s) => s.id === dragStatusId);
        if (fromIndex === -1) return prev;

        const [moved] = next.splice(fromIndex, 1);

        if (statusDropTarget.beforeStatusId === null) {
          next.push(moved);
        } else {
          const toIndex = next.findIndex(
            (s) => s.id === statusDropTarget.beforeStatusId,
          );
          if (toIndex === -1) {
            next.push(moved);
          } else {
            next.splice(toIndex, 0, moved);
          }
        }

        return next.map((status, index) => ({ ...status, position: index }));
      });
    }

    setDragStatusId(null);
    setStatusDropTarget(null);
  };

  // task(카드) 순서도 처음엔 컬럼처럼 dragenter마다 바로 배열을 바꾸는
  // 방식으로 했었는데, 그러면 카드가 다른 컬럼으로 넘어가는 순간 그
  // 카드가 원래 컬럼 트리에서 통째로 unmount되고 새 컬럼 트리에 다시
  // mount돼요(컬럼끼리는 서로 다른 KanbanColumn 컴포넌트라 리액트가 DOM
  // 노드를 그대로 못 옮기고 새로 만들어요). 그 순간 브라우저 입장에선
  // 드래그 중이던 바로 그 엘리먼트가 사라져버린 거라, 드롭해도 그
  // 카드의 dragend가 제대로 안 오고 드래그가 붕 떠버려서 카드가 반투명
  // 상태로 굳어버리는 버그가 있었어요(빈 컬럼에 드롭할 때 특히 잘
  // 재현됐어요).
  //
  // 그래서 지금은 드래그 도중엔 배열을 안 건드리고 "여기에 놓으면
  // 이 카드 앞/뒤에 들어간다"는 목표 위치(dropTarget)만 들고 있다가, 드롭
  // 하는 순간 딱 한 번만 실제로 배열을 바꿔요(commitDrop). 드래그 중인
  // 카드는 원래 자리에 계속 남아있어서(반투명 표시만 됨) unmount 문제가
  // 없고, 목표 위치는 지라처럼 파란 줄(.dropIndicator)로 보여줘요.
  //
  // 보드에는 "이 스프린트의 작업"만 보여줘요(sprintId가 아직 없는 예전 데이터는 그대로 보여줘요).
  // 그리고 어떤 컬럼에도 안 맞는 statusId(상태가 지워졌거나 아직 없는 값)를 가진 작업이 보드에서
  // 사라지지 않도록 첫 번째 컬럼에 모아서 보여줘요.
  const tasks = useMemo(() => {
    const statusIds = new Set(statuses.map((s) => s.id));
    const fallbackStatusId = statuses[0]?.id;

    return sprintTasks
      .filter((task) => task.sprintId === undefined || task.sprintId === activeSprint.id)
      .map((task) =>
        statusIds.has(task.statusId) || fallbackStatusId === undefined
          ? task
          : { ...task, statusId: fallbackStatusId },
      );
  }, [sprintTasks, statuses]);
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { statusId, beforeTaskId }

  // 컬럼과 같은 이유로, 카드 위에 올라왔다고 무조건 "이 카드 앞"으로
  // 잡지 않고 dragover로 커서가 카드 높이의 2/3 지점을 넘었는지를 계속
  // 계산해요. 못 넘었으면 "이 카드 앞", 넘었으면 "이 카드 뒤(=다음
  // 카드 앞, 이 컬럼의 마지막 카드면 맨 끝)"로 판단해요.
  const handleTaskDragOver = (hoveredTaskId, isAfter, statusId) => {
    if (dragTaskId === null || dragTaskId === hoveredTaskId) return;

    const columnTasks = tasks.filter((t) => t.statusId === statusId);
    const hoveredIndex = columnTasks.findIndex((t) => t.id === hoveredTaskId);
    const nextTask = isAfter ? columnTasks[hoveredIndex + 1] : null;
    const beforeTaskId = isAfter ? (nextTask ? nextTask.id : null) : hoveredTaskId;

    // 드래그 중인 카드 바로 앞 카드를, 그 카드의 2/3 지점을 넘어서
    // 호버하면 "다음 카드"가 드래그 중인 카드 자신이 돼요 — 즉 "자기
    // 자신 앞에 넣기"라는 의미 없는 목표라 지금 자리 그대로인 셈인데,
    // 아래 인덱스 비교(targetIndex === fromIndex + 1)로는 안
    // 걸러져서(targetIndex가 fromIndex와 같아짐) 따로 먼저 걸러줘요.
    // 이게 바로 "2/3 지점을 넘겨서 드롭해도 이동이 안 되는데 보라색
    // 줄은 뜨는" 버그의 원인이었어요.
    if (beforeTaskId === dragTaskId) {
      setDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    // 같은 컬럼 안에서 드래그 중이면, 실제로 자리가 안 바뀌는 경우엔 줄을 숨겨요(컬럼과 같은
    // 방식의 no-op 체크). 위치는 전체 배열이 아니라 "그 컬럼 안에서의 순서"끼리 비교해야 해요 —
    // 다른 컬럼 카드가 사이에 끼어 있으면 전체 배열 인덱스로는 바로 다음 칸인지 알 수 없어요.
    const draggedTask = tasks.find((t) => t.id === dragTaskId);
    if (draggedTask?.statusId === statusId) {
      const fromIndex = columnTasks.findIndex((t) => t.id === dragTaskId);

      if (beforeTaskId === null) {
        if (fromIndex === columnTasks.length - 1) {
          setDropTarget((prev) => (prev === null ? prev : null));
          return;
        }
      } else {
        const targetIndex = columnTasks.findIndex((t) => t.id === beforeTaskId);
        if (targetIndex === fromIndex + 1) {
          setDropTarget((prev) => (prev === null ? prev : null));
          return;
        }
      }
    }

    setDropTarget((prev) =>
      prev && prev.statusId === statusId && prev.beforeTaskId === beforeTaskId
        ? prev
        : { statusId, beforeTaskId },
    );
  };

  // 컬럼 안에 카드가 하나도 없거나(빈 컬럼), 카드들보다 컬럼이 더 길어서
  // 카드 밑에 순수하게 빈 공간이 남는 경우를 위한 보험(columnEndZone).
  // 카드 위에서는 이제 위쪽의 2/3 로직이 "이 컬럼의 마지막 카드 뒤로
  // 보내기"도 처리해줘요.
  const handleColumnEndDragEnter = (statusId) => {
    if (dragTaskId === null) return;

    const columnTasks = tasks.filter((t) => t.statusId === statusId);
    const fromIndex = columnTasks.findIndex((t) => t.id === dragTaskId);
    if (fromIndex !== -1 && fromIndex === columnTasks.length - 1) {
      setDropTarget((prev) => (prev === null ? prev : null));
      return;
    }

    setDropTarget((prev) =>
      prev && prev.statusId === statusId && prev.beforeTaskId === null
        ? prev
        : { statusId, beforeTaskId: null },
    );
  };

  // 실제 배열 반영은 여기서 딱 한 번. beforeTaskId가 있으면 "그 카드
  // 바로 앞"으로, null이면 "그 status의 맨 끝"으로 넣어요. 다른
  // 컬럼으로 옮긴 거면 statusId도 같이 바뀌어요(칸반 상태 변경).
  // dragTaskId나 dropTarget이 비어있으면(드래그를 취소했거나 이미
  // 커밋된 뒤 중복 호출된 경우) 조용히 넘어가요.
  //
  // cancelled가 true면(Esc 취소, 보드 밖 드롭) 아무것도 옮기지 않고 드래그 상태만 지워요.
  const commitDrop = (cancelled = false) => {
    if (!cancelled && dragTaskId !== null && dropTarget) {
      setSprintTasks((prev) => {
        const next = [...prev];
        const fromIndex = next.findIndex((t) => t.id === dragTaskId);
        if (fromIndex === -1) return prev;

        const [moved] = next.splice(fromIndex, 1);
        const movedWithStatus = { ...moved, statusId: dropTarget.statusId };

        if (dropTarget.beforeTaskId === null) {
          next.push(movedWithStatus);
          return next;
        }

        const toIndex = next.findIndex((t) => t.id === dropTarget.beforeTaskId);
        if (toIndex === -1) {
          next.push(movedWithStatus);
        } else {
          next.splice(toIndex, 0, movedWithStatus);
        }

        return next;
      });
    }

    setDragTaskId(null);
    setDropTarget(null);
  };

  // 컬럼(상태) 만들기/고치기/지우기 — 아직 API 전이라 이 화면의 state만 바꿔요. API가 붙으면 각각
  // POST / PATCH / DELETE /api/task-statuses 를 부른 뒤 이 자리에서 목록을 갱신하면 돼요.
  // 새 상태는 맨 끝에 붙고, id는 지금 있는 id 중 가장 큰 값 + 1이에요(서버가 id를 주면 그 값으로 바꿔요).
  const createStatus = ({ name, category, color }) => {
    setStatuses((prev) => [
      ...prev,
      { id: nextNumericId(prev), name, category, color, position: prev.length, isDefault: false },
    ]);
    setCreateOpen(false);
  };

  // 이름/카테고리/색만 바꿔요. 작업은 statusId로 연결돼 있어서 이름이 바뀌어도 그대로 따라와요.
  const saveStatus = (data) => {
    setStatuses((prev) =>
      prev.map((status) =>
        status.id === data.id
          ? { ...status, name: data.name, category: data.category, color: data.color }
          : status,
      ),
    );
  };

  // 상태를 지울 땐 그 상태의 작업을 모달에서 고른 상태로 먼저 옮겨요 — 안 그러면 컬럼이 없어진 작업이
  // 보드에서 사라져요. 옮길 곳이 없거나(자기 자신 포함) 이미 없는 상태면 아무것도 안 해요.
  const deleteStatus = ({ deleteStatusId, moveToStatusId }) => {
    const canMove =
      moveToStatusId !== deleteStatusId && statuses.some((status) => status.id === moveToStatusId);
    if (!canMove) return;

    setSprintTasks((prev) =>
      prev.map((task) =>
        task.statusId === deleteStatusId ? { ...task, statusId: moveToStatusId } : task,
      ),
    );
    setStatuses((prev) =>
      prev
        .filter((status) => status.id !== deleteStatusId)
        .map((status, index) => ({ ...status, position: index })),
    );
  };

  return (
    <div className="kanbanPage">
      <header className="kanbanHeader">
        <div>
          <h1>칸반 보드</h1>
          <p>{activeSprint.name} · 현재 활성 스프린트</p>
        </div>

        <button type="button" className="addStatusBtn" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />새 상태 컬럼
        </button>
      </header>

      {/* dragend가 어떤 이유로든(브라우저마다 미묘하게 다를 수 있어서)
          카드/컬럼 쪽까지 안 오는 극단적인 경우를 대비해, 보드 전체
          레벨에서도 drop을 받으면 두 commit을 한 번 더 불러요 — 이미
          커밋됐거나 해당 없는 쪽은 각자 안에서 조용히 무시되니 중복
          호출이어도 안전해요. */}
      <section
        className="kanbanBoard"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          commitDrop(false);
          commitColumnDrop(false);
        }}
      >
        {statuses.map((status) => (
          <Fragment key={status.id}>
            {statusDropTarget?.beforeStatusId === status.id && (
              <div className="dropIndicatorVertical" />
            )}

            <KanbanColumn
              status={status}
              statuses={statuses}
              onStatusSave={saveStatus}
              onStatusDelete={deleteStatus}
              tasks={tasks.filter((task) => task.statusId === status.id)}
              isDragging={status.id === dragStatusId}
              onColumnDragStart={() => setDragStatusId(status.id)}
              onColumnDragOver={(isAfter) => handleColumnDragOver(status.id, isAfter)}
              onColumnDragEnd={commitColumnDrop}
              draggingTaskId={dragTaskId}
              dropTarget={dropTarget}
              onTaskDragStart={(taskId) => setDragTaskId(taskId)}
              onTaskDragOver={(taskId, isAfter) => handleTaskDragOver(taskId, isAfter, status.id)}
              onColumnEndDragEnter={() => handleColumnEndDragEnter(status.id)}
              onTaskDragEnd={commitDrop}
            />
          </Fragment>
        ))}

        {statusDropTarget?.beforeStatusId === null && (
          <div className="dropIndicatorVertical" />
        )}

        {/* 마지막 컬럼 다음의 전용 드롭 영역 — 컬럼 사이 gap 여백과는
            달리 여기 들어와야만 "맨 끝으로" 처리돼요. */}
        <div
          className="boardEndZone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          onDragEnter={(e) => {
            e.preventDefault();
            handleBoardEndDragEnter();
          }}
        />
      </section>

      {createOpen && (
        <StatusModal
          mode="create"
          statuses={statuses}
          onClose={() => setCreateOpen(false)}
          onSave={createStatus}
        />
      )}
    </div>
  );
}
