package com.flowspace.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import com.flowspace.dto.calendar.CalendarItemResponse;
import com.flowspace.entity.Event;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskAssignee;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.SprintStatus;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.EventRepository;
import com.flowspace.repository.SprintRepository;
import com.flowspace.repository.TaskAssigneeRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CalendarService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;
    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    // 캘린더 조회
    public List<CalendarItemResponse> getCalendar(Long workspaceId, Integer year, Integer month, Long sprintId,
        String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        validateMember(workspace, user);

        YearMonth yearMonth = YearMonth.of(year, month);

        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);

        Sprint targetSprint = resolveSprint(workspace, sprintId);

        List<CalendarItemResponse> result = new ArrayList<>();

        List<Task> tasks = targetSprint == null
            ? taskRepository.findByWorkspaceAndSprintIsNullAndStartDateBetweenOrderByStartDateAscPositionAsc(workspace,
                startDate, endDate)
            : taskRepository.findBySprintAndStartDateBetweenOrderByStartDateAscPositionAsc(targetSprint, startDate,
                endDate);

        tasks.stream().map(task -> {

            List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task);

            return CalendarItemResponse.from(task, assignees);
        }).forEach(result::add);

        List<Event> events = eventRepository.findByWorkspaceAndStartDatetimeBetweenOrderByStartDatetimeAsc(workspace,
            startDateTime, endDateTime);

        events.stream().map(CalendarItemResponse::from).forEach(result::add);

        result.sort(Comparator.comparing(item -> item.startDatetime()));

        return result;
    }

    // 기본 스프린트 결정
    private Sprint resolveSprint(Workspace workspace, Long sprintId) {

        if (sprintId != null) {
            return sprintRepository.findById(sprintId)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));
        }

        return sprintRepository.findFirstByWorkspaceAndStatusOrderByStartDateAsc(workspace, SprintStatus.ACTIVE).or(
            () -> sprintRepository.findFirstByWorkspaceAndStatusOrderByStartDateAsc(workspace, SprintStatus.PLANNING))
            .orElse(null);
    }

    // 워크스페이스 멤버 확인
    private void validateMember(Workspace workspace, User user) {
        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));
    }
}