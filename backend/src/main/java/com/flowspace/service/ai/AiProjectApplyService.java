package com.flowspace.service.ai;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.dto.ai.AiApplyResponse;
import com.flowspace.dto.ai.AiDraft;
import com.flowspace.entity.Event;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskAssignee;
import com.flowspace.entity.TaskStatus;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceMember;
import com.flowspace.entity.WorkspaceTaskStatus;
import com.flowspace.entity.enums.ActivityTargetType;
import com.flowspace.entity.enums.ActivityType;
import com.flowspace.entity.enums.SprintStatus;
import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;
import com.flowspace.entity.enums.WorkspaceRole;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.EventRepository;
import com.flowspace.repository.SprintRepository;
import com.flowspace.repository.TaskAssigneeRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import com.flowspace.repository.WorkspaceTaskStatusRepository;
import com.flowspace.service.ActivityService;

import lombok.RequiredArgsConstructor;

// 사용자가 확인한 AI 초안을 스프린트·작업·이벤트로 한 번에 만들어요.
// 하나의 트랜잭션이라 중간에 실패하면 아무것도 남지 않아요.
// 작업 담당자에게 보내는 알림은 만든 개수만큼 쏟아지지 않게 보내지 않아요.
@Service
@RequiredArgsConstructor
@Transactional
public class AiProjectApplyService {

    // 스프린트마다 돌려가며 쓰는 색(흰색은 스프린트 색에서 뺐어요).
    private static final List<WorkspaceColor> SPRINT_COLORS = List.of(WorkspaceColor.BLUE, WorkspaceColor.GREEN,
        WorkspaceColor.ORANGE, WorkspaceColor.PURPLE, WorkspaceColor.PINK, WorkspaceColor.RED);

    private static final LocalTime EVENT_START = LocalTime.of(10, 0);
    private static final LocalTime EVENT_END = LocalTime.of(11, 0);

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceTaskStatusRepository workspaceTaskStatusRepository;
    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;
    private final EventRepository eventRepository;

    private final ActivityService activityService;
    private final AiDraftValidator validator;

    public AiApplyResponse apply(Long workspaceId, AiDraft draft, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        WorkspaceMember me = workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        // 한꺼번에 많이 만드는 기능이라 관리자 이상만 쓸 수 있어요.
        if (!me.getRole().isAtLeast(WorkspaceRole.ADMIN)) {
            throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
        }

        // 담당자로 쓸 수 있는 사람은 이 워크스페이스 멤버뿐이에요.
        Map<Long, User> members = new HashMap<>();

        for (WorkspaceMember member : workspaceMemberRepository.findByWorkspace(workspace)) {
            members.put(member.getUser().getUserId(), member.getUser());
        }

        validator.validateForApply(draft, members.keySet());

        TaskStatus status = findStartStatus(workspace);

        // 작업 번호와 칸반 위치는 기존 작업 뒤에서 이어서 매겨요.
        int taskNumber = taskRepository.findMaxTaskNumber(workspace);
        int position = taskRepository.findByWorkspaceAndStatusOrderByPositionAsc(workspace, status).size();

        List<Long> sprintIds = new ArrayList<>();
        int taskCount = 0;
        int index = 0;

        for (AiDraft.Sprint draftSprint : draft.sprints()) {

            Sprint sprint = sprintRepository.save(Sprint.builder().workspace(workspace).createdBy(user)
                .name(draftSprint.name()).goal(draftSprint.goal())
                .color(SPRINT_COLORS.get(index % SPRINT_COLORS.size())).startDate(draftSprint.startDate())
                .endDate(draftSprint.endDate()).status(SprintStatus.PLANNING).build());

            sprintIds.add(sprint.getSprintId());
            index++;

            for (AiDraft.Task draftTask : draftSprint.tasks()) {

                taskNumber++;

                Task task = taskRepository.save(Task.builder().workspace(workspace).sprint(sprint).createdBy(user)
                    .status(status).taskNumber(taskNumber).position(BigDecimal.valueOf(position))
                    .title(draftTask.title()).description(draftTask.description()).startDate(draftTask.startDate())
                    .endDate(draftTask.endDate()).priority(draftTask.priority()).build());

                position++;
                taskCount++;

                if (draftTask.assigneeUserId() != null) {
                    taskAssigneeRepository
                        .save(TaskAssignee.builder().task(task).user(members.get(draftTask.assigneeUserId())).build());
                }
            }

            // 스프린트 생성 기록은 남겨요(작업은 개수가 많아서 하나씩 기록하지 않아요).
            activityService.log(workspace, user, ActivityType.SPRINT_CREATED, ActivityTargetType.SPRINT,
                sprint.getSprintId());
        }

        List<AiDraft.Event> draftEvents = draft.events() == null ? List.of() : draft.events();

        for (AiDraft.Event draftEvent : draftEvents) {
            eventRepository.save(Event.builder().workspace(workspace).createdBy(user).title(draftEvent.title())
                .color(WorkspaceColor.PURPLE).startDatetime(draftEvent.date().atTime(EVENT_START))
                .endDatetime(draftEvent.date().atTime(EVENT_END)).build());
        }

        return new AiApplyResponse(sprintIds.size(), taskCount, draftEvents.size(), sprintIds);
    }

    // 새 작업이 놓일 상태예요. 할 일(TODO) 분류 중 가장 앞의 것을 쓰고, 없으면 맨 앞 상태를 써요.
    private TaskStatus findStartStatus(Workspace workspace) {

        List<WorkspaceTaskStatus> statuses = workspaceTaskStatusRepository.findByWorkspaceOrderByPositionAsc(workspace);

        return statuses.stream().map(WorkspaceTaskStatus::getTaskStatus)
            .filter(status -> status.getCategory() == TaskStatusCategory.TODO).findFirst()
            .or(() -> statuses.stream().map(WorkspaceTaskStatus::getTaskStatus).findFirst())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.INVALID_TASK_STATUS));
    }
}
