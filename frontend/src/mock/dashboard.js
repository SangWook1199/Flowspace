export const navigation = [
  ["홈", "House"],
  ["스프린트", "Zap"],
  ["칸반", "PanelsTopLeft"],
  ["캘린더", "CalendarDays"],
  ["회의록", "Video"],
  ["팀 위키", "BookOpen"],
];

export const pages = ["API 명세", "디자인 시스템", "QA 체크리스트"];

export const kpis = [
  {
    label: "완료율",
    value: "68%",
    note: "24 / 35 작업",
    change: "↑ 12%",
    icon: "CircleCheck",
    tone: "blue",
  },
  {
    label: "오늘 할 일",
    value: "8",
    note: "전체 12개 중",
    change: "↑ 2%",
    icon: "CheckSquare",
    tone: "blue",
  },
  {
    label: "오늘 일정",
    value: "3",
    note: "회의 2건 · 발표 1건",
    change: "↑ 1%",
    icon: "CalendarDays",
    tone: "purple",
  },
  {
    label: "온라인 팀원",
    value: "2 / 4",
    note: "90분째 집중 중",
    change: "→ 0%",
    icon: "UsersRound",
    tone: "green",
  },
];

export const todayTasks = [
  {
    title: "JWT 로그인 API 구현",
    category: "백엔드",
    time: "09:00",
    tone: "red",
  },
  {
    title: "블록 드래그 기능",
    category: "프론트",
    time: "11:00",
    tone: "orange",
  },
  {
    title: "Sprint UI 디자인",
    category: "디자인",
    time: "14:00",
    tone: "orange",
  },
  { title: "파일 업로드 테스트", category: "QA", time: "16:00", tone: "green" },
  { title: "API 명세서 작성", category: "문서", time: "17:30", tone: "gray" },
  { title: "회의 자료 정리", category: "회의록", time: "19:00", tone: "gray" },
];

export const activities = [
  ["상", "상욱님이 JWT 문서를 수정했습니다.", "5분 전", "blue"],
  ["민", "민수님이 Sprint 2를 생성했습니다.", "28분 전", "mint"],
  ["박", "박서연님이 작업을 완료했습니다.", "1시간 전", "purple"],
  ["상", "상욱님이 새로운 댓글을 남겼습니다.", "2시간 전", "blue"],
  ["민", "민수님이 파일을 업로드했습니다.", "3시간 전", "gray"],
];

export const members = [
  { initial: "상", name: "상욱", online: true, tone: "blue" },
  { initial: "민", name: "민수", online: true, tone: "mint" },
  { initial: "서", name: "서연", online: false, tone: "gray" },
  { initial: "지", name: "지민", online: false, tone: "gray" },
];

export const calendar = [
  ["10:00", "팀 회의 (Daily Standup)", "blue"],
  ["14:00", "Sprint UI 디자인 리뷰", "purple"],
  ["16:00", "프론트엔드 개발 미팅", "green"],
];
