import { getInitial } from "../../utils/initial";

// 서버 ActivityResponse → 대시보드 "최근 활동" 항목.
// 서버는 "누가 무엇을 했는지"(type)와 대상 id만 줘서, 대상 이름은 화면이 가진 목록에서 찾아요(lookup).
//   lookup = { task(id) → 제목, sprint(id) → 이름, page(id) → 제목 }  (못 찾으면 이름 없이 문구만 보여줘요)
// noun: 대상 이름, particle: 받침에 맞는 조사(을/를), verb: 한 일
const ACTION_LABEL = {
  PAGE_CREATED: { noun: "페이지", particle: "를", verb: "만들었습니다" },
  TASK_CREATED: { noun: "작업", particle: "을", verb: "만들었습니다" },
  TASK_COMPLETED: { noun: "작업", particle: "을", verb: "완료했습니다" },
  COMMENT_CREATED: { noun: "댓글", particle: "을", verb: "남겼습니다" },
  SPRINT_CREATED: { noun: "스프린트", particle: "를", verb: "만들었습니다" },
  SPRINT_COMPLETED: { noun: "스프린트", particle: "를", verb: "완료했습니다" },
};

const TARGET_LOOKUP = { PAGE: "page", TASK: "task", SPRINT: "sprint" };

export const toActivity = (dto, lookup = {}, now = Date.now()) => {
  const label = ACTION_LABEL[dto.type] ?? { noun: "항목", particle: "을", verb: "변경했습니다" };
  const targetName = lookup[TARGET_LOOKUP[dto.targetType]]?.(dto.targetId);
  const object = `${targetName ? `‘${targetName}’ ` : ""}${label.noun}${label.particle}`;

  return {
    id: dto.activityId,
    userId: dto.userId,
    initial: getInitial(dto.userName),
    text: `${dto.userName}님이 ${object} ${label.verb}.`,
    time: toRelativeTime(dto.createdAt, now),
  };
};

// "5분 전", "2시간 전", "3일 전" 같은 상대 시간. 서버는 시간대 없는 LocalDateTime을 주니 로컬 시간으로 읽어요.
export const toRelativeTime = (value, now = Date.now()) => {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";

  const minutes = Math.max(0, Math.floor((now - time) / 60000));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}일 전` : new Date(time).toLocaleDateString("ko-KR");
};
