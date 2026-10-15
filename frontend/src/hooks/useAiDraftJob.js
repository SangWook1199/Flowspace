import { useCallback, useEffect, useRef, useState } from "react";
import { cancelAiDraft, getAiDraft, startAiDraft } from "../api/ai";
import { forgetJobId, loadJobId, saveJobId } from "../utils/aiDraft";
import { getErrorMessage } from "../utils/apiError";

const POLL_MS = 2000;
// 연속으로 이만큼 조회에 실패하면 조회를 멈추고 "다시 확인" 버튼을 보여줘요.
const MAX_FAILURES = 3;

export const isJobActive = (job) => job?.status === "QUEUED" || job?.status === "RUNNING";

// AI 초안 만들기 작업을 시작·조회(폴링)·취소하는 훅이에요.
//   const { job, starting, restoring, error, start, cancel, reset, recheck, forget } = useAiDraftJob(workspaceId);
// - 만드는 중에 화면을 나가도 서버는 계속 만들고, 작업 id를 sessionStorage에 둬서 돌아오면 이어서 보여줘요.
// - job.status가 DONE이면 job.draft에 초안이 들어 있어요(만들기 전까지 서버 메모리에 30분쯤 남아요).
export default function useAiDraftJob(workspaceId) {
  const [job, setJob] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  // 이어보기할 작업이 있으면 첫 응답이 올 때까지 true예요(그동안 빈 폼이 번쩍이지 않게요).
  const [restoring, setRestoring] = useState(() => Boolean(loadJobId(workspaceId)));

  const timer = useRef(null);
  const alive = useRef(true);
  const failures = useRef(0);
  const currentJobId = useRef(null);

  const watch = useCallback(
    (jobId, delay) => {
      window.clearTimeout(timer.current);
      currentJobId.current = jobId;
      failures.current = 0;

      const tick = async () => {
        try {
          const next = await getAiDraft(workspaceId, jobId);

          if (!alive.current || currentJobId.current !== jobId) return;

          failures.current = 0;
          setError("");
          setJob(next);
          setRestoring(false);

          if (isJobActive(next)) {
            timer.current = window.setTimeout(tick, POLL_MS);
          } else if (next.status !== "DONE") {
            // 실패·취소된 작업은 이어볼 필요가 없어요. 완성(DONE)은 만들기 전까지 남겨 둬요.
            forgetJobId(workspaceId);
          }
        } catch (err) {
          if (!alive.current || currentJobId.current !== jobId) return;

          setRestoring(false);

          // 작업이 없어졌어요(서버 재시작·시간 지남·내 작업이 아님). 다시 이어볼 수 없어요.
          if (err.response?.status === 404 || err.response?.status === 403) {
            forgetJobId(workspaceId);
            setJob(null);
            setError(getErrorMessage(err, "AI 초안을 찾을 수 없어요. 시간이 지나 지워졌을 수 있어요."));
            return;
          }

          failures.current += 1;

          if (failures.current >= MAX_FAILURES) {
            setError(getErrorMessage(err, "진행 상황을 확인하지 못했어요."));
            return;
          }

          timer.current = window.setTimeout(tick, POLL_MS * 2);
        }
      };

      timer.current = window.setTimeout(tick, delay);
    },
    [workspaceId],
  );

  // 열 때 저장해 둔 작업이 있으면 이어서 조회해요.
  useEffect(() => {
    alive.current = true;

    const saved = loadJobId(workspaceId);
    if (saved) watch(saved, 0);

    return () => {
      alive.current = false;
      window.clearTimeout(timer.current);
    };
  }, [workspaceId, watch]);

  const start = useCallback(
    async (payload) => {
      setStarting(true);
      setError("");

      try {
        const created = await startAiDraft(workspaceId, payload);
        saveJobId(workspaceId, created.jobId);
        setJob(created);
        watch(created.jobId, POLL_MS);
        return true;
      } catch (err) {
        setError(getErrorMessage(err, "AI 초안 만들기를 시작하지 못했어요."));
        return false;
      } finally {
        setStarting(false);
      }
    },
    [workspaceId, watch],
  );

  const cancel = useCallback(async () => {
    if (!job) return;

    try {
      await cancelAiDraft(workspaceId, job.jobId);
      watch(job.jobId, 0); // 취소됐는지 바로 다시 확인해요.
    } catch (err) {
      setError(getErrorMessage(err, "취소하지 못했어요."));
    }
  }, [workspaceId, job, watch]);

  // 조회가 멈췄을 때 "다시 확인" 버튼용이에요.
  const recheck = useCallback(() => {
    if (currentJobId.current) watch(currentJobId.current, 0);
  }, [watch]);

  // 저장해 둔 작업 id만 잊어요(만들기에 성공한 뒤).
  const forget = useCallback(() => {
    window.clearTimeout(timer.current);
    currentJobId.current = null;
    forgetJobId(workspaceId);
  }, [workspaceId]);

  // 처음 화면(폼)으로 돌아가요.
  const reset = useCallback(() => {
    forget();
    setJob(null);
    setError("");
  }, [forget]);

  return { job, starting, restoring, error, start, cancel, recheck, forget, reset };
}
