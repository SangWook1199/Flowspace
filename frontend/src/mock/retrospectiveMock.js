import { MessageSquare, CheckCircle2, ListTodo, Users } from "lucide-react";

// 요약 카드는 모양(제목/단위/색/아이콘/보조 문구)만 여기 두고, 숫자는 목록 페이지가 retrospectiveList에서 계산해요.
// (값을 직접 적어두면 회고가 추가/삭제돼도 "전체 회고 3개"가 그대로 남아서 목록과 어긋나요.)
export const retrospectiveSummary = [
  { key: "count", title: "전체 회고", unit: "개", color: "blue", icon: MessageSquare },
  { key: "avgCompletion", title: "평균 완료율", unit: "%", color: "green", icon: CheckCircle2, descTemplate: "지난 {count}개 Sprint 기준" },
  { key: "actionItems", title: "Action Item", unit: "개", color: "orange", icon: ListTodo, desc: "다음 Sprint로 이관 전" },
  { key: "participants", title: "참여자", unit: "명", color: "sky", icon: Users, desc: "활동 참여 인원" },
];

// sprintId는 mock/sprints.js의 스프린트 id와 같아요(상세 화면 주소 /retrospectives/:sprintId에 쓰여요).
// id는 회고 자체의 PK고, 기간은 mock/sprints.js의 스프린트 기간과 같은 값이에요.
export const retrospectiveList = [
  {
    id: 3,
    sprintId: 3,
    sprint: "Sprint 3",
    status: "latest", // latest | done | progress | planned

    start: "2026.05.01",
    end: "2026.05.14",

    members: 4,

    completion: 91,
    completed: 20,
    incomplete: 2,
    actionItems: 7,

    description:
      "JWT 리팩토링과 테스트 자동화 도입으로 안정성과 개발 속도가 향상되었습니다.",

    tags: ["인증", "리팩토링", "자동화"],
  },

  {
    id: 2,
    sprintId: 2,
    sprint: "Sprint 2",
    status: "done",

    start: "2026.06.12",
    end: "2026.06.25",

    members: 4,

    completion: 82,
    completed: 18,
    incomplete: 4,
    actionItems: 3,

    description:
      "OAuth 일정 지연 이슈를 경험했지만 PR 템플릿 도입을 결정했습니다.",

    tags: ["일정", "PR 템플릿", "협업"],
  },

  {
    id: 1,
    sprintId: 1,
    sprint: "Sprint 1",
    status: "done",

    start: "2026.05.29",
    end: "2026.06.11",

    members: 4,

    completion: 78,
    completed: 14,
    incomplete: 4,
    actionItems: 2,

    description: "프로젝트 초기 셋업과 JWT 인증 구조를 완료했습니다.",

    tags: ["초기 셋업", "JWT", "인증"],
  },

  {
    id: 4,
    sprintId: 4,
    sprint: "Sprint 4",
    status: "planned",

    start: "2026.06.26",
    end: "2026.07.09",

    members: 4,

    completion: null,
    completed: null,
    incomplete: null,
    actionItems: null,

    description: "스프린트 완료 시 자동으로 회고가 생성됩니다.",

    tags: [],
  },
];
