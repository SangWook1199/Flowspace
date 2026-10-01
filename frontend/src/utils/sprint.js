// 스프린트 화면 여러 곳(목록 카드, 상세 헤더, 현재 스프린트 패널)이 같이 쓰는 표시용 계산 모음이에요.
// "14일 남음" 같은 문자열을 데이터에 박아두면 날짜가 지나도 안 바뀌니까, 종료일과 오늘로 매번 계산해요.
// API를 붙여도 서버가 주는 status/startDate/endDate/total/completed만 있으면 그대로 동작해요.

import { diffDays, percentOf, todayKey } from "./date";

export const SPRINT_STATUS_LABEL = {
  ACTIVE: "진행 중",
  PLANNING: "계획됨",
  COMPLETED: "완료",
};

// 종료일까지 남은 기간 문구. 완료된 스프린트는 "완료됨", 종료일이 없으면 빈 문자열이에요.
export const sprintRemainingLabel = (sprint, today = todayKey()) => {
  if (!sprint) return "";
  if (sprint.status === "COMPLETED") return "완료됨";

  const days = diffDays(today, sprint.endDate);
  if (days === null) return "";
  if (days === 0) return "오늘 종료";
  return days > 0 ? `${days}일 남음` : `${-days}일 지남`;
};

// 진행률은 저장된 progress 값 대신 완료/전체로 매번 계산해요(숫자끼리 어긋날 일이 없어요).
export const sprintPercent = (sprint) => percentOf(sprint?.completed ?? 0, sprint?.total ?? 0);
