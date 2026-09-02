import { MessageSquare, CheckCircle2, ListTodo, Users } from "lucide-react";

export const retrospectiveSummary = [
  {
    title: "전체 회고",
    value: 3,
    unit: "개",
    color: "blue",
    icon: MessageSquare,
  },
  {
    title: "평균 완료율",
    value: 84,
    unit: "%",
    color: "green",
    icon: CheckCircle2,
    desc: "지난 3개 Sprint 기준",
  },
  {
    title: "Action Item",
    value: 12,
    unit: "개",
    color: "orange",
    icon: ListTodo,
    desc: "다음 Sprint로 이관 전",
  },
  {
    title: "참여자",
    value: 4,
    unit: "명",
    color: "sky",
    icon: Users,
    desc: "활동 참여 인원",
  },
];

export const retrospectiveList = [
  {
    id: 3,
    sprint: "Sprint 3",
    status: "latest", // latest | done | progress | planned

    start: "2026.09.15",
    end: "2026.09.28",

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
    sprint: "Sprint 2",
    status: "done",

    start: "2026.09.01",
    end: "2026.09.14",

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
    sprint: "Sprint 1",
    status: "done",

    start: "2026.08.18",
    end: "2026.08.31",

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
    sprint: "Sprint 4",
    status: "planned",

    start: "2026.09.29",
    end: "2026.10.12",

    members: 4,

    completion: null,
    completed: null,
    incomplete: null,
    actionItems: null,

    description: "스프린트 완료 시 자동으로 회고가 생성됩니다.",

    tags: [],
  },
];
