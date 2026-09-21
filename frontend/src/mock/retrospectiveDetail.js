const retrospectiveDetail = {
  sprintId: 1,
  sprintName: "Sprint 1",

  startDate: "2026.08.18",
  endDate: "2026.08.31",

  // 아바타 색은 id를 utils/avatarColor.js의 getAvatarTone()에 넘겨서
  // 계산해요(더 이상 tone을 직접 넣지 않아요).
  participants: [
    { id: 1, name: "상욱", initial: "상" },
    { id: 2, name: "서연", initial: "서" },
    { id: 3, name: "민수", initial: "민" },
    { id: 4, name: "지연", initial: "지" },
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

  // Notion 스타일 페이지 블록. type은 백엔드 BlockType enum
  // (TEXT/H1/H2/TODO/BULLET/NUMBERED/QUOTE/DATABASE/DIVIDER/CODE/IMAGE)에 맞춤.
  //
  // 회고 노트 블록 에디터는 이제 페이지 상세(PageDetailPage)가 쓰는
  // BlockEditor 컴포넌트를 그대로 재사용해요(예전엔 회고 전용으로 따로
  // 만든 PageBlockSection을 썼는데, 같은 걸 두 번 만들어 유지하는 대신
  // 페이지 기능 쪽 컴포넌트를 우선으로 삼기로 했어요). 그래서 Keep/
  // Problem/Try 표도 BlockEditor가 아는 "표" 블록 형태(type: DATABASE,
  // database.kind: TABLE — SimpleTableBlock이 그리는 컬럼×행 그리드)로
  // 맞췄어요. 예전엔 컬럼마다 줄 수가 다를 수 있는 독립된 글머리
  // 목록이었지만, 그리드는 모든 컬럼이 같은 행 수를 공유해야 해서
  // Keep/Problem/Try 각 2개씩이던 내용을 행 2개짜리 표로 그대로 옮겼어요
  // (행 수가 서로 다른 컬럼이 생기면 모자란 칸은 빈 칸으로 두면 돼요).
  // 실제로는 스프린트 완료 시 백엔드가 자동 생성하는 DATABASE 블록 +
  // BlockDatabase(columns = block_database_columns, cells =
  // block_database_cells: rowId/columnId/value)로 매핑돼요.
  blocks: [
    { id: 1, type: "H1", content: "Sprint 1 회고 메모" },
    {
      id: 2,
      type: "DATABASE",
      pageId: null,
      database: {
        kind: "TABLE",
        columns: [
          { id: 1, name: "Keep" },
          { id: 2, name: "Problem" },
          { id: 3, name: "Try" },
        ],
        rows: [{ id: 1 }, { id: 2 }],
        cells: [
          { rowId: 1, columnId: 1, value: "JWT 인증 구조가 안정적으로 마무리되었다." },
          { rowId: 2, columnId: 1, value: "칸반을 활용해 진행 상황 공유가 쉬웠다." },
          { rowId: 1, columnId: 2, value: "OAuth 연동 일정이 2일 지연되었다." },
          { rowId: 2, columnId: 2, value: "테스트 코드 작성 비율이 낮았다." },
          { rowId: 1, columnId: 3, value: "다음 스프린트부터 PR 템플릿을 도입한다." },
          { rowId: 2, columnId: 3, value: "테스트 자동화 범위를 확대한다." },
        ],
      },
    },
    {
      id: 3,
      type: "TEXT",
      content:
        "JWT 인증 구조가 안정화되면서 백엔드 개발 속도가 향상되었다. OAuth 일정은 다음 스프린트에서 우선 개선하기로 결정했다.",
    },
    { id: 4, type: "H2", content: "다음 스프린트 액션" },
    { id: 5, type: "TODO", content: "PR 템플릿 도입", checked: false },
    { id: 6, type: "TODO", content: "테스트 자동화 확대", checked: false },
    { id: 7, type: "TODO", content: "코드 리뷰 체크리스트", checked: true },
    { id: 8, type: "DIVIDER" },
    { id: 9, type: "H2", content: "ERD 변경 사항" },
    {
      id: 10,
      type: "IMAGE",
      image: { fileName: "ERD_v2.png", fileSize: "245KB", url: null },
    },
  ],
};

export default retrospectiveDetail;
