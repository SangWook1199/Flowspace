package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.function.BooleanSupplier;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.config.AiProperties;
import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiJobStatus;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;

class AiDraftJobRegistryTest {

    private final AiDraft draft = new AiDraft(List.of(), List.of());

    private AiDraftJobRegistry registry(int concurrent, int queued, int ttlMinutes) {
        AiProperties properties = new AiProperties();
        properties.setMaxConcurrentJobs(concurrent);
        properties.setMaxQueuedJobs(queued);
        properties.setDraftTtlMinutes(ttlMinutes);

        return new AiDraftJobRegistry(properties);
    }

    private static void waitUntil(BooleanSupplier condition) throws InterruptedException {

        long deadline = System.currentTimeMillis() + 5000;

        while (!condition.getAsBoolean()) {
            if (System.currentTimeMillis() > deadline) {
                throw new AssertionError("시간 안에 조건이 맞지 않았어요.");
            }

            Thread.sleep(5);
        }
    }

    // 풀어 주기 전까지 멈춰 있는 작업이에요. 스레드를 깨우면(취소하면) AiModelException으로 끝나요.
    private static AiDraftJobRegistry.JobTask blocking(CountDownLatch release, CountDownLatch started, AiDraft result) {
        return job -> {
            started.countDown();

            try {
                release.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AiModelException("중단됐어요.");
            }

            return result;
        };
    }

    @Test
    @DisplayName("작업을 맡기면 뒤에서 돌아 DONE이 되고 초안이 남는다")
    void runsToDone() throws Exception {
        AiDraftJobRegistry registry = registry(1, 3, 30);

        AiDraftJob job = registry.submit(5L, 1L, running -> {
            running.onAttempt(1, 3);
            return draft;
        });

        waitUntil(() -> job.status() == AiJobStatus.DONE);

        assertSame(draft, job.draft());
        assertNotNull(job.finishedAt());
        assertSame(job, registry.find(job.jobId()));
        assertEquals(1, job.attempt());
        assertEquals(3, job.maxAttempts());
    }

    @Test
    @DisplayName("생성 실패·모델 문제는 메시지를 담아 FAILED가 되고, 예상 못 한 오류는 일반 메시지가 된다")
    void failures() throws Exception {
        AiDraftJobRegistry registry = registry(1, 3, 30);

        AiDraftJob failed = registry.submit(1L, 1L, running -> {
            throw new AiGenerationFailedException("초안을 만들지 못했어요.");
        });
        waitUntil(() -> failed.status() == AiJobStatus.FAILED);
        assertEquals("초안을 만들지 못했어요.", failed.error());

        AiDraftJob modelDown = registry.submit(2L, 1L, running -> {
            throw new AiModelException("연결할 수 없어요.");
        });
        waitUntil(() -> modelDown.status() == AiJobStatus.FAILED);
        assertEquals("연결할 수 없어요.", modelDown.error());

        AiDraftJob unexpected = registry.submit(3L, 1L, running -> {
            throw new IllegalStateException("내부 오류 상세");
        });
        waitUntil(() -> unexpected.status() == AiJobStatus.FAILED);
        assertTrue(unexpected.error().contains("문제가 생겼어요"));
        assertTrue(!unexpected.error().contains("내부 오류"));
    }

    @Test
    @DisplayName("같은 워크스페이스에서는 끝나기 전에 또 시작할 수 없고, 끝나면 다시 시작할 수 있다")
    void oneActiveJobPerWorkspace() throws Exception {
        AiDraftJobRegistry registry = registry(2, 3, 30);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch started = new CountDownLatch(1);

        AiDraftJob first = registry.submit(5L, 1L, blocking(release, started, draft));
        started.await();

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> registry.submit(5L, 1L, running -> draft));

        assertEquals(ErrorCode.AI_JOB_IN_PROGRESS, e.getErrorCode());

        // 다른 워크스페이스는 괜찮아요.
        AiDraftJob other = registry.submit(6L, 2L, running -> draft);
        waitUntil(() -> other.status() == AiJobStatus.DONE);

        release.countDown();
        waitUntil(() -> first.status() == AiJobStatus.DONE);

