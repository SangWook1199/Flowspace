// Notion 스타일 "페이지" 기능 목데이터.
// 실제로는 pages 테이블(page_id/workspace_id/parent_page_id/title/icon/
// cover_file_id) + blocks 테이블(page_id/type/position/content JSON)로
// 저장돼요. type은 blocks.type ENUM(TEXT/H1/H2/TODO/BULLET/NUMBERED/
// QUOTE/TASK/EVENT/DATABASE/IMAGE/DIVIDER/CODE) 그대로이고, 새 타입을
// 추가하지 않았어요. 하위 페이지를 문서 흐름 속 블록으로 두기 위해
// pageId를 쓰지만, 저장되는 type은 여전히 'TEXT'예요(content가 비어있고
// pageId만 채워진 TEXT 블록 — 실제 DB라면 이 pageId도 새 컬럼 없이
// content JSON에 {"pageId": 4}로 넣으면 됩니다).
//
// DATABASE 블록은 block_databases(title, view_type) +
// block_database_columns(name, type, position) +
// block_database_rows(position) + block_database_cells(row_id, column_id,
// value) 구조를 그대로 반영해서, 컬럼마다 값이 하나씩 있는 진짜 표(스프레드시트)
// 형태예요. 회고의 Keep/Problem/Try 표(컬럼마다 독립적인 글머리 목록)와는
// 다른, 노션 데이터베이스 "테이블 보기"에 가까운 일반적인 형태입니다.
//
// database.kind로 "표"(TABLE, SimpleTableBlock — 속성 타입 없는 단순 그리드)와
// "데이터베이스"(DATABASE, DatabaseBlock — 타입이 있는 속성 + 행=페이지)를
// 구분해요. kind가 DATABASE인 경우:
//   - columns[0]은 항상 type:"TITLE"이고, 그 열이 곧 "제목 = 페이지"예요.
//     노션처럼 행을 만드는 순간 그 행은 이미 페이지고(row.pageId), 따로
//     "페이지 만들기" 버튼을 누르는 단계가 없어요. TITLE 열의 텍스트는
//     row.pageId가 가리키는 페이지의 title과 항상 같아요(별도 셀 값으로
//     안 두고, 페이지 title을 그대로 보여주고 편집해요).
//   - TITLE 열은 삭제·타입 변경이 안 돼요(노션의 제목 열과 동일).
//   - 속성(컬럼) 타입은 TEXT/NUMBER/DATE/CHECKBOX/SELECT/TITLE에 더해
//     MULTI_SELECT(다중 선택)/STATUS(할 일·진행 중·완료 3그룹)/
//     PERSON(members에서 담당자 고르기)/URL/EMAIL/PHONE(각각 클릭해서
//     바로 열 수 있는 링크 아이콘 포함)/CREATED_TIME(행=페이지의
//     createdAt을 읽기 전용으로 보여줌)을 지원해요 — 노션 데이터베이스
//     속성 22종 중 이 목데이터만으로 바로 동작하는 7종을 추가한 거예요.
// kind가 TABLE인 경우 title/TITLE 열 개념 자체가 없어요 — 그냥 칸마다
// 자유 텍스트인 표예요.

