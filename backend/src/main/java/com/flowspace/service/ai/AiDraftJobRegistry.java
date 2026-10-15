package com.flowspace.service.ai;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.flowspace.config.AiProperties;
import com.flowspace.dto.ai.AiDraft;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

// 초안 만들기 작업을 서버 메모리에 보관하고, 전용 스레드에서 한 번에 정해진 개수만 돌려요.
// 초안은 "만들기"를 누르기 전까지만 필요한 임시 데이터라 DB에 저장하지 않고, 일정 시간이 지나면 지워요.
// (서버가 여러 대로 늘어나면 이 보관소를 DB나 Redis로 바꿔야 해요.)
@Slf4j
@Component
public class AiDraftJobRegistry {

    // 작업이 실제로 하는 일이에요. 결과 초안을 돌려주거나 예외를 던져요.
    @FunctionalInterface
    public interface JobTask {
        AiDraft run(AiDraftJob job);
    }

    private final AiProperties properties;
    private final Map<String, AiDraftJob> jobs = new ConcurrentHashMap<>();
    private final ThreadPoolExecutor executor;

    public AiDraftJobRegistry(AiProperties properties) {
        this.properties = properties;

        AtomicInteger counter = new AtomicInteger();
        int threads = Math.max(1, properties.getMaxConcurrentJobs());

        // 스레드가 다 차면 대기열에 쌓고, 대기열도 차면 거절해요.
        this.executor = new ThreadPoolExecutor(threads, threads, 0L, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(Math.max(1, properties.getMaxQueuedJobs())), runnable -> {
                Thread thread = new Thread(runnable, "ai-job-" + counter.incrementAndGet());
                thread.setDaemon(true);
                return thread;
            });
    }

    // 워크스페이스마다 동시에 하나만 만들 수 있어요. 겹치는 요청이 와도 하나만 통과하도록 잠가요.
    public synchronized AiDraftJob submit(Long workspaceId, Long ownerUserId, JobTask task) {

        boolean busy = jobs.values().stream().anyMatch(j -> j.workspaceId().equals(workspaceId) && j.isActive());

        if (busy) {
            throw new FlowSpaceException(ErrorCode.AI_JOB_IN_PROGRESS);
        }

        AiDraftJob job = new AiDraftJob(UUID.randomUUID().toString(), workspaceId, ownerUserId);

        // 취소돼서 대기열에 남은 빈 자리를 비워 둬요.
        executor.purge();

        try {
            job.setFuture(executor.submit(() -> run(job, task)));
        } catch (RejectedExecutionException e) {
            throw new FlowSpaceException(ErrorCode.AI_BUSY);
        }

        jobs.put(job.jobId(), job);

        return job;
    }

    public AiDraftJob find(String jobId) {
        return jobId == null ? null : jobs.get(jobId);
    }

    public void remove(String jobId) {
        jobs.remove(jobId);
    }

    private void run(AiDraftJob job, JobTask task) {

        if (job.isCancelRequested()) {
            return;
        }

        job.markRunning();

        try {
            job.complete(task.run(job));

        } catch (AiJobCancelledException e) {
            job.cancel();
        } catch (AiGenerationFailedException | AiModelException e) {
            job.fail(e.getMessage());
        } catch (RuntimeException e) {
            log.error("AI 초안 만들기 중 예상하지 못한 오류가 났어요. jobId={}", job.jobId(), e);
            job.fail("초안을 만드는 중 문제가 생겼어요. 잠시 뒤에 다시 시도해 주세요.");
        }
    }

    // 끝난 지 오래된 작업을 지워요(만들기를 누르지 않고 떠난 초안이 메모리에 쌓이지 않게).
    @Scheduled(fixedDelay = 300_000)
    public void cleanup() {

        Instant limit = Instant.now().minus(Duration.ofMinutes(properties.getDraftTtlMinutes()));

        jobs.values().removeIf(job -> !job.isActive() && job.finishedAt() != null && job.finishedAt().isBefore(limit));
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }
}
