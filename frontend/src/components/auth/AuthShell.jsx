import { useState } from "react";

import FlowSpaceLogo from "../common/FlowSpaceLogo";
import PreviewCarousel from "./PreviewCarousel";
import "../../styles/auth.css";

import dashboard from "../../assets/login/dashboard-summary.png";
import calendar from "../../assets/login/calendar-summary.png";
import kanban from "../../assets/login/kanban-summary.png";
import document from "../../assets/login/document-summary.png";

const PREVIEWS = [
  { image: dashboard, title: "함께 일하는 공간", description: "스프린트 진행률과 오늘의 작업을 한눈에 관리하세요." },
  { image: kanban, title: "칸반으로 업무 관리", description: "진행 중 · 검토 · 완료 상태를 직관적으로 확인하세요." },
  { image: calendar, title: "일정을 놓치지 마세요", description: "팀 일정과 마감일을 월간 캘린더로 관리하세요." },
  {
    image: document,
    title: "문서를 함께 작성하세요",
    description: "기획서, 회의록 등의 문서를 작성하고 하나의 워크스페이스에서 관리하세요.",
  },
];

// 로그인 화면과 같은 모양(왼쪽 카드 + 오른쪽 소개)에 내용만 갈아 끼우는 틀이에요. 비밀번호 찾기·재설정 화면이 써요.
export default function AuthShell({ children }) {
  const [current, setCurrent] = useState(0);

  return (
    <main className="login-page">
      <div className="login-container">
        <section className="login-card">
          <FlowSpaceLogo />
          {children}
        </section>

        <section className="preview-card">
          <PreviewCarousel items={PREVIEWS} current={current} onChange={setCurrent} />
        </section>
      </div>
    </main>
  );
}
