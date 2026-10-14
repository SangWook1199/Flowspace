import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, TriangleAlert } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";

import AiDraftPreview from "../components/ai/AiDraftPreview";
import AiProgress from "../components/ai/AiProgress";
import AiProjectForm from "../components/ai/AiProjectForm";

import { applyAiDraft } from "../api/ai";
import useDialog from "../context/useDialog";
import useAiDraftJob, { isJobActive } from "../hooks/useAiDraftJob";
import useAiStatus from "../hooks/useAiStatus";
import { buildRequest, makeInitialForm } from "../utils/aiDraft";

const STEPS = ["입력", "AI가 만드는 중", "확인하고 만들기"];

// "AI로 프로젝트 구성" 화면(/sprints/ai)이에요. 입력 → AI가 초안을 만듦 → 확인·수정 → 스프린트·작업·일정 한 번에 만들기 순서예요.
// 관리자 이상만 쓸 수 있어요(서버도 같은 규칙으로 막아요).
export default function AiProject() {
  const navigate = useNavigate();
  const { notify } = useDialog();
  const { workspaceId, canManageWorkspace, members, sprints, reloadSprintData } = useOutletContext();

  const { status, loading: statusLoading, error: statusError, recheck: recheckStatus } = useAiStatus({ refresh: true });
  const { job, starting, restoring, error, start, cancel, recheck, forget, reset } = useAiDraftJob(workspaceId);

  // 폼 값은 여기서 들고 있어서, 만들기에 실패하거나 취소하고 돌아와도 적은 내용이 남아요.
  const [form, setForm] = useState(() => makeInitialForm(sprints));

  const goBack = () => navigate("/sprints");

  const handleApply = async (body) => {
    const result = await applyAiDraft(workspaceId, job.jobId, body);

    forget();
    await reloadSprintData?.();
    notify(`스프린트 ${result.sprintCount}개, 작업 ${result.taskCount}개, 일정 ${result.eventCount}개를 만들었어요.`, {
      type: "success",
    });
    navigate("/sprints");
  };

  const step = !job ? 0 : isJobActive(job) ? 1 : job.status === "DONE" ? 2 : 0;

  return (
    <div className="sprintCreatePage aiPage">
      <div className="breadcrumb">
        <button type="button" className="breadcrumbLink" onClick={goBack}>
          스프린트
        </button>
        <ChevronRight size={16} />
        <b>AI로 프로젝트 구성</b>
      </div>

      <div className="sprintPageHeading">
        <div>
          <h1>
            <Sparkles size={26} className="aiTitleIcon" /> AI로 프로젝트 구성
          </h1>
          <p>주제와 팀 정보를 알려주면 스프린트와 작업, 일정 초안을 만들어 드려요.</p>
        </div>
        <button type="button" onClick={goBack}>
          <ChevronLeft size={17} /> 스프린트 목록으로
        </button>
      </div>

      {!canManageWorkspace ? (
        <Notice title="관리자만 쓸 수 있어요" onBack={goBack}>
          한꺼번에 많은 스프린트와 작업을 만드는 기능이라 워크스페이스 관리자 이상만 쓸 수 있어요.
        </Notice>
      ) : statusLoading || restoring ? (
        <p className="aiLoading" role="status">
          불러오는 중이에요…
        </p>
      ) : statusError ? (
        <Notice title="AI 상태를 확인하지 못했어요" onBack={goBack} onRetry={recheckStatus}>
          {statusError}
        </Notice>
      ) : !status?.enabled ? (
        <Notice title="AI 기능이 꺼져 있어요" onBack={goBack}>
          지금은 AI 프로젝트 구성을 쓸 수 없어요. 관리자에게 문의해 주세요.
        </Notice>
      ) : (
        <>
          <ol className="aiSteps" aria-label="진행 단계">
            {STEPS.map((label, index) => (
              <li key={label} className={index === step ? "current" : index < step ? "done" : ""} aria-current={index === step ? "step" : undefined}>
                <span>{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>

          {!job && (
            <AiProjectForm
              form={form}
              setForm={setForm}
              members={members}
              sprints={sprints}
              starting={starting}
              blocked={status.available ? "" : "지금 AI 모델에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요."}
              message={error}
              onSubmit={() => start(buildRequest(form))}
              onCancel={goBack}
            />
          )}

          {!job && !status.available && (
            <p className="aiRecheck">
              <button type="button" onClick={recheckStatus}>
                연결 다시 확인
              </button>
            </p>
          )}

          {job && isJobActive(job) && <AiProgress job={job} error={error} onCancel={cancel} onRecheck={recheck} />}

          {job?.status === "DONE" && job.draft && (
            <AiDraftPreview
              key={job.jobId}
              initialDraft={job.draft}
              members={members}
              onApply={handleApply}
              onDiscard={reset}
            />
          )}

          {(job?.status === "FAILED" || job?.status === "CANCELLED") && (
            <Notice
              title={job.status === "CANCELLED" ? "만들기를 취소했어요" : "초안을 만들지 못했어요"}
              onBack={reset}
              backLabel="입력 화면으로"
            >
              {job.status === "CANCELLED" ? "입력한 내용은 그대로 남아 있어요." : (job.error || job.message)}
            </Notice>
          )}
        </>
      )}
    </div>
  );
}

// 안내(막힘·실패) 카드
function Notice({ title, children, onBack, backLabel = "스프린트 목록으로", onRetry }) {
  return (
    <section className="aiNoticeCard" role="alert">
      <TriangleAlert size={30} />
      <h2>{title}</h2>
      <p>{children}</p>
      <div>
        {onRetry && (
          <button type="button" onClick={onRetry}>
            다시 확인
          </button>
        )}
        <button type="button" className="primary" onClick={onBack}>
          {backLabel}
        </button>
      </div>
    </section>
  );
}
