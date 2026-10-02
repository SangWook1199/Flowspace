import { toAssignee } from "./sprintTasks";

// 스프린트 목록 API가 내려줄 모양이에요. total = completed + inProgress + todo 이고, 화면은 이 숫자들을
// 그대로 보여줘요(남은 기간 문구·진행률 같은 건 날짜/숫자로 화면에서 계산해요 — utils/sprint.js).
// 날짜는 서버가 주는 "YYYY-MM-DD" 그대로 두고, 점(.) 표기는 화면에서 formatDateDots로 바꿔요.
export const sprints = [
  {
    id: 1,
    name: "Sprint 1",
    status: "ACTIVE",
    goal: "로그인 및 인증 기능 구현",
    startDate: "2026-05-29",
    endDate: "2026-06-11",
    progress: 69,
    total: 35,
    completed: 24,
    inProgress: 7,
    todo: 4,
    color: "indigo",
    icon: "Flag",
  },
  {
    id: 2,
    name: "Sprint 2",
    status: "PLANNING",
    goal: "회원 관리 및 프로젝트 기능 구현",
    startDate: "2026-06-12",
    endDate: "2026-06-25",
    progress: 0,
    total: 12,
    completed: 0,
    inProgress: 0,
    todo: 12,
    color: "sky",
    icon: "CalendarDays",
  },
  {
    id: 3,
    name: "Sprint 3",
    status: "COMPLETED",
    goal: "대시보드 및 통계 기능 구현",
    startDate: "2026-05-01",
    endDate: "2026-05-14",
    progress: 100,
    total: 18,
    completed: 18,
    inProgress: 0,
    todo: 0,
    color: "green",
    icon: "CircleCheck",
  },
  {
    id: 4,
    name: "Sprint 4",
    status: "PLANNING",
    goal: "알림 및 실시간 기능 구현",
    startDate: "2026-06-26",
    endDate: "2026-07-09",
    progress: 0,
    total: 10,
    completed: 0,
    inProgress: 0,
    todo: 10,
    color: "amber",
    icon: "Hourglass",
  },
];

// 백로그는 "스프린트에 안 묶인 작업 모음"이라 작업 개수는 여기 박아두지 않고 backlogTasks 길이로 세요.
export const backlog = {
  id: "backlog",
  name: "백로그",
  description: "아직 스프린트에 배정되지 않은 작업",
  color: "slate",
};

export const backlogSprint = {
  id: "backlog",
  name: "백로그",
  status: "BACKLOG", // 이 값이 핵심
  goal: "아직 스프린트에 배정되지 않은 작업",
  startDate: "",
  endDate: "",
  color: "gray",
  icon: "Archive",
};

// 백로그 작업도 스프린트 작업(mock/sprintTasks.js)과 같은 모양이에요 — sprintId만 null이에요.
// 그래서 상세 화면의 작업 표가 스프린트/백로그를 가리지 않고 같은 컴포넌트로 그려져요.
export const backlogTasks = [
  {
    id: "BKL-1",
    title: "회원 탈퇴 API",
    sprintId: null,
    statusId: 1,
    priority: "HIGH",
    assignees: [toAssignee("상욱"), toAssignee("민수")],
    startDate: "2026-09-01",
    dueDate: "2026-09-02",
    subtasks: [
      { id: 1, text: "탈퇴 요청 API", checked: false },
      { id: 2, text: "연관 데이터 정리", checked: false },
    ],
    description: "",
  },
  {
    id: "BKL-2",
    title: "프로젝트 초대 기능",
    sprintId: null,
    statusId: 4,
    priority: "MEDIUM",
    assignees: [toAssignee("서연")],
    startDate: "2026-09-03",
    dueDate: "2026-09-04",
    subtasks: [{ id: 1, text: "초대 링크 발급", checked: true }],
    description: "",
  },
];
