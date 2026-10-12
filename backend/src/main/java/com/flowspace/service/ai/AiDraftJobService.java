package com.flowspace.service.ai;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.config.AiProperties;
import com.flowspace.dto.ai.AiApplyResponse;
import com.flowspace.dto.ai.AiDraft;
import com.flowspace.dto.ai.AiDraftContext;
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

import lombok.RequiredArgsConstructor;

// AI 프로젝트 자동 구성의 입구예요. 누가 쓸 수 있는지 확인하고, 초안 만들기 작업을 시작·조회·취소하고,
// 사용자가 확인한 초안을 실제로 만드는 일(apply)을 이어줘요.
// 초안을 만드는 동안에는 DB 트랜잭션을 잡지 않아요(모델 호출이 몇 분 걸릴 수 있어서).
@Service
@RequiredArgsConstructor
public class AiDraftJobService {

    private final AiProperties properties;
    private final AiModelClient modelClient;
    private final AiDraftGenerator generator;
    private final AiDraftJobRegistry registry;
    private final AiProjectApplyService applyService;

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    // 화면이 AI 버튼을 보여줄지 정하는 데 써요. 로그인한 누구나 물어볼 수 있어요.
    public AiStatusResponse status() {
        boolean available = properties.isEnabled() && modelClient.isAvailable();

        return new AiStatusResponse(properties.isEnabled(), available, properties.getModel());
    }

    // 초안 만들기를 시작해요. 바로 jobId를 돌려주고, 실제 생성은 뒤에서 돌아요.
    @Transactional(readOnly = true)
    public AiJobResponse start(Long workspaceId, AiProjectRequest request, String email) {

        if (!properties.isEnabled()) {
            throw new FlowSpaceException(ErrorCode.AI_DISABLED);
        }

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));
        User user = requireAdmin(workspace, email);

        // 담당자 후보는 이 워크스페이스 멤버 중 사용자가 고른 사람들이에요. 이름은 DB 값을 써요.
        Map<Long, String> workspaceUsers = new LinkedHashMap<>();

        for (WorkspaceMember member : workspaceMemberRepository.findByWorkspace(workspace)) {
            workspaceUsers.put(member.getUser().getUserId(), member.getUser().getNickname());
        }

        Map<Long, String> nicknames = new LinkedHashMap<>();

        for (AiProjectRequest.Member member : request.members()) {

            if (!workspaceUsers.containsKey(member.userId())) {
                throw new FlowSpaceException(ErrorCode.MEMBER_NOT_FOUND);
            }

            // 같은 사람을 두 번 고르면 역할이 헷갈려서 받지 않아요.
            if (nicknames.put(member.userId(), workspaceUsers.get(member.userId())) != null) {
                throw new FlowSpaceException(ErrorCode.AI_DRAFT_INVALID);
            }
        }

        List<AiDraftContext.FixedEvent> fixedEvents = request.fixedEvents() == null ? List.of()
            : request.fixedEvents().stream().map(e -> new AiDraftContext.FixedEvent(e.title(), e.date())).toList();

        // 기간·길이가 올바른지는 여기서 정해져요(스프린트가 12개를 넘으면 AI_PERIOD_TOO_LONG).
        AiDraftContext context = new AiDraftContext(request.startDate(), request.endDate(), request.sprintWeeks(),
            nicknames.keySet(), fixedEvents);

        if (!modelClient.isAvailable()) {
            throw new FlowSpaceException(ErrorCode.AI_UNAVAILABLE);
        }

        AiDraftJob job = registry.submit(workspaceId, user.getUserId(), running -> generator.generate(request,
            nicknames, context, new AiDraftGenerator.Listener() {

                @Override
                public boolean isCancelled() {
                    return running.isCancelRequested();
                }

                @Override
                public void onAttempt(int attempt, int maxAttempts) {
                    running.onAttempt(attempt, maxAttempts);
                }
            }));

        return toResponse(job);
    }

    @Transactional(readOnly = true)
    public AiJobResponse get(Long workspaceId, String jobId, String email) {
        return toResponse(findOwnedJob(workspaceId, jobId, email));
    }

    @Transactional(readOnly = true)
    public void cancel(Long workspaceId, String jobId, String email) {
        findOwnedJob(workspaceId, jobId, email).cancel();
    }

    // 사용자가 미리보기에서 고친 최종 초안을 실제 스프린트·작업·이벤트로 만들어요. 같은 작업으로는 한 번만 만들 수 있어요.
    public AiApplyResponse apply(Long workspaceId, String jobId, AiDraft draft, String email) {

        AiDraftJob job = findOwnedJob(workspaceId, jobId, email);

        job.beginApply();

        try {
            AiApplyResponse response = applyService.apply(workspaceId, draft, email);

            job.finishApply(true);
            registry.remove(jobId);

            return response;

        } catch (RuntimeException e) {
            job.finishApply(false);
            throw e;
        }
    }

    // 작업을 시작한 본인만, 그것도 아직 관리자 이상일 때만 볼 수 있어요.
    private AiDraftJob findOwnedJob(Long workspaceId, String jobId, String email) {

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));
        User user = requireAdmin(workspace, email);

        AiDraftJob job = registry.find(jobId);

        if (job == null || !job.workspaceId().equals(workspaceId) || !job.ownerUserId().equals(user.getUserId())) {
            throw new FlowSpaceException(ErrorCode.AI_JOB_NOT_FOUND);
        }

        return job;
    }

    private User requireAdmin(Workspace workspace, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        WorkspaceMember me = workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        if (!me.getRole().isAtLeast(WorkspaceRole.ADMIN)) {
            throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
        }

        return user;
    }

    private AiJobResponse toResponse(AiDraftJob job) {

        AiJobStatus status = job.status();
        long elapsed = Duration.between(job.createdAt(), status == AiJobStatus.DONE || status == AiJobStatus.FAILED
            || status == AiJobStatus.CANCELLED ? job.finishedAt() : Instant.now()).toSeconds();

        String message = switch (status) {
            case QUEUED -> "차례를 기다리고 있어요.";
            case RUNNING -> job.attempt() > 1
                ? "초안을 다시 만들고 있어요(" + job.attempt() + "/" + job.maxAttempts() + "번째 시도)."
                : "스프린트와 작업을 만들고 있어요.";
            case DONE -> "초안이 완성됐어요. 확인하고 고친 뒤에 만들기를 눌러 주세요.";
            case FAILED -> job.error();
            case CANCELLED -> "취소했어요.";
        };

        return new AiJobResponse(job.jobId(), status, job.attempt(), job.maxAttempts(), message,
            status == AiJobStatus.DONE ? job.draft() : null, status == AiJobStatus.FAILED ? job.error() : null,
            Math.max(0, elapsed));
    }
}
