import { useMemo, useState } from "react";
import "../styles/retrospectiveList.css";

import {
  retrospectiveSummary,
  retrospectiveList,
} from "../mock/retrospectiveMock";

import RetroSummaryCard from "../components/retrospective/RetroSummaryCard";
import RetroToolbar from "../components/retrospective/RetroToolbar";
import RetroCard from "../components/retrospective/RetroCard";

export default function RetrospectiveList() {
  const [tab, setTab] = useState("all");
  const [keyword, setKeyword] = useState("");

  const filteredList = useMemo(() => {
    return retrospectiveList.filter((item) => {
      const matchKeyword = item.sprint
        .toLowerCase()
        .includes(keyword.toLowerCase());

      const matchTab =
        tab === "all"
          ? true
          : tab === "completed"
            ? item.status === "done" || item.status === "latest"
            : tab === "progress"
              ? item.status === "progress"
              : item.status === "planned";

      return matchKeyword && matchTab;
    });
  }, [tab, keyword]);

  return (
    <main className="retro-page">
      {/* Header */}
      <section className="retro-header">
        <div>
          <h1>스프린트 회고</h1>
          <p>완료된 스프린트의 회고를 확인하고 팀의 개선 활동을 관리하세요.</p>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="retro-summary">
        {retrospectiveSummary.map((item) => (
          <RetroSummaryCard key={item.title} item={item} />
        ))}
      </section>

      {/* Toolbar */}
      <RetroToolbar
        tab={tab}
        keyword={keyword}
        onTabChange={setTab}
        onKeywordChange={setKeyword}
      />

      {/* Retrospective List */}
      <section className="retro-list">
        {filteredList.map((retro) => (
          <RetroCard key={retro.id} retrospective={retro} />
        ))}
      </section>

      {/* Footer Guide */}
      <section className="retro-footer">
        <div>
          <h4>회고는 어떻게 생성되나요?</h4>
          <p>
            스프린트를 <strong>완료</strong> 상태로 변경하면 회고 페이지가
            자동으로 생성됩니다.
          </p>
        </div>

        <button className="detail-btn">자세히 보기</button>
      </section>
    </main>
  );
}
