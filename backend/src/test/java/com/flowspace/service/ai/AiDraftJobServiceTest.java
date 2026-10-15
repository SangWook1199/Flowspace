package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.function.BooleanSupplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.flowspace.config.AiProperties;
import com.flowspace.dto.ai.AiApplyResponse;
import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiJobResponse;
import com.flowspace.dto.ai.AiJobStatus;
import com.flowspace.dto.ai.AiProjectRequest;
import com.flowspace.dto.ai.AiStatusResponse;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceMember;
import com.flowspace.entity.enums.WorkspaceRole;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;

// AI 초안 만들기 입구: 관리자만 시작·조회·반영할 수 있는지, 내 작업만 볼 수 있는지,
// 완성된 초안만 한 번 반영되는지 확인해요. 모델과 반영은 가짜로 바꿔서 시험해요.
@ExtendWith(MockitoExtension.class)
class AiDraftJobServiceTest {

    @Mock
    private AiModelClient modelClient;
    @Mock
    private AiDraftGenerator generator;
    @Mock
    private AiProjectApplyService applyService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private WorkspaceRepository workspaceRepository;
    @Mock
    private WorkspaceMemberRepository workspaceMemberRepository;

    private AiProperties properties;
    private AiDraftJobService service;

    private User me;
    private User other;
    private Workspace workspace;
    private final AiDraft draft = new AiDraft(List.of(), List.of());

    @BeforeEach
    void setUp() {
        properties = new AiProperties();

        service = new AiDraftJobService(properties, modelClient, generator, new AiDraftJobRegistry(properties),
            applyService, userRepository, workspaceRepository, workspaceMemberRepository);

        me = User.builder().userId(1L).email("a@a.com").nickname("관리자").build();
        other = User.builder().userId(2L).email("b@b.com").nickname("다른관리자").build();
        workspace = Workspace.builder().workspaceId(5L).name("w").initials("W").build();

        lenient().when(workspaceRepository.findById(5L)).thenReturn(Optional.of(workspace));
        lenient().when(userRepository.findByEmail("a@a.com")).thenReturn(Optional.of(me));
        lenient().when(userRepository.findByEmail("b@b.com")).thenReturn(Optional.of(other));
    }

    private WorkspaceMember member(User user, WorkspaceRole role) {
        return WorkspaceMember.builder().workspace(workspace).user(user).role(role).build();
    }

    private void memberships(WorkspaceRole myRole) {
        WorkspaceMember mine = member(me, myRole);
        WorkspaceMember others = member(other, WorkspaceRole.ADMIN);

        lenient().when(workspaceMemberRepository.findByWorkspaceAndUser(workspace, me)).thenReturn(Optional.of(mine));
        lenient().when(workspaceMemberRepository.findByWorkspaceAndUser(workspace, other))
            .thenReturn(Optional.of(others));
        lenient().when(workspaceMemberRepository.findByWorkspace(workspace)).thenReturn(List.of(mine, others));
    }

    private AiProjectRequest request(Long... userIds) {
        List<AiProjectRequest.Member> members = java.util.Arrays.stream(userIds)
            .map(id -> new AiProjectRequest.Member(id, "백엔드")).toList();

        return new AiProjectRequest("쇼핑몰", LocalDate.of(2026, 10, 12), LocalDate.of(2026, 12, 6), 2, members, null,
            null, null, null, null, null);
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

    private AiJobResponse startJob() {
        memberships(WorkspaceRole.ADMIN);
        when(modelClient.isAvailable()).thenReturn(true);

        return service.start(5L, request(1L, 2L), "a@a.com");
    }

    @Test
    @DisplayName("기능이 꺼져 있으면 상태에서 쓸 수 없다고 하고 모델을 확인하지 않는다")
    void statusDisabled() {
        properties.setEnabled(false);

        AiStatusResponse status = service.status();

        assertFalse(status.enabled());
        assertFalse(status.available());
        verify(modelClient, never()).isAvailable();
    }

    @Test
    @DisplayName("켜져 있고 모델이 준비돼 있으면 쓸 수 있다고 알려준다")
    void statusAvailable() {
        when(modelClient.isAvailable()).thenReturn(true);

        AiStatusResponse status = service.status();

        assertTrue(status.enabled());
        assertTrue(status.available());
        assertEquals("qwen3.6:27b", status.model());
    }

    @Test
    @DisplayName("기능이 꺼져 있으면 시작할 수 없다")
    void startDisabled() {
        properties.setEnabled(false);

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> service.start(5L, request(1L), "a@a.com"));

        assertEquals(ErrorCode.AI_DISABLED, e.getErrorCode());
    }

