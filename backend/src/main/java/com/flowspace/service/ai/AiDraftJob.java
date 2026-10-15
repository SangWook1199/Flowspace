package com.flowspace.service.ai;

import java.time.Instant;
import java.util.concurrent.Future;

import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiJobStatus;
import com.flowspace.dto.ai.AiProgressInfo;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;

// 초안 만들기 작업 하나예요. 만드는 스레드와 상태를 묻는 요청이 동시에 만지니까 상태가 바뀌는 곳은 잠가요.
public class AiDraftJob {

    private final String jobId;
    private final Long workspaceId;
    private final Long ownerUserId;
    private final Instant createdAt = Instant.now();

    private AiJobStatus status = AiJobStatus.QUEUED;
    private int attempt;
    private int maxAttempts;
    private AiDraft draft;
    private AiProgressInfo progress;
    private String error;
    private Instant finishedAt;

    private boolean applying;
    private boolean applied;

    private volatile boolean cancelRequested;
    private volatile Future<?> future;

    public AiDraftJob(String jobId, Long workspaceId, Long ownerUserId) {
        this.jobId = jobId;
        this.workspaceId = workspaceId;
        this.ownerUserId = ownerUserId;
    }

    public String jobId() {
        return jobId;
    }

    public Long workspaceId() {
        return workspaceId;
    }

    public Long ownerUserId() {
        return ownerUserId;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public void setFuture(Future<?> future) {
        this.future = future;
    }

    public boolean isCancelRequested() {
        return cancelRequested;
    }

    public synchronized AiJobStatus status() {
        return status;
    }

    public synchronized int attempt() {
        return attempt;
    }

    public synchronized int maxAttempts() {
        return maxAttempts;
    }

    public synchronized AiDraft draft() {
        return draft;
    }

    public synchronized String error() {
        return error;
    }

    public synchronized Instant finishedAt() {
        return finishedAt;
    }

    // 아직 끝나지 않은(대기 중이거나 만드는 중인) 작업이에요.
    public synchronized boolean isActive() {
        return status == AiJobStatus.QUEUED || status == AiJobStatus.RUNNING;
    }

    public synchronized void markRunning() {
        if (status == AiJobStatus.QUEUED) {
            status = AiJobStatus.RUNNING;
        }
    }

    // 새 시도가 시작되면 진행 상황은 처음부터 다시예요(모델이 첫 글을 쓰기 전까지는 없어요).
    public synchronized void onAttempt(int attempt, int maxAttempts) {
        this.attempt = attempt;
        this.maxAttempts = maxAttempts;
        this.progress = null;
    }

    public synchronized void onProgress(AiProgressInfo progress) {
        this.progress = progress;
    }

    public synchronized AiProgressInfo progress() {
        return progress;
    }

    // 취소된 작업은 늦게 끝나도 결과를 받지 않아요.
    public synchronized void complete(AiDraft draft) {
        if (status == AiJobStatus.CANCELLED) {
            return;
        }

        this.draft = draft;
        this.status = AiJobStatus.DONE;
        this.finishedAt = Instant.now();
    }

    public synchronized void fail(String error) {
        if (status == AiJobStatus.CANCELLED) {
            return;
        }

        this.error = error;
        this.status = AiJobStatus.FAILED;
        this.finishedAt = Instant.now();
    }

    // 대기·진행 중이면 멈추게 하고(진행 중인 모델 호출은 스레드를 깨워서 끊어요), 이미 끝났으면 아무것도 안 해요.
    public void cancel() {

        Future<?> running;

        synchronized (this) {
            if (!isActive()) {
                return;
            }

            cancelRequested = true;
            status = AiJobStatus.CANCELLED;
            finishedAt = Instant.now();
            running = future;
        }

        if (running != null) {
            running.cancel(true);
        }
    }

    // 초안을 실제로 만들기 시작해요. 완성된 초안이 아니거나 이미 만들었거나 만드는 중이면 막아요.
    public synchronized void beginApply() {
        if (applied) {
            throw new FlowSpaceException(ErrorCode.AI_JOB_ALREADY_APPLIED);
        }

        if (status != AiJobStatus.DONE || applying) {
            throw new FlowSpaceException(ErrorCode.AI_JOB_NOT_READY);
        }

        applying = true;
    }

    public synchronized void finishApply(boolean success) {
        applying = false;
        applied = success;
    }
}
