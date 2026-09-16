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

export const kanbanTasks = [
  {
    id: 101,
    code: "SP1-1",
    title: "JWT 로그인 API 구현",
    statusId: 1,
    priority: "HIGH",
    start: "2026.08.28",
    end: "2026.08.30",
    complete: 3,
    total: 5,

    assignees: [
      { id: 1, name: "상욱", initial: "상" },
      { id: 2, name: "민수", initial: "민" },
    ],

    subtasks: [
      { id: 1, title: "JWT 발급", done: true },
      { id: 2, title: "Refresh Token 구현", done: true },
      { id: 3, title: "Access Token 검증", done: false },
      { id: 4, title: "예외 처리", done: false },
      { id: 5, title: "테스트 코드 작성", done: true },
    ],
  },

  {
    id: 102,
    code: "SP1-2",
    title: "블록 드래그 기능",
    statusId: 1,
    priority: "MEDIUM",
    start: "2026.08.29",
    end: "2026.09.01",
    complete: 1,
    total: 2,

    assignees: [{ id: 2, name: "민수", initial: "민" }],

    subtasks: [
      { id: 6, title: "Drag 이벤트 구현", done: true },
      { id: 7, title: "Drop 위치 계산", done: false },
    ],
  },

  {
    id: 103,
    code: "SP1-3",
    title: "Sprint UI 디자인",
    statusId: 2,
    priority: "MEDIUM",
    start: "2026.08.30",
    end: "2026.09.02",
    complete: 2,
    total: 3,

    assignees: [{ id: 3, name: "서연", initial: "서" }],

    subtasks: [
      { id: 8, title: "Hero 디자인", done: true },
      { id: 9, title: "KPI 카드", done: true },
      { id: 10, title: "반응형 수정", done: false },
    ],
  },

  {
    id: 104,
    code: "SP1-4",
    title: "OAuth 연동",
    statusId: 3,
    priority: "HIGH",
    start: "2026.08.31",
    end: "2026.09.03",
    complete: 1,
    total: 2,

    assignees: [
      { id: 1, name: "상욱", initial: "상" },
      { id: 4, name: "지민", initial: "지" },
    ],

    subtasks: [
      { id: 11, title: "Google OAuth", done: true },
      { id: 12, title: "카카오 OAuth", done: false },
    ],
  },

  {
    id: 105,
    code: "SP1-5",
    title: "파일 업로드",
    statusId: 4,
    priority: "LOW",
    start: "2026.08.26",
    end: "2026.08.28",
    complete: 3,
    total: 3,

    assignees: [{ id: 1, name: "상욱", initial: "상" }],

    subtasks: [
      { id: 13, title: "S3 연결", done: true },
      { id: 14, title: "Multipart 업로드", done: true },
      { id: 15, title: "다운로드 API", done: true },
    ],
  },
];
