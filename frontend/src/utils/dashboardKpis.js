// 대시보드 KPI 카드는 모양(아이콘/색/이름)만 여기 두고, 숫자와 문구는 utils/dashboardMetrics.js의 buildKpis가
// 스프린트/작업/일정/팀원 데이터로 계산해서 채워요(값을 박아두면 데이터가 바뀌어도 그대로 남아서 모순이 생겨요).
export const KPI_CARDS = [
  { key: "completion", label: "완료율", icon: "CheckCircle2", color: "blue" },
  { key: "todayTasks", label: "오늘 할 일", icon: "ClipboardCheck", color: "blue" },
  { key: "todaySchedule", label: "오늘 일정", icon: "CalendarDays", color: "purple" },
  { key: "online", label: "온라인 팀원", icon: "Users", color: "green" },
];
