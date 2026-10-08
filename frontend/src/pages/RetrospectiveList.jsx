import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "../styles/retrospectiveList.css";

import * as retrospectiveApi from "../api/retrospectives";
import { useRequest } from "../hooks/useRequest";
import { retrospectiveSummary } from "../components/retrospective/summaryMeta";

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
  const { workspaceId } = useOutletContext();
  const [tab, setTab] = useState("all");
  const [keyword, setKeyword] = useState("");

  // 회고 목록은 서버에서 받아요. 워크스페이스를 바꾸면 다시 받아요.
  const {
    data,
    loading,
    error,
    reload,
  } = useRequest(() => retrospectiveApi.getRetrospectives(workspaceId), [workspaceId], {
    initialData: [],
  });
  const retrospectiveList = useMemo(() => data ?? [], [data]);

  const summaryCards = useMemo(
    () => buildSummary(retrospectiveSummary, retrospectiveList),
    [retrospectiveList],
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
  }, [retrospectiveList, tab, keyword]);

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
        {loading && retrospectiveList.length === 0 && (
          <div className="retro-column__empty" role="status">
            <p>회고를 불러오는 중이에요…</p>
          </div>
        )}

        {error && (
          <div className="retro-column__empty" role="alert">
            <p>회고를 불러오지 못했어요. {error}</p>
            <button type="button" className="detail-btn" onClick={reload}>
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && filteredList.length === 0 && (
          <div className="retro-column__empty">
            <p>
              {retrospectiveList.length === 0
                ? "아직 회고가 없어요. 스프린트를 완료하면 회고가 만들어져요."
                : "조건에 맞는 회고가 없어요."}
            </p>
          </div>
        )}

        {filteredList.map((retro) => (
          <RetroCard key={retro.sprintId} retrospective={retro} />
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
