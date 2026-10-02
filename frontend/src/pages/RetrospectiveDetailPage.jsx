import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Users, MoreHorizontal } from "lucide-react";

import retrospectiveDetails from "../mock/retrospectiveDetail";

import RetroSummary from "../components/retrospective/RetroSummary";
import KanbanSnapshot from "../components/retrospective/KanbanSnapshot";
// 회고 노트(Keep/Problem/Try 표 + 자유 메모)는 예전엔 회고 전용으로
// 따로 만든 PageBlockSection을 썼는데, 페이지 상세(PageDetailPage)가
// 쓰는 것과 거의 같은 블록 에디터를 두 벌 유지하게 돼서 — 특히 둘 다
// 전역 CSS에 .block-row/.block-menu 같은 같은 이름의 클래스를 따로
// 정의하다 보니 로드 순서에 따라 서로 스타일을 덮어쓰는 문제가 있었어요.
// 페이지 기능 쪽 컴포넌트를 그대로 재사용하기로 하면서 PageBlockSection은
// 더 이상 안 써요.
import BlockEditor from "../components/page/BlockEditor";

import "../styles/retrospective-detail.css";
import "../styles/page-detail.css";

export default function RetrospectiveDetailPage() {
  const { sprintId } = useParams();
  const navigate = useNavigate();

  // Mock → 나중에 API로 교체해요.
  /*
  // Spring 연결 시: detail을 mock 대신 API 응답으로 채우면 돼요.
  const [retrospective, setRetrospective] = useState(null);

  useEffect(() => {
    const fetchRetrospective = async () => {
      const response = await retrospectiveApi.getDetail(sprintId);
      setRetrospective(response.data);
    };

    fetchRetrospective();
  }, [sprintId]);
  */

  // 주소의 :sprintId로 회고를 찾아요. 숫자가 아니거나(abc, NaN) 없는 스프린트면 undefined라서 아래에서 "없음" 화면을 보여줘요.
  const id = /^\d+$/.test(sprintId ?? "") ? Number(sprintId) : null;
  const detail = id === null ? undefined : retrospectiveDetails[id];

  if (!detail) {
    return (
      <main className="retro-detail-page">
        <header className="retro-detail-header">
          <div>
            <h1>회고를 찾을 수 없어요</h1>

            <div className="retro-meta">
              <span>주소가 잘못됐거나 아직 만들어지지 않은 회고예요.</span>
            </div>
          </div>
        </header>

        <button className="detail-btn" onClick={() => navigate("/retrospectives")}>
          회고 목록으로
        </button>
      </main>
    );
  }

  // key를 sprintId로 줘서 다른 스프린트로 이동하면 편집 중이던 블록 상태가 섞이지 않고 새로 시작해요.
  return <RetrospectiveDetail key={detail.sprintId} initialRetrospective={detail} />;
}

// setRetrospective가 필요한 이유: 아래 BlockEditor는 PageDetailPage와 똑같이 "제어 컴포넌트"라(blocks를
// props로 받고 onChange로 바뀐 배열을 돌려줌) 회고 쪽에서도 그 변경을 받아 담아둘 곳이 있어야 해요.
function RetrospectiveDetail({ initialRetrospective }) {
  const [retrospective, setRetrospective] = useState(initialRetrospective);

  const updateBlocks = (blocks) => {
    setRetrospective((prev) => ({ ...prev, blocks }));
  };

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
              참여자 {(retrospective.participants ?? []).length}명
            </span>
          </div>
        </div>

        <button className="retro-more-button" aria-label="더보기">
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

      {/* ---------- 회고 노트 (Keep/Problem/Try 표 + 노션 스타일 페이지 블록) ----------
          BlockEditor는 원래 하위 페이지 링크 기능도 있는데(pages/
          onCreateChildPage/onRenameRowPage/onDeleteRowPage), 회고엔 그런
          하위 페이지 개념이 없어서 그 props는 안 넘겨요 — BlockEditor가
          그 경우엔 "하위 페이지" 메뉴 항목 자체를 알아서 숨겨줘요. */}
      <section className="page-block-section">
        <div className="retro-section__header">
          <h2>회고 노트</h2>
          <p>
            Keep · Problem · Try 표와 자유롭게 쓰는 메모를 하나의 페이지로
            관리해요. "/"로 블록 종류를 바꾸고, 블록 오른쪽의 "⋯"에서
            이동·삭제할 수 있어요.
          </p>
        </div>

        <BlockEditor blocks={retrospective.blocks} onChange={updateBlocks} />
      </section>
    </main>
  );
}
