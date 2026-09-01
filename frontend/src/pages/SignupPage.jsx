import { useState } from "react";

import FlowSpaceLogo from "../components/common/FlowSpaceLogo";
import SignupForm from "../components/auth/SignupForm";
import PreviewCarousel from "../components/auth/PreviewCarousel";
import "../styles/auth.css";

import dashboard from "../assets/login/dashboard-summary.png";
import kanban from "../assets/login/kanban-summary.png";
import calendar from "../assets/login/calendar-summary.png";
import document from "../assets/login/document-summary.png";

export default function SignupPage() {
  const [current, setCurrent] = useState(0);

  const previews = [
    {
      image: dashboard,
      title: "함께 일하는 공간",
      description: "스프린트 진행률과 오늘의 작업을 한눈에 관리하세요.",
    },
    {
      image: kanban,
      title: "칸반으로 업무 관리",
      description: "진행 중 · 검토 · 완료 상태를 직관적으로 확인하세요.",
    },
    {
      image: calendar,
      title: "일정을 놓치지 마세요",
      description: "팀 일정과 마감일을 월간 캘린더로 관리합니다.",
    },
    {
      image: document,
      title: "회의록과 문서 협업",
      description: "회의 내용을 기록하고 액션 아이템까지 연결하세요.",
    },
  ];

  return (
    <main className="login-page">
      <div className="login-container">
        {/* 왼쪽 회원가입 */}
        <section className="login-card">
          <FlowSpaceLogo />

          <SignupForm />
        </section>

        {/* 오른쪽 소개 */}
        <section className="preview-card">
          <PreviewCarousel
            items={previews}
            current={current}
            onChange={setCurrent}
          />
        </section>
      </div>
    </main>
  );
}
