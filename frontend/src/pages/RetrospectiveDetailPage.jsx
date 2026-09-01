import { useState } from "react";
import { CalendarDays, Users, MoreHorizontal } from "lucide-react";

import retrospectiveMock from "../mock/retrospectiveDetail";

import RetroSummary from "../components/retrospective/RetroSummary";
import KanbanSnapshot from "../components/retrospective/KanbanSnapshot";
import RetroReviewSection from "../components/retrospective/RetroReviewSection";
import PageBlockSection from "../components/retrospective/PageBlockSection";

import "../styles/retrospective-detail.css";

export default function RetrospectiveDetailPage() {
  // Mock → 나중에 API로 교체
  const [retrospective] = useState(retrospectiveMock);

  /*
  // Spring 연결 시
  const { sprintId } = useParams();
  const [retrospective, setRetrospective] = useState(null);

  useEffect(() => {
    const fetchRetrospective = async () => {
      const response = await retrospectiveApi.getDetail(sprintId);
      setRetrospective(response.data);
    };

    fetchRetrospective();
  }, [sprintId]);
  */

  if (!retrospective) return null;

  return (
    <main className="retro-detail-page">
      {/* ---------- Header ---------- */}
      <header className="retro-detail-header">
        <div>
          <h1>{retrospective.sprintName} 회고</h1>

          <div className="retro-meta">
            <span>
              <CalendarDays size={16} />
              {retrospective.startDate} ~ {retrospective.endDate}
            </span>

            <span>
              <Users size={16} />
              참여자 {retrospective.participants.length}명
            </span>
          </div>
        </div>

        <button className="retro-more-button">
          <MoreHorizontal size={18} />
        </button>
      </header>

      {/* ---------- 회고 요약 ---------- */}
      <RetroSummary
        summary={retrospective.summary}
        participants={retrospective.participants}
      />

      {/* ---------- 완료 시점 칸반 ---------- */}
      <KanbanSnapshot kanban={retrospective.kanban} />

      {/* ---------- Keep / Problem / Try ---------- */}
      <RetroReviewSection review={retrospective.review} />

      {/* ---------- 페이지 블록 (노션 스타일) ---------- */}
      <PageBlockSection blocks={retrospective.blocks} />
    </main>
  );
}
