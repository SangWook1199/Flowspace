import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import SprintCard from "../components/sprint/SprintCard";
import SprintFilterBar from "../components/sprint/SprintFilterBar";
import SprintHero from "../components/sprint/SprintHero";
import BacklogCard from "../components/sprint/BacklogCard";


// 상단 요약 카드의 구성(라벨/색)이에요. 숫자는 여기 없고 sprints 데이터에서 상태별로 세서 채워요.
const SUMMARY_ITEMS = [
  { label: "진행 중", status: "ACTIVE", tone: "indigo" },
  { label: "계획됨", status: "PLANNING", tone: "sky" },
  { label: "완료", status: "COMPLETED", tone: "green" },
];

export default function SprintList() {
  const navigate = useNavigate();
  // 스프린트·백로그는 서버에서 불러와 MainLayout(WorkspaceProvider)이 내려줘요.
  const { sprints, backlog, sprintDataLoading, sprintDataError, reloadSprintData } = useOutletContext();
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const summary = useMemo(
    () =>
      SUMMARY_ITEMS.map(({ status, ...item }) => ({
        ...item,
        value: sprints.filter((sprint) => sprint.status === status).length,
      })),
    [sprints],
  );

  const keyword = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      sprints.filter(
        (sprint) =>
          (filter === "ALL" || sprint.status === filter) &&
          sprint.name.toLowerCase().includes(keyword),
      ),
    [sprints, filter, keyword],
  );

  // 백로그는 스프린트 상태가 없어서 "전체"일 때만 보이고, 검색어는 이름/설명에 맞아야 해요(스프린트 카드와
  // 같은 규칙). 작업 개수는 코드에 박지 않고 백로그 작업 목록의 길이로 세요.
  const showBacklog =
    filter === "ALL" &&
    `${backlog.name} ${backlog.description ?? ""}`.toLowerCase().includes(keyword);

  if (sprintDataLoading) {
    return (
      <div className="sprintListPage">
        <p className="emptySprints" role="status">스프린트를 불러오는 중이에요…</p>
      </div>
    );
  }

  if (sprintDataError) {
    return (
      <div className="sprintListPage">
        <div className="emptySprints" role="alert">
          <p>{sprintDataError}</p>
          <button type="button" className="sprintDetail" onClick={reloadSprintData}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sprintListPage">
      <SprintHero
        summary={summary}
        onCreate={() => navigate("/sprints/new")}
      />

      <SprintFilterBar
        value={filter}
        query={query}
        onFilter={setFilter}
        onQuery={setQuery}
      />

      <section className="sprintCards">
        {/* 백로그 */}
        {showBacklog && (
          <BacklogCard
            backlog={backlog}
            onClick={() => navigate("/sprints/backlog")}
          />
        )}

        {/* 일반 스프린트 */}
        {visible.map((sprint) => (
          <SprintCard
            key={sprint.id}
            sprint={sprint}
            onNavigate={(id) => navigate(`/sprints/${id}`)}
          />
        ))}

        {!visible.length && !showBacklog && (
          <p className="emptySprints">
            {sprints.length === 0 ? "아직 스프린트가 없어요. 새 스프린트를 만들어보세요." : "조건에 맞는 스프린트가 없습니다."}
          </p>
        )}
      </section>
    </div>
  );
}
