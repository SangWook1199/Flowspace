import { useMemo, useState } from "react";
import "../styles/retrospectiveList.css";

import {
  retrospectiveSummary,
  retrospectiveList,
} from "../mock/retrospectiveMock";

import { percentOf } from "../utils/date";

import RetroSummaryCard from "../components/retrospective/RetroSummaryCard";
import RetroToolbar from "../components/retrospective/RetroToolbar";
import RetroCard from "../components/retrospective/RetroCard";

// 요약 카드 값을 목록에서 계산해요. 계획(planned) 상태처럼 수치가 아직 없는(null) 회고는 평균/합계에서 빼요.
const buildSummary = (meta, list) => {
  const done = list.filter((item) => item.completion != null);
  const sum = (field) => list.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);

  const values = {
    count: done.length,
    avgCompletion: done.length > 0 ? percentOf(sum("completion"), done.length * 100) : 0,
    actionItems: sum("actionItems"),
    participants: list.reduce((max, item) => Math.max(max, Number(item.members) || 0), 0),
  };

  return meta.map((item) => ({
    ...item,
    value: values[item.key],
    desc: item.descTemplate
      ? item.descTemplate.replace("{count}", String(done.length))
      : item.desc,
  }));
};

export default function RetrospectiveList() {
  const [tab, setTab] = useState("all");
  const [keyword, setKeyword] = useState("");

  const summaryCards = useMemo(
    () => buildSummary(retrospectiveSummary, retrospectiveList),
    [],
  );

  const filteredList = useMemo(() => {
    const query = keyword.trim().toLowerCase().replace(/^#/, "");

    return retrospectiveList.filter((item) => {
      // 스프린트 이름뿐 아니라 태그로도 찾을 수 있게 해요(카드에 #태그로 보이니까 사용자가 그걸로 검색해요).
      const matchKeyword =
        item.sprint.toLowerCase().includes(query) ||
        (item.tags ?? []).some((tag) => tag.toLowerCase().includes(query));

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
        {summaryCards.map((item) => (
          <RetroSummaryCard key={item.key} item={item} />
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
        {filteredList.length === 0 && (
          <div className="retro-column__empty">
            <p>조건에 맞는 회고가 없어요.</p>
          </div>
        )}

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
