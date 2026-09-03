package com.flowspace.service;

import java.time.LocalDate;
import java.util.List;

import com.flowspace.dto.sprint.SprintCreateRequest;
import com.flowspace.dto.sprint.SprintResponse;
import com.flowspace.dto.sprint.SprintStatusUpdateRequest;
import com.flowspace.dto.sprint.SprintUpdateRequest;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.SprintRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SprintService {

    private final SprintRepository sprintRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    // 스프린트 생성
    public SprintResponse createSprint(Long workspaceId, SprintCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        validateMember(workspace, user);
        validateSprintDate(request.startDate(), request.endDate());

        Sprint sprint = Sprint.builder().workspace(workspace).createdBy(user).name(request.name()).goal(request.goal())
            .description(request.description()).color(request.color()).startDate(request.startDate())
            .endDate(request.endDate()).status(request.status()).build();

        sprintRepository.save(sprint);

        return SprintResponse.from(sprint);
    }

    // 워크스페이스 스프린트 목록 조회
    @Transactional(readOnly = true)
    public List<SprintResponse> getSprints(Long workspaceId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        validateMember(workspace, user);

        return sprintRepository.findByWorkspaceOrderByStartDateDesc(workspace).stream().map(SprintResponse::from)
            .toList();
    }

    // 스프린트 단건 조회
    @Transactional(readOnly = true)
    public SprintResponse getSprint(Long sprintId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        validateMember(sprint.getWorkspace(), user);

        return SprintResponse.from(sprint);
    }

    // 스프린트 수정
    public SprintResponse updateSprint(Long sprintId, SprintUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        validateMember(sprint.getWorkspace(), user);
        validateSprintDate(request.startDate(), request.endDate());

        sprint.update(request.name(), request.goal(), request.description(), request.color(), request.startDate(),
            request.endDate());

        return SprintResponse.from(sprint);
    }

    // 스프린트 상태 변경
    public SprintResponse updateStatus(Long sprintId, SprintStatusUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        validateMember(sprint.getWorkspace(), user);

        sprint.updateStatus(request.status());

        return SprintResponse.from(sprint);
    }

    // 스프린트 삭제
    public void deleteSprint(Long sprintId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        validateMember(sprint.getWorkspace(), user);

        sprintRepository.delete(sprint);
    }

    // 워크스페이스 멤버 확인
    private void validateMember(Workspace workspace, User user) {
        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));
    }

    // 스프린트 날짜 검증
    private void validateSprintDate(LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new FlowSpaceException(ErrorCode.INVALID_SPRINT_DATE);
        }
    }
}