export const pages = [
  {
    id: 1,
    workspaceId: 1,
    parentPageId: null,
    title: "API 명세",
    icon: "📘",
    cover: null,
    createdBy: "상욱",
    createdAt: "2026-09-01T09:12:00",

    blocks: [
      { id: 1, type: "H1", content: "API 명세" },
      {
        id: 2,
        type: "TEXT",
        content:
          "FlowSpace 백엔드 REST API 명세 문서입니다. 인증부터 태스크/캘린더 API까지 여기에 정리해요.",
      },
      { id: 3, type: "H2", content: "인증 API" },
      {
        // 인증 엔드포인트 목록은 속성 타입(SELECT 등)이나 행=페이지가 필요한
        // 데이터가 아니라 그냥 참고용 텍스트 표라서, "데이터베이스"가 아니라
        // 훨씬 단조로운 "표"(SimpleTableBlock)로 둬요.
        id: 4,
        type: "DATABASE",
        database: {
          id: 1,
          kind: "TABLE",
          columns: [
            { id: 1, name: "Method" },
            { id: 2, name: "Endpoint" },
            { id: 3, name: "설명" },
          ],
          rows: [{ id: 1 }, { id: 2 }, { id: 3 }],
          cells: [
            { rowId: 1, columnId: 1, value: "POST" },
            { rowId: 1, columnId: 2, value: "/api/auth/login" },
            { rowId: 1, columnId: 3, value: "이메일/비밀번호 로그인" },
            { rowId: 2, columnId: 1, value: "POST" },
            { rowId: 2, columnId: 2, value: "/api/auth/refresh" },
            { rowId: 2, columnId: 3, value: "Access Token 재발급" },
            { rowId: 3, columnId: 1, value: "POST" },
            { rowId: 3, columnId: 2, value: "/api/auth/oauth/callback" },
            { rowId: 3, columnId: 3, value: "OAuth 콜백 처리" },
          ],
        },
      },
      { id: 5, type: "DIVIDER" },
      { id: 6, type: "H2", content: "관련 태스크" },
      {
        id: 7,
        type: "TASK",
        // 예전엔 여기에 title/assignee 같은 필드를 통째로 복사해서
        // 넣어뒀는데(스냅샷), 그러면 스프린트 화면에서 이 태스크를
        // 고쳐도 여기는 그대로였어요. 이제는 sprintTaskRows의 id만
        // 참조로 갖고 있고, 실제 내용은 BlockEditor가 매번 새로
        // 찾아서 보여줘요(그래서 서브태스크 체크도 여기서 바로 할 수
        // 있어요) — sprintTaskRows의 "SP1-8"(제목/담당자/우선순위 모두
        // 같음)로 그대로 연결돼요.
        taskId: "SP1-8",
      },
      { id: 8, type: "DIVIDER" },
      { id: 9, type: "H2", content: "하위 페이지" },
      { id: 10, type: "TEXT", content: "", pageId: 4 },
    ],
  },

  {
    id: 2,
    workspaceId: 1,
    parentPageId: null,
    title: "디자인 시스템",
    icon: "🎨",
    cover: null,
    createdBy: "지민",
    createdAt: "2026-09-02T14:30:00",

    blocks: [
      { id: 1, type: "H1", content: "디자인 시스템" },
      {
        id: 2,
        type: "TEXT",
        content: "FlowSpace 전반에서 쓰는 컬러·타이포그래피 가이드예요.",
      },
      { id: 3, type: "H2", content: "컬러 팔레트" },
      {
        id: 4,
        type: "DATABASE",
        database: {
          id: 2,
          kind: "DATABASE",
          title: "컬러 팔레트",
          columns: [
            { id: 1, name: "이름", type: "TITLE" },
            { id: 2, name: "HEX", type: "TEXT" },
            { id: 3, name: "용도", type: "TEXT" },
          ],
          // 행 = 페이지라서 각 행이 실제 pages 항목(6~8번)을 가리켜요.
          rows: [{ id: 1, pageId: 6 }, { id: 2, pageId: 7 }, { id: 3, pageId: 8 }],
          cells: [
            { rowId: 1, columnId: 1, value: "Primary" },
            { rowId: 1, columnId: 2, value: "#4F46E5" },
            { rowId: 1, columnId: 3, value: "강조 버튼 · 링크" },
            { rowId: 2, columnId: 1, value: "Success" },
            { rowId: 2, columnId: 2, value: "#16A34A" },
            { rowId: 2, columnId: 3, value: "완료 상태" },
            { rowId: 3, columnId: 1, value: "Danger" },
            { rowId: 3, columnId: 2, value: "#DC2626" },
            { rowId: 3, columnId: 3, value: "오류 · 삭제" },
          ],
        },
      },
      { id: 5, type: "DIVIDER" },
      { id: 6, type: "H2", content: "타이포그래피" },
      { id: 7, type: "BULLET", content: "제목 1 — 23px / 700" },
      { id: 8, type: "BULLET", content: "제목 2 — 18px / 600" },
      { id: 9, type: "BULLET", content: "본문 — 14px / 400" },
      { id: 10, type: "DIVIDER" },
      { id: 11, type: "H2", content: "관련 이벤트" },
      {
        id: 12,
        type: "EVENT",
        // event_id 104(calendarEvents의 "UI/UX 리뷰")를 참조만 해요 —
        // 위 TASK 블록과 같은 이유로 스냅샷 대신 id 참조로 바꿨어요.
        eventId: 104,
      },
      { id: 13, type: "DIVIDER" },
      { id: 14, type: "H2", content: "하위 페이지" },
      { id: 15, type: "TEXT", content: "", pageId: 5 },
    ],
  },

  {
    id: 3,
    workspaceId: 1,
    parentPageId: null,
    title: "QA 체크리스트",
    icon: "✅",
    cover: null,
    createdBy: "서연",
    createdAt: "2026-09-03T10:05:00",

    blocks: [
      { id: 1, type: "H1", content: "QA 체크리스트" },
      {
        id: 2,
        type: "TEXT",
        content: "배포 전에 확인하는 항목들이에요. 스프린트마다 갱신합니다.",
      },
      { id: 3, type: "H2", content: "배포 전 확인" },
      { id: 4, type: "TODO", content: "로그인 · 회원가입 플로우 확인", checked: true },
      { id: 5, type: "TODO", content: "API 에러 응답 형식 확인", checked: true },
      { id: 6, type: "TODO", content: "반응형 레이아웃 확인", checked: false },
      { id: 7, type: "TODO", content: "콘솔 에러 없는지 확인", checked: false },
      { id: 8, type: "DIVIDER" },
      { id: 9, type: "H2", content: "회귀 테스트 범위" },
      {
        id: 10,
        type: "DATABASE",
        database: {
          id: 3,
          kind: "DATABASE",
          title: "회귀 테스트 범위",
          columns: [
            { id: 1, name: "기능", type: "TITLE" },
            {
              id: 2,
              name: "우선순위",
              type: "SELECT",
              options: [
                { id: 1, value: "높음", color: "red" },
                { id: 2, value: "보통", color: "orange" },
                { id: 3, value: "낮음", color: "green" },
              ],
            },
            // 노션 속성 확장 적용 예시 — 담당자를 자유 텍스트가 아니라
            // members 목록에서 고르는 PERSON 타입으로 바꿨어요(값은 배열).
            { id: 3, name: "담당자", type: "PERSON" },
            // CREATED_TIME은 셀 값을 따로 안 두고 행에 연결된 페이지의
            // createdAt을 그대로 읽기만 해서, cells에 값을 안 넣어도 돼요.
            { id: 4, name: "등록일", type: "CREATED_TIME" },
          ],
          // 행 = 페이지라서 각 행이 실제 pages 항목(9~11번)을 가리켜요.
          rows: [{ id: 1, pageId: 9 }, { id: 2, pageId: 10 }, { id: 3, pageId: 11 }],
          cells: [
            { rowId: 1, columnId: 1, value: "로그인" },
            { rowId: 1, columnId: 2, value: "높음" },
            { rowId: 1, columnId: 3, value: ["상욱"] },
            { rowId: 2, columnId: 1, value: "캘린더" },
            { rowId: 2, columnId: 2, value: "보통" },
            { rowId: 2, columnId: 3, value: ["서연"] },
            { rowId: 3, columnId: 1, value: "회고" },
            { rowId: 3, columnId: 2, value: "낮음" },
            { rowId: 3, columnId: 3, value: ["민수"] },
          ],
        },
      },
      { id: 11, type: "DIVIDER" },
      { id: 12, type: "H2", content: "관련 태스크" },
      {
        id: 13,
        type: "TASK",
        // sprintTaskRows의 "SP1-5"(파일 업로드 테스트)를 참조해요.
        taskId: "SP1-5",
      },
    ],
  },

  // 하위 페이지 예시 (parent_page_id 사용)
  {
    id: 4,
    workspaceId: 1,
    parentPageId: 1,
    title: "인증 API 상세",
    icon: "🔐",
    cover: null,
    createdBy: "상욱",
    createdAt: "2026-09-04T11:20:00",

    blocks: [
      { id: 1, type: "H1", content: "인증 API 상세" },
      {
        id: 2,
        type: "TEXT",
        content: "토큰 만료 시간, 리프레시 정책 등 세부 스펙을 여기에 정리해요.",
      },
    ],
  },

  {
    id: 5,
    workspaceId: 1,
    parentPageId: 2,
    title: "컴포넌트 가이드",
    icon: "🧩",
    cover: null,
    createdBy: "지민",
    createdAt: "2026-09-05T16:45:00",

    blocks: [
      { id: 1, type: "H1", content: "컴포넌트 가이드" },
      { id: 2, type: "TEXT", content: "버튼, 카드, 입력 필드 등 공통 컴포넌트 사용법을 정리하는 곳이에요." },
    ],
  },

  // "컬러 팔레트" 데이터베이스의 행 = 페이지 (id 6~8). 노션처럼 행을 만드는
  // 순간 이미 페이지라서, 이 페이지들도 그 데이터베이스 블록(페이지 2의
  // block id 4) rows에서 pageId로 바로 연결돼 있어요.
  {
    id: 6,
    workspaceId: 1,
    parentPageId: 2,
    title: "Primary",
    icon: "🟣",
    cover: null,
    createdBy: "지민",
    createdAt: "2026-09-02T14:32:00",
    blocks: [
      { id: 1, type: "H1", content: "Primary" },
      { id: 2, type: "TEXT", content: "강조 버튼 · 링크에 쓰는 메인 컬러예요. HEX #4F46E5." },
    ],
  },
  {
    id: 7,
    workspaceId: 1,
    parentPageId: 2,
    title: "Success",
    icon: "🟢",
    cover: null,
    createdBy: "지민",
    createdAt: "2026-09-02T14:33:00",
    blocks: [
      { id: 1, type: "H1", content: "Success" },
      { id: 2, type: "TEXT", content: "완료 상태를 나타낼 때 쓰는 컬러예요. HEX #16A34A." },
    ],
  },
  {
    id: 8,
    workspaceId: 1,
    parentPageId: 2,
    title: "Danger",
    icon: "🔴",
    cover: null,
    createdBy: "지민",
    createdAt: "2026-09-02T14:34:00",
    blocks: [
      { id: 1, type: "H1", content: "Danger" },
      { id: 2, type: "TEXT", content: "오류 · 삭제처럼 위험한 동작에 쓰는 컬러예요. HEX #DC2626." },
    ],
  },

  // "회귀 테스트 범위" 데이터베이스의 행 = 페이지 (id 9~11), 페이지 3의
  // block id 10에서 pageId로 연결돼요.
  {
    id: 9,
    workspaceId: 1,
    parentPageId: 3,
    title: "로그인",
    icon: "🔐",
    cover: null,
    createdBy: "상욱",
    createdAt: "2026-09-03T10:10:00",
    blocks: [
      { id: 1, type: "H1", content: "로그인" },
      { id: 2, type: "TEXT", content: "로그인 · 회원가입 플로우 회귀 테스트 범위예요." },
    ],
  },
  {
    id: 10,
    workspaceId: 1,
    parentPageId: 3,
    title: "캘린더",
    icon: "📅",
    cover: null,
    createdBy: "서연",
    createdAt: "2026-09-03T10:12:00",
    blocks: [
      { id: 1, type: "H1", content: "캘린더" },
      { id: 2, type: "TEXT", content: "캘린더 화면(월/주 보기, 이벤트 생성) 회귀 테스트 범위예요." },
    ],
  },
  {
    id: 11,
    workspaceId: 1,
    parentPageId: 3,
    title: "회고",
    icon: "🔁",
    cover: null,
    createdBy: "민수",
    createdAt: "2026-09-03T10:14:00",
    blocks: [
      { id: 1, type: "H1", content: "회고" },
      { id: 2, type: "TEXT", content: "회고 보드(Keep/Problem/Try) 회귀 테스트 범위예요." },
    ],
  },
];
