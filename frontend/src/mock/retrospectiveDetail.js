const retrospectiveDetail = {
  sprintId: 1,
  sprintName: "Sprint 1",

  startDate: "2026.08.18",
  endDate: "2026.08.31",

  participants: [
    { id: 1, name: "상욱", initial: "상", tone: "blue" },
    { id: 2, name: "서연", initial: "서", tone: "purple" },
    { id: 3, name: "민수", initial: "민", tone: "green" },
    { id: 4, name: "지연", initial: "지", tone: "orange" },
  ],

  summary: {
    completionRate: 82,
    completed: 18,
    total: 22,
    incomplete: 4,
  },

  kanban: {
    todo: [
      {
        id: 101,
        title: "API 예외 처리 문서 작성",
        assignee: "상욱",
        priority: "MEDIUM",
        color: "purple",
      },
    ],

    doing: [
      {
        id: 201,
        title: "JWT API 구현",
        assignee: "상욱",
        priority: "HIGH",
        color: "blue",
      },
      {
        id: 202,
        title: "테스트 자동화 구축",
        assignee: "민수",
        priority: "HIGH",
        color: "green",
      },
      {
        id: 203,
        title: "CI/CD 파이프라인",
        assignee: "지연",
        priority: "MEDIUM",
        color: "orange",
      },
    ],

    done: [
      {
        id: 301,
        title: "로그인 기능",
        assignee: "상욱",
        priority: "HIGH",
        color: "blue",
      },
      {
        id: 302,
        title: "회원가입 기능",
        assignee: "민수",
        priority: "MEDIUM",
        color: "green",
      },
      {
        id: 303,
        title: "대시보드 UI",
        assignee: "지연",
        priority: "LOW",
        color: "orange",
      },
      {
        id: 304,
        title: "프로젝트 초기 세팅",
        assignee: "서연",
        priority: "LOW",
        color: "purple",
      },
    ],
  },

  review: {
    keep: [
      { id: 1, content: "JWT 인증 구조가 안정적으로 마무리되었다." },
      { id: 2, content: "칸반을 활용해 진행 상황 공유가 쉬웠다." },
    ],

    problem: [
      { id: 1, content: "OAuth 연동 일정이 2일 지연되었다." },
      { id: 2, content: "테스트 코드 작성 비율이 낮았다." },
    ],

    try: [
      { id: 1, content: "다음 스프린트부터 PR 템플릿을 도입한다." },
      { id: 2, content: "테스트 자동화 범위를 확대한다." },
    ],
  },
  blocks: [
    {
      id: 1,
      type: "text",
      label: "텍스트",
      title: "회고 메모",
      content:
        "JWT 인증 구조가 안정화되면서 백엔드 개발 속도가 향상되었다. OAuth 일정은 다음 스프린트에서 우선 개선하기로 결정했다.",
    },
    {
      id: 2,
      type: "image",
      label: "이미지",
      title: "ERD 변경 사항",
      fileName: "ERD_v2.png",
      fileSize: "245KB",
    },
    {
      id: 3,
      type: "checklist",
      label: "체크리스트",
      title: "다음 스프린트 액션",
      items: [
        { id: 1, text: "PR 템플릿 도입", checked: false },
        { id: 2, text: "테스트 자동화 확대", checked: false },
        { id: 3, text: "코드 리뷰 체크리스트", checked: true },
      ],
    },
  ],
};

export default retrospectiveDetail;
