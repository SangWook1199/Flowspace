export const activeSprint = {
  id: 1,
  name: "Sprint 1",
  goal: "로그인 및 인증 기능 구현",
};

export const statuses = [
  {
    id: 1,
    name: "TODO",
    category: "TODO",
    color: "GRAY",
    position: 0,
    isDefault: true,
  },
  {
    id: 2,
    name: "진행 중",
    category: "IN_PROGRESS",
    color: "BLUE",
    position: 1,
    isDefault: true,
  },
  {
    id: 3,
    name: "QA",
    category: "IN_PROGRESS",
    color: "PURPLE",
    position: 2,
    isDefault: false,
  },
  {
    id: 4,
    name: "완료",
    category: "DONE",
    color: "GREEN",
    position: 3,
    isDefault: true,
  },
];

// 예전엔 여기 kanbanTasks가 따로 있었어요 — mock/sprintTasks.js의
// sprintTaskRows와 같은 "SP1-N" 코드를 쓰면서도 서로 다른 제목/담당자를
// 가진 완전히 별개의 목데이터였어요(예: 둘 다 SP1-2가 있지만 하나는
// "블록 드래그 기능", 하나는 "유저 알림 시스템" — 같은 작업이 아니었어요).
// 칸반 보드와 스프린트 작업 목록·페이지 TASK 블록이 같은 걸 봐야 하니까,
// 칸반 보드도 이제 sprintTaskRows를 그대로 읽어요(Kanban.jsx가
// mock/sprintTasks에서 가져와요) — 이 파일엔 칸반 화면 전용인
// statuses/activeSprint만 남겨뒀어요.
