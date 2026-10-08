package com.flowspace.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    private static final int MIN_YEAR = 2000;
    private static final int MAX_YEAR = 2100;

    // 캘린더 조회
    public List<CalendarItemResponse> getCalendar(Long workspaceId, Integer year, Integer month, Long sprintId,
        String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        validateMember(workspace, user);

        // 달·연도가 이상하면 500 대신 400으로 알려요.
        if (year == null || month == null || month < 1 || month > 12 || year < MIN_YEAR || year > MAX_YEAR) {
            throw new FlowSpaceException(ErrorCode.INVALID_CALENDAR_RANGE);
        }

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

        // 담당자는 작업마다 따로 읽지 않고 한 번에 읽어서 나눠 담아요.
        Map<Long, List<TaskAssignee>> assigneesByTask = new HashMap<>();

        if (!tasks.isEmpty()) {
            for (TaskAssignee assignee : taskAssigneeRepository.findByTasks(tasks)) {
                assigneesByTask.computeIfAbsent(assignee.getTask().getTaskId(), key -> new ArrayList<>())
                    .add(assignee);
            }
        }

        tasks.stream()
            .map(task -> CalendarItemResponse.from(task, assigneesByTask.getOrDefault(task.getTaskId(), List.of())))
            .forEach(result::add);

        List<Event> events = eventRepository.findByWorkspaceAndStartDatetimeBetweenOrderByStartDatetimeAsc(workspace,
            startDateTime, endDateTime);

        events.stream().map(CalendarItemResponse::from).forEach(result::add);

        result.sort(Comparator.comparing(item -> item.startDatetime()));

        return result;
    }

    // 기본 스프린트 결정
    private Sprint resolveSprint(Workspace workspace, Long sprintId) {

        if (sprintId != null) {
            Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

            // 다른 워크스페이스의 스프린트로는 조회할 수 없어요.
            if (!sprint.getWorkspace().getWorkspaceId().equals(workspace.getWorkspaceId())) {
                throw new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND);
            }

            return sprint;
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