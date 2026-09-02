const authMock = {
  login: {
    email: "",
    password: "",
    rememberMe: false,
  },

  showcase: [
    {
      id: 1,
      title: "함께 일하는 공간",
      description:
        "칸반 · 스프린트 · 캘린더를 하나의 워크스페이스에서 관리하세요.",
      image: "/images/auth/dashboard.png",
    },
    {
      id: 2,
      title: "Sprint Dashboard",
      description: "진행률과 팀 목표를 한눈에 확인하세요.",
      image: "/images/auth/sprint.png",
    },
    {
      id: 3,
      title: "Team Calendar",
      description: "회의와 마감 일정을 팀원들과 공유하세요.",
      image: "/images/auth/calendar.png",
    },
    {
      id: 4,
      title: "Pages & Documents",
      description: "회의록, API 명세, 프로젝트 문서를 기록하고 공유하세요.",
      image: "/images/auth/documents.png",
    },
  ],
};

export default authMock;