    @Test
    @DisplayName("일반 멤버는 시작할 수 없다")
    void startDeniedForMember() {
        memberships(WorkspaceRole.MEMBER);

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> service.start(5L, request(1L), "a@a.com"));

        assertEquals(ErrorCode.ACCESS_DENIED, e.getErrorCode());
        verify(generator, never()).generate(any(), any(), any(), any());
    }

    @Test
    @DisplayName("워크스페이스 멤버가 아닌 사람을 고르면 시작할 수 없다")
    void startWithOutsider() {
        memberships(WorkspaceRole.ADMIN);

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> service.start(5L, request(1L, 99L), "a@a.com"));

        assertEquals(ErrorCode.MEMBER_NOT_FOUND, e.getErrorCode());
    }

    @Test
    @DisplayName("같은 멤버를 두 번 고르면 시작할 수 없다")
    void startWithDuplicate() {
        memberships(WorkspaceRole.ADMIN);

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> service.start(5L, request(1L, 1L), "a@a.com"));

        assertEquals(ErrorCode.AI_DRAFT_INVALID, e.getErrorCode());
    }

    @Test
    @DisplayName("기간이 너무 길면 모델을 부르기 전에 막는다")
    void startWithTooLongPeriod() {
        memberships(WorkspaceRole.ADMIN);

        AiProjectRequest tooLong = new AiProjectRequest("쇼핑몰", LocalDate.of(2026, 10, 12), LocalDate.of(2027, 12, 31),
            1, List.of(new AiProjectRequest.Member(1L, "백엔드")), null, null, null, null, null, null);

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> service.start(5L, tooLong, "a@a.com"));

        assertEquals(ErrorCode.AI_PERIOD_TOO_LONG, e.getErrorCode());
        verify(modelClient, never()).isAvailable();
    }

    @Test
    @DisplayName("모델에 연결할 수 없으면 작업을 만들지 않고 바로 알려준다")
    void startWhenModelDown() {
        memberships(WorkspaceRole.ADMIN);
        when(modelClient.isAvailable()).thenReturn(false);

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> service.start(5L, request(1L, 2L), "a@a.com"));

        assertEquals(ErrorCode.AI_UNAVAILABLE, e.getErrorCode());
        verify(generator, never()).generate(any(), any(), any(), any());
    }

    @Test
    @DisplayName("시작하면 jobId를 받고, 잠시 뒤 조회하면 완성된 초안이 온다")
    void startThenGetDone() throws Exception {
        lenient().when(generator.generate(any(), any(), any(), any())).thenReturn(draft);

        AiJobResponse started = startJob();

        assertNotNull(started.jobId());

        waitUntil(() -> service.get(5L, started.jobId(), "a@a.com").status() == AiJobStatus.DONE);

        AiJobResponse done = service.get(5L, started.jobId(), "a@a.com");

        assertSame(draft, done.draft());
        assertNull(done.error());
        assertTrue(done.message().contains("초안이 완성됐어요"));
    }

    @Test
    @DisplayName("만들기에 실패하면 FAILED와 이유가 오고 초안은 없다")
    void startThenFailed() throws Exception {
        lenient().when(generator.generate(any(), any(), any(), any()))
            .thenThrow(new AiGenerationFailedException("초안을 만들지 못했어요."));

        AiJobResponse started = startJob();

        waitUntil(() -> service.get(5L, started.jobId(), "a@a.com").status() == AiJobStatus.FAILED);

        AiJobResponse failed = service.get(5L, started.jobId(), "a@a.com");

        assertEquals("초안을 만들지 못했어요.", failed.error());
        assertNull(failed.draft());
    }

    @Test
    @DisplayName("작업을 시작한 사람이 아니면 조회할 수 없다")
    void getByOtherUser() throws Exception {
        lenient().when(generator.generate(any(), any(), any(), any())).thenReturn(draft);

        AiJobResponse started = startJob();

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> service.get(5L, started.jobId(), "b@b.com"));

        assertEquals(ErrorCode.AI_JOB_NOT_FOUND, e.getErrorCode());
    }

    @Test
    @DisplayName("없는 jobId나 다른 워크스페이스의 jobId는 찾을 수 없다")
    void getUnknownJob() {
        memberships(WorkspaceRole.ADMIN);

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> service.get(5L, "없는-id", "a@a.com"));

        assertEquals(ErrorCode.AI_JOB_NOT_FOUND, e.getErrorCode());
    }

    @Test
    @DisplayName("완성된 초안을 반영하면 만들어진 결과를 돌려주고, 같은 작업으로 또 반영할 수 없다")
    void applyOnce() throws Exception {
        AiApplyResponse result = new AiApplyResponse(2, 5, 1, List.of(7L, 8L));
        lenient().when(generator.generate(any(), any(), any(), any())).thenReturn(draft);
        when(applyService.apply(5L, draft, "a@a.com")).thenReturn(result);

        AiJobResponse started = startJob();
        waitUntil(() -> service.get(5L, started.jobId(), "a@a.com").status() == AiJobStatus.DONE);

        assertSame(result, service.apply(5L, started.jobId(), draft, "a@a.com"));

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> service.apply(5L, started.jobId(), draft, "a@a.com"));

        assertEquals(ErrorCode.AI_JOB_NOT_FOUND, e.getErrorCode());
        verify(applyService, times(1)).apply(5L, draft, "a@a.com");
    }

    @Test
    @DisplayName("반영이 실패하면 같은 초안으로 다시 시도할 수 있다")
    void applyRetryAfterFailure() throws Exception {
        AiApplyResponse result = new AiApplyResponse(1, 1, 0, List.of(7L));
        lenient().when(generator.generate(any(), any(), any(), any())).thenReturn(draft);
        when(applyService.apply(5L, draft, "a@a.com")).thenThrow(new FlowSpaceException(ErrorCode.ACCESS_DENIED))
            .thenReturn(result);

        AiJobResponse started = startJob();
        waitUntil(() -> service.get(5L, started.jobId(), "a@a.com").status() == AiJobStatus.DONE);

        assertThrows(FlowSpaceException.class, () -> service.apply(5L, started.jobId(), draft, "a@a.com"));

        assertSame(result, service.apply(5L, started.jobId(), draft, "a@a.com"));
    }

    @Test
    @DisplayName("아직 만드는 중이면 반영할 수 없고, 취소하면 CANCELLED가 된다")
    void applyBeforeDoneAndCancel() throws Exception {
        CountDownLatch started = new CountDownLatch(1);

        lenient().when(generator.generate(any(), any(), any(), any())).thenAnswer(invocation -> {
            started.countDown();

            try {
                new CountDownLatch(1).await();
            } catch (InterruptedException e) {
                throw new AiModelException("중단됐어요.");
            }

            return draft;
        });

        AiJobResponse job = startJob();
        started.await();

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> service.apply(5L, job.jobId(), draft, "a@a.com"));

        assertEquals(ErrorCode.AI_JOB_NOT_READY, e.getErrorCode());
        verify(applyService, never()).apply(any(), any(), any());

        service.cancel(5L, job.jobId(), "a@a.com");

        assertEquals(AiJobStatus.CANCELLED, service.get(5L, job.jobId(), "a@a.com").status());
    }

    @Test
    @DisplayName("만드는 중에는 진행 상황이 응답에 담기고, 끝나면 빠진다")
    void progressIsReportedWhileRunning() throws Exception {
        CountDownLatch reported = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        com.flowspace.dto.ai.AiProgressInfo progress = new com.flowspace.dto.ai.AiProgressInfo(42, "WRITING", 2, 3,
            "상품 등록", 5, List.of("상품 등록 API"));

        lenient().when(generator.generate(any(), any(), any(), any())).thenAnswer(invocation -> {
            AiDraftGenerator.Listener listener = invocation.getArgument(3);
            listener.onAttempt(1, 3);
            listener.onProgress(progress);
            reported.countDown();
            finish.await();

            return draft;
        });

        AiJobResponse job = startJob();
        reported.await();

        AiJobResponse running = service.get(5L, job.jobId(), "a@a.com");

        assertEquals(AiJobStatus.RUNNING, running.status());
        assertEquals(progress, running.progress());

        finish.countDown();
        waitUntil(() -> service.get(5L, job.jobId(), "a@a.com").status() == AiJobStatus.DONE);

        assertNull(service.get(5L, job.jobId(), "a@a.com").progress());
    }
}
