export const navigation = [
  ["홈", "House"],
  ["스프린트", "Flag"],
  ["칸반", "KanbanSquare"],
  ["캘린더", "CalendarDays"],
  ["회고", "MessageSquareText"],
];

export const pages = ["API 명세", "디자인 시스템", "QA 체크리스트"];

export const members = [
  { name: "상욱", initial: "상", tone: "blue", online: true },
  { name: "민수", initial: "민", tone: "green", online: true },
  { name: "서연", initial: "서", tone: "purple", online: true },
  { name: "지민", initial: "지", tone: "gray", online: true },
];

export const sprint = {
  name: "Sprint 1",
  status: "진행 중",

  start: "2026.09.01",
  end: "2026.09.14",
  remain: "14일 남음",

  progress: 68,
  total: 35,
  completed: 24,
  progressing: 8,
  todo: 3,

  goal: "핵심 기능 개발 및 베타 배포 준비",
  goalDesc:
    "안정적인 서비스를 출시하기 위한 핵심 기능을 완성하고 내부 베타 테스트를 진행합니다.",
};

export const kpis = [
  {
    label: "완료율",
    value: "68%",
    note: "24 / 35 작업 완료",
    icon: "CheckCircle2",
    color: "blue",
  },
  {
    label: "오늘 할 일",
    value: "8건",
    note: "전체 12건 중",
    icon: "ClipboardCheck",
    color: "blue",
  },
  {
    label: "오늘 일정",
    value: "3건",
    note: "회의 2 · 발표 1",
    icon: "CalendarDays",
    color: "purple",
  },
  {
    label: "온라인 팀원",
    value: "4 / 4명",
    note: "지금 함께 작업 중",
    icon: "Users",
    color: "green",
  },
];

export const todayTasks = [
  {
    id: 1,
    title: "JWT 로그인 API 구현",
    priority: "high",
    priorityLabel: "높음",
    status: "progress",
    statusName: "진행 중",
    statusColor: "#2563EB",
    assignees: [{ initial: "상", tone: "blue" }],
    time: "09:00 - 10:30",
    done: false,
  },
  {
    id: 2,
    title: "블록 드래그 기능",
    priority: "medium",
    priorityLabel: "중간",
    status: "todo",
    statusName: "해야 할 일",
    statusColor: "#64748B",
    assignees: [{ initial: "민", tone: "blue" }],
    time: "11:00 - 12:30",
    done: false,
  },
  {
    id: 3,
    title: "Sprint UI 디자인",
    priority: "medium",
    priorityLabel: "중간",
    status: "progress",
    statusName: "진행 중",
    statusColor: "#2563EB",
    assignees: [{ initial: "서", tone: "blue" }],
    time: "14:00 - 16:00",
    done: false,
  },
  {
    id: 4,
    title: "파일 업로드 테스트",
    priority: "low",
    priorityLabel: "낮음",
    status: "todo",
    statusName: "해야 할 일",
    statusColor: "#64748B",
    assignees: [
      { initial: "상", tone: "blue" },
      { initial: "민", tone: "green" },
    ],
    time: "16:00 - 17:00",
    done: false,
  },
  {
    id: 5,
    title: "API 명세서 작성",
    priority: "low",
    priorityLabel: "낮음",
    status: "todo",
    statusName: "해야 할 일",
    statusColor: "#64748B",
    assignees: [
      { initial: "상", tone: "blue" },
      { initial: "민", tone: "green" },
    ],
    time: "17:30 - 18:30",
    done: false,
  },
  {
    id: 6,
    title: "회의 자료 정리",
    priority: "done",
    priorityLabel: "완료",
    status: "done",
    statusName: "완료",
    statusColor: "#16A34A",
    assignees: [{ initial: "서", tone: "blue" }],
    time: "19:00 - 19:30",
    done: true,
  },
];

export const todaySchedule = [
  {
    time: "09:00",
    title: "팀 회의 (Daily Standup)",
    desc: "09:00 - 09:30 · 회의실 A",
    color: "purple",
  },
  {
    time: "11:00",
    title: "기획안 리뷰",
    desc: "11:00 - 12:00 · 온라인 미팅",
    color: "blue",
  },
  {
    time: "14:00",
    title: "Sprint UI 디자인 리뷰",
    desc: "14:00 - 15:00 · 회의실 B",
    color: "green",
  },
  {
    time: "16:00",
    title: "프로토타입 개발 미팅",
    desc: "16:00 - 17:00 · 온라인 미팅",
    color: "orange",
  },
];

export const activities = [
  {
    id: 1,
    initial: "상",
    color: "blue",
    text: "상욱님이 JWT 문서를 수정했습니다.",
    time: "5분 전",
  },
  {
    id: 2,
    initial: "민",
    color: "green",
    text: "민수님이 Sprint 2를 생성했습니다.",
    time: "28분 전",
  },
  {
    id: 3,
    initial: "서",
    color: "purple",
    text: "서연님이 댓글을 남겼습니다.",
    time: "1시간 전",
  },
  {
    id: 4,
    initial: "지",
    color: "gray",
    text: "지민님이 파일을 업로드했습니다.",
    time: "2시간 전",
  },
  {
    id: 5,
    initial: "상",
    color: "blue",
    text: "상욱님이 새로운 댓글을 남겼습니다.",
    time: "3시간 전",
  },
  {
    id: 6,
    initial: "민",
    color: "green",
    text: "민수님이 칸반 카드를 이동했습니다.",
    time: "4시간 전",
  },
  {
    id: 7,
    initial: "서",
    color: "purple",
    text: "서연님이 회고를 작성했습니다.",
    time: "5시간 전",
  },
];
