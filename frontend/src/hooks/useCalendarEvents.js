import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import * as eventApi from "../api/events";
import { getErrorMessage } from "../utils/apiError";

const STALE_MS = 15000;

const monthKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

// 보고 있는 달과 앞뒤 한 달(달력 칸에 보이는 앞뒤 날짜용)의 키 3개예요.
const aroundKeys = (year, month) =>
  [-1, 0, 1].map((diff) => {
    const date = new Date(year, month - 1 + diff, 1);
    return monthKey(date.getFullYear(), date.getMonth() + 1);
  });

const startKey = (event) => String(event.start_datetime ?? "").slice(0, 7);

// 달력이 쓰는 일정 목록이에요(월별로 받아서 기억해둬요).
//  - 달을 옮길 때 이미 받은 달은 다시 받지 않아서 깜빡이지 않아요.
//  - 한 달이 실패해도 나머지는 그대로 보여주고, retry()로 실패한 달만 다시 받아요.
//  - 탭이나 창으로 돌아오면(15초 넘게 지났을 때) 조용히 다시 받아요 — 다른 사람이 바꾼 일정이 보여요.
//  - add/replace/remove는 저장·수정·삭제에 성공한 뒤 화면에 바로 반영해요.
export function useCalendarEvents(workspaceId, year, month) {
  const [byMonth, setByMonth] = useState({});
  const [failed, setFailed] = useState({}); // { "2026-10": "에러 메시지" }
  const [loading, setLoading] = useState(false);

  const loadedAt = useRef({});
  const inFlight = useRef(new Set());
  // 워크스페이스가 바뀌면 옛 응답이 새 데이터에 섞이지 않게 번호를 올려서 버려요.
  const epoch = useRef(0);

  const loadMonth = useCallback(
    async (key) => {
      if (workspaceId == null || inFlight.current.has(key)) return;

      const [y, m] = key.split("-").map(Number);
      const myEpoch = epoch.current;
      inFlight.current.add(key);
      setLoading(true);

      try {
        const list = await eventApi.getEventsOfMonth(workspaceId, y, m);
        if (myEpoch !== epoch.current) return;

        loadedAt.current[key] = Date.now();
        setByMonth((prev) => ({ ...prev, [key]: list }));
        setFailed((prev) => {
          if (!(key in prev)) return prev;
          const rest = { ...prev };
          delete rest[key];
          return rest;
        });
      } catch (err) {
        if (myEpoch !== epoch.current) return;
        setFailed((prev) => ({ ...prev, [key]: getErrorMessage(err, "일정을 불러오지 못했어요.") }));
      } finally {
        inFlight.current.delete(key);
        if (myEpoch === epoch.current && inFlight.current.size === 0) setLoading(false);
      }
    },
    [workspaceId],
  );

  // 워크스페이스가 바뀌면 전부 비워요.
  useEffect(() => {
    epoch.current++;
    inFlight.current = new Set();
    loadedAt.current = {};
    setByMonth({});
    setFailed({});
    setLoading(false);
  }, [workspaceId]);

  // 보고 있는 달 주변에서 아직 안 받은 달만 받아요(실패한 달은 retry 버튼으로만 다시 받아요).
  useEffect(() => {
    aroundKeys(year, month).forEach((key) => {
      if (!(key in loadedAt.current) && !(key in failed)) loadMonth(key);
    });
    // failed는 일부러 deps에서 뺐어요: 실패하자마자 자동으로 다시 부르면 무한 반복돼요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, year, month, loadMonth, byMonth]);

  // 창으로 돌아오면 보고 있는 달들을 조용히 다시 받아요.
  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState === "hidden") return;

      aroundKeys(year, month).forEach((key) => {
        if (key in loadedAt.current && Date.now() - loadedAt.current[key] >= STALE_MS) loadMonth(key);
      });
    };

    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [year, month, loadMonth]);

  // 실패한 달만 다시 받아요.
  const retry = useCallback(() => {
    Object.keys(failed).forEach((key) => loadMonth(key));
  }, [failed, loadMonth]);

  // 일정은 "시작일이 속한 달"에 보관해요(서버도 그렇게 줘요). 같은 id는 한 번만 담아요.
  const place = useCallback((prev, event) => {
    const next = {};
    Object.entries(prev).forEach(([key, list]) => {
      next[key] = list.filter((item) => item.event_id !== event.event_id);
    });
    const key = startKey(event);
    next[key] = [...(next[key] ?? []), event];
    // 아직 받지 않은 달에 넣었다면 "받음"으로 치지 않아요(그 달은 나중에 전체를 받아요).
    return next;
  }, []);

  const addEvent = useCallback((event) => setByMonth((prev) => place(prev, event)), [place]);
  const replaceEvent = addEvent;

  const removeEvent = useCallback((eventId) => {
    setByMonth((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, list]) => {
        next[key] = list.filter((item) => item.event_id !== eventId);
      });
      return next;
    });
  }, []);

  const events = useMemo(() => {
    const seen = new Set();
    return Object.values(byMonth)
      .flat()
      .filter((event) => (seen.has(event.event_id) ? false : seen.add(event.event_id)));
  }, [byMonth]);

  const failedKeys = Object.keys(failed);

  return {
    events,
    loading,
    error: failedKeys.length > 0 ? failed[failedKeys[0]] : null,
    failedCount: failedKeys.length,
    retry,
    addEvent,
    replaceEvent,
    removeEvent,
  };
}
