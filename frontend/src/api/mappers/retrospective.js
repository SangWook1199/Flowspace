import { fileUrl } from "../../utils/fileUrl";
import { formatDateDots } from "../../utils/date";
import { getAvatarTone } from "../../utils/avatarColor";
import { getInitial } from "../../utils/initial";

const PLANNED_DESCRIPTION = "스프린트 완료 시 자동으로 회고가 생성됩니다.";

// 서버 회고 목록 항목(스프린트 한 줄) → 회고 카드.
// 카드 상태: 완료된 스프린트(회고 있음)는 done, 그중 가장 최근 것은 latest, 진행 중 스프린트는 progress,
// 그 밖(계획됨, 회고가 아직 없음)은 planned예요. 서버는 시작일 최신순으로 줘서 맨 앞 완료 회고가 최신이에요.
// 서버에는 태그가 없어서 tags는 비워둬요(카드는 태그가 없으면 그 줄을 안 그려요).
export const toRetroList = (dtos) => {
  let latestAssigned = false;

  return (dtos ?? []).map((dto) => {
    const hasRetro = dto.retrospectiveId != null;
    let status = "planned";

    if (hasRetro && dto.sprintStatus === "COMPLETED") {
      status = latestAssigned ? "done" : "latest";
      latestAssigned = true;
    } else if (dto.sprintStatus === "ACTIVE") {
      status = "progress";
    }

    return {
      id: dto.retrospectiveId ?? null,
      sprintId: dto.sprintId,
      pageId: dto.pageId ?? null,
      sprint: dto.sprintName,
      status,
      start: formatDateDots(dto.startDate),
      end: formatDateDots(dto.endDate),
      members: hasRetro ? (dto.participantCount ?? 0) : null,
      completion: dto.completionRate ?? null,
      completed: dto.completedTask ?? null,
      incomplete: dto.incompleteTask ?? null,
      actionItems: dto.actionItemCount ?? null,
      description: dto.goal || (hasRetro ? "" : PLANNED_DESCRIPTION),
      tags: [],
    };
  });
};

// 칸반 스냅샷 컬럼의 색 계열: 첫 컬럼은 todo, 마지막은 done, 사이는 doing.
// (회고 스냅샷은 상태 이름·색만 갖고 있어서 자리(순서)로 정해요.)
const laneOf = (index, count) => {
  if (count <= 1 || index === 0) return "todo";
  if (index === count - 1) return "done";
  return "doing";
};

// 서버 회고 상세 → 화면 회고.
// - kanban: 완료 시점의 상태 스냅샷마다 컬럼 하나({id, name, lane, tasks})
// - participants: 스냅샷 작업의 담당자들(중복 없이)
export const toRetroDetail = (dto) => {
  const statuses = [...(dto.statuses ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const summary = dto.summary ?? {};

  const kanban = statuses.map((status, index) => ({
    id: status.snapshotStatusId,
    name: status.name,
    lane: laneOf(index, statuses.length),
    tasks: (dto.snapshots ?? [])
      .filter((snapshot) => snapshot.snapshotStatusId === status.snapshotStatusId)
      .map((snapshot) => {
        const first = snapshot.assignees?.[0] ?? null;
        return {
          id: snapshot.snapshotId,
          title: snapshot.title,
          assignee: first?.name ?? "",
          priority: snapshot.priority ?? "",
          color: first ? getAvatarTone(first.userId) : "",
        };
      }),
  }));

  return {
    retrospectiveId: dto.retrospectiveId,
    sprintId: dto.sprintId,
    pageId: dto.pageId ?? dto.page?.pageId ?? null,
    sprintName: dto.sprintName ?? "",
    startDate: formatDateDots(dto.startDate),
    endDate: formatDateDots(dto.endDate),
    participants: (summary.participants ?? []).map((p) => ({
      id: p.userId,
      name: p.name,
      initial: getInitial(p.name),
      profileImageUrl: fileUrl(p.profileImageUrl),
    })),
    summary: {
      completionRate: summary.completionRate ?? 0,
      completed: summary.completedTask ?? 0,
      incomplete: summary.incompleteTask ?? 0,
      total: summary.totalTask ?? 0,
    },
    kanban,
  };
};
