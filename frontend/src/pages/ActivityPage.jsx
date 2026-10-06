import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import * as activityApi from "../api/activities";
import { toActivity } from "../api/mappers";
import WorkspaceContext from "../context/WorkspaceContext";
import { getAvatarTone } from "../utils/avatarColor";
import { getErrorMessage } from "../utils/apiError";
import { parseDateKey, todayKey } from "../utils/date";
import "../styles/activity-page.css";

const CATEGORIES = [
  { key: "", label: "전체" },
  { key: "PAGE", label: "페이지" },
  { key: "TASK", label: "작업" },
  { key: "COMMENT", label: "댓글" },
  { key: "SPRINT", label: "스프린트" },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 날짜 구분 제목: 오늘 / 어제 / 10월 3일 (금)
const dayLabel = (createdAt) => {
  const key = String(createdAt ?? "").slice(0, 10);
  const date = parseDateKey(key);
  if (!date) return "";

  const today = parseDateKey(todayKey());
  const diff = today ? Math.round((today.getTime() - date.getTime()) / 86400000) : null;
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";

  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
};

// 활동 기록 화면: 워크스페이스에서 일어난 일(페이지·작업·댓글·스프린트)을 최신순으로 보여줘요.
// 종류와 멤버로 걸러 볼 수 있고, 20개씩 "더 보기"로 이어서 불러와요. 항목을 누르면 그 작업·페이지로 이동해요.
export default function ActivityPage() {
  const { workspaceId } = useOutletContext();
  const navigate = useNavigate();
  const members = useContext(WorkspaceContext)?.members ?? [];

  const [category, setCategory] = useState("");
  const [userId, setUserId] = useState("");
  const [state, setState] = useState({ items: [], page: 0, hasNext: false, loading: true, error: null, total: 0 });

  // 필터를 바꾸면 처음부터 다시 불러와요. 늦게 도착한 이전 응답은 무시해요.
  const requestId = useRef(0);

  const load = (page) => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null, ...(page === 0 ? { items: [] } : {}) }));

    activityApi
      .getActivities(workspaceId, { page, category, userId: userId === "" ? null : Number(userId) })
      .then((data) => {
        if (id !== requestId.current) return;
        const now = Date.now();
        const mapped = data.items.map((item) => toActivity(item, {}, now));
        setState((prev) => ({
          items: page === 0 ? mapped : [...prev.items, ...mapped],
          page: data.page,
          hasNext: data.hasNext,
          total: data.totalElements,
          loading: false,
          error: null,
        }));
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setState((prev) => ({ ...prev, loading: false, error: getErrorMessage(err, "활동 기록을 불러오지 못했어요.") }));
      });
  };

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, category, userId]);

  // 같은 날짜끼리 묶어서 보여줘요(서버가 최신순으로 줘서 순서는 그대로예요).
  const groups = useMemo(() => {
    const result = [];
    for (const item of state.items) {
      const label = dayLabel(item.createdAt);
      const last = result[result.length - 1];
      if (last && last.label === label) last.items.push(item);
      else result.push({ label, items: [item] });
    }
    return result;
  }, [state.items]);

  return (
    <main className="activity-page">
      <header className="activity-page__head">
        <div>
          <h1>활동 기록</h1>
          <p>워크스페이스에서 일어난 일을 최신순으로 볼 수 있어요.</p>
        </div>
      </header>

      <div className="activity-page__filters">
        <div className="activity-page__chips" role="group" aria-label="활동 종류">
          {CATEGORIES.map(({ key, label }) => (
            <button
              key={key || "all"}
              type="button"
              className={category === key ? "active" : ""}
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="activity-page__member">
          <span>멤버</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">모든 멤버</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="activity-page__panel" aria-live="polite">
        {state.error && (
          <p className="activity-page__error" role="alert">
            {state.error}
            <button type="button" onClick={() => load(0)}>
              다시 시도
            </button>
          </p>
        )}

        {!state.error && state.loading && state.items.length === 0 && (
          <p className="activity-page__hint" role="status">
            불러오는 중이에요…
          </p>
        )}

        {!state.error && !state.loading && state.items.length === 0 && (
          <p className="activity-page__hint">아직 활동 기록이 없어요.</p>
        )}

        {groups.map((group) => (
          <div key={group.label} className="activity-page__group">
            <h2>{group.label}</h2>

            <ul>
              {group.items.map((item) => {
                const body = (
                  <>
                    <span className={`avatar ${getAvatarTone(item.userId)} activity-page__avatar`}>
                      {item.profileImageUrl ? <img src={item.profileImageUrl} alt="" /> : item.initial}
                    </span>
                    <span className="activity-page__text">
                      <span>{item.text}</span>
                      <small>{item.time}</small>
                    </span>
                  </>
                );

                return (
                  <li key={item.id}>
                    {item.link ? (
                      <button type="button" className="activity-page__row link" onClick={() => navigate(item.link)}>
                        {body}
                      </button>
                    ) : (
                      <div className="activity-page__row">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {state.hasNext && (
          <button
            type="button"
            className="activity-page__more"
            disabled={state.loading}
            onClick={() => load(state.page + 1)}
          >
            {state.loading ? "불러오는 중…" : "더 보기"}
          </button>
        )}
      </section>
    </main>
  );
}