        AiDraftJob again = registry.submit(5L, 1L, running -> draft);
        waitUntil(() -> again.status() == AiJobStatus.DONE);
    }

    @Test
    @DisplayName("스레드와 대기열이 모두 차면 바쁘다고 거절한다")
    void rejectsWhenFull() throws Exception {
        AiDraftJobRegistry registry = registry(1, 1, 30);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch started = new CountDownLatch(1);

        registry.submit(1L, 1L, blocking(release, started, draft));
        started.await();

        AiDraftJob queued = registry.submit(2L, 1L, running -> draft);
        assertEquals(AiJobStatus.QUEUED, queued.status());

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> registry.submit(3L, 1L, running -> draft));

        assertEquals(ErrorCode.AI_BUSY, e.getErrorCode());

        release.countDown();
        waitUntil(() -> queued.status() == AiJobStatus.DONE);
    }

    @Test
    @DisplayName("진행 중인 작업을 취소하면 CANCELLED로 남고, 늦게 끝난 결과는 받지 않는다")
    void cancelRunning() throws Exception {
        AiDraftJobRegistry registry = registry(1, 3, 30);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch started = new CountDownLatch(1);

        AiDraftJob job = registry.submit(5L, 1L, blocking(release, started, draft));
        started.await();

        job.cancel();

        assertEquals(AiJobStatus.CANCELLED, job.status());
        assertTrue(job.isCancelRequested());

        // 스레드가 깨어나 끝난 뒤에도 상태는 그대로예요.
        Thread.sleep(100);
        assertEquals(AiJobStatus.CANCELLED, job.status());
        assertNull(job.draft());
        assertNull(job.error());

        // 취소된 작업은 더 이상 진행 중이 아니라서 같은 워크스페이스에서 새로 시작할 수 있어요.
        AiDraftJob next = registry.submit(5L, 1L, running -> draft);
        waitUntil(() -> next.status() == AiJobStatus.DONE);
    }

    @Test
    @DisplayName("이미 끝난 작업은 취소해도 그대로다")
    void cancelFinished() throws Exception {
        AiDraftJobRegistry registry = registry(1, 3, 30);

        AiDraftJob job = registry.submit(5L, 1L, running -> draft);
        waitUntil(() -> job.status() == AiJobStatus.DONE);

        job.cancel();

        assertEquals(AiJobStatus.DONE, job.status());
        assertSame(draft, job.draft());
    }

    @Test
    @DisplayName("보관 시간이 지난 끝난 작업만 지우고, 진행 중인 작업은 남긴다")
    void cleanup() throws Exception {
        AiDraftJobRegistry registry = registry(2, 3, 0);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch started = new CountDownLatch(1);

        AiDraftJob finished = registry.submit(1L, 1L, running -> draft);
        waitUntil(() -> finished.status() == AiJobStatus.DONE);

        AiDraftJob active = registry.submit(2L, 1L, blocking(release, started, draft));
        started.await();

        Thread.sleep(10);
        registry.cleanup();

        assertNull(registry.find(finished.jobId()));
        assertSame(active, registry.find(active.jobId()));

        release.countDown();
    }

    @Test
    @DisplayName("만들기(apply)는 완성된 초안에만, 성공하면 한 번만 할 수 있다")
    void applyStates() throws Exception {
        AiDraftJob job = new AiDraftJob("j1", 5L, 1L);

        assertEquals(ErrorCode.AI_JOB_NOT_READY,
            assertThrows(FlowSpaceException.class, job::beginApply).getErrorCode());

        job.complete(draft);
        job.beginApply();

        // 만드는 중에 또 누르면 막아요.
        assertEquals(ErrorCode.AI_JOB_NOT_READY,
            assertThrows(FlowSpaceException.class, job::beginApply).getErrorCode());

        // 실패하면 다시 시도할 수 있어요.
        job.finishApply(false);
        job.beginApply();
        job.finishApply(true);

        assertEquals(ErrorCode.AI_JOB_ALREADY_APPLIED,
            assertThrows(FlowSpaceException.class, job::beginApply).getErrorCode());
    }
}
