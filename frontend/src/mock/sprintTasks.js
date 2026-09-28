// 이 배열이 이제 스프린트 태스크의 "유일한" 소스예요. 예전엔 여기
// (스프린트 작업 목록/페이지 TASK 블록용)와 mock/kanban.js의
// kanbanTasks(칸반 보드용)가 완전히 따로 노는 두 벌의 목데이터였어요 —
// 심지어 같은 코드("SP1-2" 등)가 화면마다 다른 작업을 가리켰어요. 이제는
// 칸반 보드(Kanban.jsx)·스프린트 작업 목록(SprintTasks.jsx)·페이지 TASK
// 블록(BlockEditor.jsx의 TaskEmbed)이 전부 이 배열 하나(정확히는
// MainLayout이 이 배열로 초기화해서 세션 동안 들고 있는 state)를 읽고
// 써요. 그래서 어디서 체크박스를 누르든, 어디서 담당자를 바꾸든 나머지
// 화면에도 그대로 보여요.
//
// 필드는 칸반 쪽 요구사항(상태 컬럼, 여러 담당자, 영문 우선순위 enum)에
// 맞춰 통일했어요 — 실제 DB라면 priority가 enum(HIGH/MEDIUM/LOW)이고
// 한글 라벨은 화면에서만 번역해서 보여주는 게 자연스러워서예요.
// assignees도 배열이라 담당자를 여러 명 지정할 수 있어요(스프린트 작업
// 목록 화면은 아직 첫 번째 담당자만 보여주고 고치는데, 그건
// SprintTasks.jsx가 이 배열과 그 화면의 "담당자 1명" UI 사이를
// 이어주는 자리에서 처리해요 — TaskTable/TaskRow/TaskDetailPanel
// 컴포넌트 자체는 안 건드렸어요).
export const taskMembers = ["상욱", "민수", "서연", "지민"];

// 담당자 이름 → {id, name, initial}. 칸반 카드 아바타가 원래
// 이 id/initial 조합을 썼어서(예: 상욱 → id 1, "상"), 그대로 이어받았어요.
const MEMBER_IDS = { 상욱: 1, 민수: 2, 서연: 3, 지민: 4 };

export function toAssignee(name) {
  return { id: MEMBER_IDS[name] ?? 0, name, initial: name?.[0] ?? "" };
}

// 영문 enum(canonical) ↔ 한글 라벨. 칸반 카드는 이미 영문 enum을 쓰고
// 있었고(TaskCard.jsx의 priorityLabel), 스프린트 작업 목록/페이지 TASK
// 블록은 한글 문자열을 썼었어요 — 어느 한쪽에 맞추기보다 "저장은 영문
// enum, 화면 표시는 한글"로 정리했어요.
export const PRIORITY_LABEL = { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" };
export const PRIORITY_KO_TO_EN = { 높음: "HIGH", 보통: "MEDIUM", 낮음: "LOW" };

export const sprintTaskRows = [
  {
    id: "SP1-1",
    title: "JWT 로그인 API 구현",
    statusId: 2,
    assignees: [toAssignee("상욱")],
    priority: "HIGH",
    startDate: "2025-05-28",
    dueDate: "2025-05-31",
    subtasks: [
      { id: 1, text: "JWT 토큰 발급", checked: true },
      { id: 2, text: "Refresh Token 발급", checked: true },
      { id: 3, text: "로그인 API 개발", checked: true },
      { id: 4, text: "토큰 재발급 API 개발", checked: false },
      { id: 5, text: "예외 처리 및 테스트", checked: false },
    ],
    description:
      "JWT 기반 로그인 API를 구현합니다.\n• 로그인 요청 및 인증 처리\n• Access Token 발급\n• Refresh Token 발급\n• 로그인 관련 예외 처리",
  },
  {
    id: "SP1-2",
    title: "유저 알림 시스템",
    statusId: 1,
    assignees: [toAssignee("민수")],
    priority: "MEDIUM",
    startDate: "2025-05-30",
    dueDate: "2025-06-03",
    subtasks: [
      { id: 1, text: "알림 모델 작성", checked: true },
      { id: 2, text: "알림 API 구현", checked: false },
      { id: 3, text: "화면 연결", checked: false },
      { id: 4, text: "테스트", checked: false },
    ],
    description: "사용자 알림 시스템을 구현합니다.",
  },
  {
    id: "SP1-3",
    title: "대시보드 퍼블리싱",
    statusId: 2,
    assignees: [toAssignee("서연")],
    priority: "MEDIUM",
    startDate: "2025-05-30",
    dueDate: "2025-06-04",
    subtasks: [
      { id: 1, text: "레이아웃 제작", checked: true },
      { id: 2, text: "반응형 처리", checked: false },
      { id: 3, text: "검수", checked: false },
    ],
    description: "대시보드 화면을 퍼블리싱합니다.",
  },
  {
    id: "SP1-4",
    title: "로그인 UI 디자인",
    statusId: 3,
    assignees: [toAssignee("지민")],
    priority: "LOW",
    startDate: "2025-05-27",
    dueDate: "2025-05-31",
    subtasks: [
      { id: 1, text: "화면 설계", checked: true },
      { id: 2, text: "디자인 시안", checked: true },
      { id: 3, text: "피드백 반영", checked: false },
    ],
    description: "로그인 화면 디자인을 완성합니다.",
  },
  {
    id: "SP1-5",
    title: "파일 업로드 테스트",
    statusId: 1,
    assignees: [toAssignee("민수")],
    priority: "LOW",
    startDate: "2025-05-28",
    dueDate: "2025-05-30",
    subtasks: [
      { id: 1, text: "파일 업로드", checked: false },
      { id: 2, text: "오류 확인", checked: false },
    ],
    description: "파일 업로드 기능을 점검합니다.",
  },
  {
    id: "SP1-6",
    title: "OAuth 연동",
    statusId: 3,
    assignees: [toAssignee("상욱")],
    priority: "HIGH",
    startDate: "2025-06-02",
    dueDate: "2025-06-06",
    subtasks: [
      { id: 1, text: "Google 연동", checked: true },
      { id: 2, text: "Kakao 연동", checked: true },
      { id: 3, text: "콜백 처리", checked: true },
      { id: 4, text: "테스트", checked: false },
    ],
    description: "소셜 로그인 OAuth 연동을 진행합니다.",
  },
  {
    id: "SP1-7",
    title: "에러 핸들링 정리",
    statusId: 1,
    assignees: [toAssignee("서연")],
    priority: "MEDIUM",
    startDate: "2025-06-03",
    dueDate: "2025-06-07",
    subtasks: [
      { id: 1, text: "오류 목록 정리", checked: false },
      { id: 2, text: "문서화", checked: false },
      { id: 3, text: "적용", checked: false },
    ],
    description: "공통 오류 처리를 정리합니다.",
  },
  {
    id: "SP1-8",
    title: "API 문서 작성",
    statusId: 2,
    assignees: [toAssignee("지민")],
    priority: "LOW",
    startDate: "2025-06-04",
    dueDate: "2025-06-06",
    subtasks: [
      { id: 1, text: "엔드포인트 작성", checked: true },
      { id: 2, text: "예시 추가", checked: false },
    ],
    description: "API 명세 문서를 정리합니다.",
  },
];
