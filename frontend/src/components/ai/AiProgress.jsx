import { Check, LoaderCircle, TriangleAlert } from "lucide-react";

import { formatElapsed } from "../../utils/aiDraft";

// 초안을 만드는 동안 보여주는 화면이에요. 서버가 AI가 쓰는 글을 받는 만큼 읽어서 알려 주는 진행 상황(job.progress)으로
// 퍼센트와 "지금 만들고 있는 스프린트·방금 만든 작업"을 보여줘요. 퍼센트는 시간이 아니라 나온 스프린트·작업 수로
// 어림한 값이라, 모델이 쓰는 속도에 따라 빨라지거나 느려질 수 있어요.
export default function AiProgress({ job, error, onCancel, onRecheck }) {
  const queued = job.status === "QUEUED";
  const retrying = job.attempt > 1;
  const progress = queued ? null : job.progress;
  const checking = progress?.phase === "CHECKING";

  return (
    <section className="aiProgress" role="status" aria-live="polite">
      <LoaderCircle className="aiSpinner" size={44} />

      <h2>{queued ? "차례를 기다리고 있어요" : retrying ? "초안을 다시 다듬고 있어요" : "AI가 초안을 만들고 있어요"}</h2>

      {!queued && (
        <div className="aiMeterBlock">
          <div
            className={`aiMeter${progress ? "" : " aiMeterWaiting"}`}
            role="progressbar"
            aria-label="초안 만들기 진행률"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress ? progress.percent : undefined}
          >
            <i style={progress ? { width: `${progress.percent}%` } : undefined} />
          </div>
          <b className="aiMeterPercent">{progress ? `${progress.percent}%` : "준비 중"}</b>
        </div>
      )}

      <p className="aiProgressMessage">{progressMessage(job, progress, checking, queued)}</p>

      {progress && progress.recentTasks.length > 0 && (
        <div className="aiTaskFeed">
          <p className="aiTaskFeedTitle">
            {checking ? "만든 작업" : "방금 만든 작업"} <span>총 {progress.taskCount}개</span>
          </p>
          <ul>
            {[...progress.recentTasks].reverse().map((title, index) => (
              <li key={`${progress.taskCount - index}-${title}`} className={index === 0 && !checking ? "aiTaskNew" : ""}>
                <Check size={14} />
                <span>{title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="aiProgressMeta">
        <div>
          <dt>걸린 시간</dt>
          <dd>{formatElapsed(job.elapsedSeconds)}</dd>
        </div>
        {!queued && (
          <div>
            <dt>시도</dt>
            <dd>
              {job.attempt} / {job.maxAttempts}
            </dd>
          </div>
        )}
      </dl>

      {retrying && (
        <p className="aiProgressNote">처음 결과에 고칠 점이 있어서 한 번 더 만들고 있어요. 조금 더 걸릴 수 있어요.</p>
      )}

      {error && (
        <p className="aiProgressError" role="alert">
          <TriangleAlert size={16} /> {error}
          <button type="button" onClick={onRecheck}>
            다시 확인
          </button>
        </p>
      )}

      <p className="aiProgressNote">이 화면을 나가도 계속 만들어요. 다시 들어오면 이어서 보여드려요.</p>

      <button type="button" className="aiCancel" onClick={onCancel}>
        만들기 취소
      </button>
    </section>
  );
}

// 지금 무엇을 하고 있는지 한 줄로 알려줘요.
function progressMessage(job, progress, checking, queued) {
  if (queued) return job.message;
  if (!progress) return "AI가 첫 응답을 준비하고 있어요. 처음에는 모델을 불러오느라 시간이 걸릴 수 있어요.";
  if (checking) return "초안을 다 받았어요. 날짜와 담당자를 계산하고 빠진 곳이 없는지 확인하고 있어요.";

  const where = `${progress.sprintIndex}/${progress.sprintCount}번째 스프린트`;

  return progress.sprintName ? `${where} “${progress.sprintName}”의 작업을 만들고 있어요.` : `${where}를 구상하고 있어요.`;
}
