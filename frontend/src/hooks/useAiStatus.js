import { useCallback, useEffect, useState } from "react";
import { getAiStatus } from "../api/ai";
import { getErrorMessage } from "../utils/apiError";

// AI 상태는 사용자마다 다르지 않아서 한 번 받은 값을 모듈에 들고 있어요(진입 버튼 세 곳이 매번 묻지 않게).
let cached = null;
let pending = null;

const load = () => {
  if (!pending) {
    pending = getAiStatus()
      .then((status) => {
        cached = status;
        return status;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
};

// 진입 버튼은 기본값(캐시 사용)으로 쓰고, AI 화면은 { refresh: true }로 열 때마다 새로 확인해요
// (Ollama가 그 사이에 꺼지거나 켜졌을 수 있어서요).
//   const { status, loading, error, recheck } = useAiStatus();
//   status?.enabled && ...   // 서버가 AI 기능을 켜 뒀는지
//   status?.available        // 지금 모델에 연결되는지
export default function useAiStatus({ refresh = false } = {}) {
  const [status, setStatus] = useState(cached);
  const [loading, setLoading] = useState(refresh || !cached);
  const [error, setError] = useState("");

  // "다시 확인" 버튼용이에요.
  const recheck = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setStatus(await load());
    } catch (err) {
      setError(getErrorMessage(err, "AI 상태를 확인하지 못했어요."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!refresh && cached) return undefined;

    let ignore = false;

    load()
      .then((next) => {
        if (!ignore) setStatus(next);
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, "AI 상태를 확인하지 못했어요."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [refresh]);

  return { status, loading, error, recheck };
}
