import { CalendarDays, Users } from "lucide-react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";

import * as retrospectiveApi from "../api/retrospectives";
import { useRequest } from "../hooks/useRequest";

import RetroSummary from "../components/retrospective/RetroSummary";
import KanbanSnapshot from "../components/retrospective/KanbanSnapshot";
// 회고 노트(Keep/Problem/Try 표 + 자유 메모)는 페이지 상세와 같은 블록 에디터(PageBlocks)를 그대로 써요.
// 회고 페이지도 서버에서는 평범한 페이지라서, 불러오기·자동 저장이 페이지 상세와 똑같이 동작해요.
import PageBlocks from "../components/page/PageBlocks";

import "../styles/retrospective-detail.css";
import "../styles/page-detail.css";

export default function RetrospectiveDetailPage() {
  const { sprintId } = useParams();
  const navigate = useNavigate();

  // 주소의 :sprintId로 회고를 불러와요. 숫자가 아니면(abc, NaN) 요청하지 않고 "없음" 화면을 보여줘요.
  const id = /^\d+$/.test(sprintId ?? "") ? Number(sprintId) : null;
  const { data, loading, error, reload } = useRequest(
    () => retrospectiveApi.getSprintRetrospective(id),
    [id],
    { enabled: id !== null },
  );

  // 요청 중이거나 실패했을 때 이전 주소의 회고가 남아 보이지 않게, 지금 주소의 회고일 때만 써요.
  const retrospective = data && data.sprintId === id ? data : null;
  const loadError = id === null ? null : error;

  if (id !== null && loading) {
    return (
      <main className="retro-detail-page">
        <p role="status" style={{ padding: 24 }}>
          회고를 불러오는 중이에요…
        </p>
      </main>
    );
  }

  if (!retrospective) {
    return (
      <main className="retro-detail-page">
        <header className="retro-detail-header">
          <div>
            <h1>회고를 찾을 수 없어요</h1>

            <div className="retro-meta">
              <span role={loadError ? "alert" : undefined}>
                {loadError || "주소가 잘못됐거나 아직 만들어지지 않은 회고예요."}
              </span>
            </div>
          </div>
        </header>

        {loadError && (
          <button className="detail-btn" onClick={reload} style={{ marginRight: 8 }}>
            다시 시도
          </button>
        )}
        <button className="detail-btn" onClick={() => navigate("/retrospectives")}>
          회고 목록으로
        </button>
      </main>
    );
  }

  // key를 sprintId로 줘서 다른 스프린트로 이동하면 편집 중이던 블록 상태가 섞이지 않고 새로 시작해요.
  return <RetrospectiveDetail key={retrospective.sprintId} retrospective={retrospective} />;
}

function RetrospectiveDetail({ retrospective }) {
  const { pages, pageIdMap, sprintTasks, toggleSubtask } = useOutletContext();

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

        {/* 더보기 버튼은 기능이 없어서 뺐어요. */}
      </header>

      {/* ---------- 회고 요약 ---------- */}
      <RetroSummary
        summary={retrospective.summary}
        participants={retrospective.participants}
      />

      {/* ---------- 완료 시점 칸반 ---------- */}
      <KanbanSnapshot columns={retrospective.kanban} />

      {/* ---------- 회고 노트 (Keep/Problem/Try 표 + 노션 스타일 페이지 블록) ----------
          하위 페이지를 만드는 props(onCreateChildPage 등)는 안 넘겨요 — 회고엔 하위 페이지 개념이 없어서
          BlockEditor가 "하위 페이지" 메뉴 항목을 알아서 숨겨줘요. */}
      <section className="page-block-section">
        <div className="retro-section__header">
          <h2>회고 노트</h2>
          <p>
            Keep · Problem · Try 표와 자유롭게 쓰는 메모를 하나의 페이지로
            관리해요. "/"로 블록 종류를 바꾸고, 블록 오른쪽의 "⋯"에서
            이동·삭제할 수 있어요.
          </p>
        </div>

        {retrospective.pageId == null ? (
          <p className="page-detail__missing">회고 노트 페이지를 찾을 수 없어요.</p>
        ) : (
          <PageBlocks
            pageId={retrospective.pageId}
            pages={pages}
            pageIdMap={pageIdMap}
            sprintTasks={sprintTasks}
            onToggleSubtask={toggleSubtask}
          />
        )}
      </section>
    </main>
  );
}
