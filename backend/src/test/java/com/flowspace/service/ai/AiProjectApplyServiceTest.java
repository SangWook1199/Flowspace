package com.flowspace.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.flowspace.dto.ai.AiApplyResponse;
import com.flowspace.dto.ai.AiDraft;
import com.flowspace.entity.Event;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.SubTask;
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
import com.flowspace.entity.enums.TaskPriority;
import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;
import com.flowspace.entity.enums.WorkspaceRole;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.EventRepository;
import com.flowspace.repository.SprintRepository;
import com.flowspace.repository.SubTaskRepository;
import com.flowspace.repository.TaskAssigneeRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import com.flowspace.repository.WorkspaceTaskStatusRepository;
import com.flowspace.service.ActivityService;

// AI 초안 만들기: 관리자만 쓸 수 있는지, 스프린트·작업·이벤트가 올바르게 이어서 만들어지는지,
// 잘못된 초안은 아무것도 저장하지 않는지 확인해요.
@ExtendWith(MockitoExtension.class)
class AiProjectApplyServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private WorkspaceRepository workspaceRepository;
    @Mock
    private WorkspaceMemberRepository workspaceMemberRepository;
    @Mock
    private WorkspaceTaskStatusRepository workspaceTaskStatusRepository;
    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private TaskAssigneeRepository taskAssigneeRepository;
    @Mock
    private SubTaskRepository subTaskRepository;
    @Mock
    private EventRepository eventRepository;
    @Mock
    private ActivityService activityService;
    @Spy
    private AiDraftValidator validator = new AiDraftValidator();

    @InjectMocks
    private AiProjectApplyService service;

    private static final LocalDate START = LocalDate.of(2026, 10, 12);

    private User me;
    private User other;
    private Workspace workspace;
    private TaskStatus todo;

    @BeforeEach
    void setUp() {
        me = User.builder().userId(1L).email("a@a.com").nickname("a").build();
        other = User.builder().userId(2L).email("b@b.com").nickname("b").build();
        workspace = Workspace.builder().workspaceId(5L).name("w").initials("W").build();
        todo = TaskStatus.builder().statusId(10L).name("TODO").category(TaskStatusCategory.TODO).build();

        when(userRepository.findByEmail("a@a.com")).thenReturn(Optional.of(me));
        when(workspaceRepository.findById(5L)).thenReturn(Optional.of(workspace));
    }

    private WorkspaceMember member(User user, WorkspaceRole role) {
        return WorkspaceMember.builder().workspace(workspace).user(user).role(role).build();
    }

    private void myRole(WorkspaceRole role) {
        when(workspaceMemberRepository.findByWorkspaceAndUser(workspace, me))
            .thenReturn(Optional.of(member(me, role)));
    }

    private void workspaceMembers(User... users) {
        when(workspaceMemberRepository.findByWorkspace(workspace))
            .thenReturn(java.util.Arrays.stream(users).map(u -> member(u, WorkspaceRole.MEMBER)).toList());
    }

    private void statuses(TaskStatus... statuses) {
        int[] position = { 0 };

        when(workspaceTaskStatusRepository.findByWorkspaceOrderByPositionAsc(workspace))
            .thenReturn(java.util.Arrays.stream(statuses).map(s -> WorkspaceTaskStatus.builder().workspace(workspace)
                .taskStatus(s).position(position[0]++).build()).toList());
    }

    private AiDraft.Task draftTask(String title, Long assignee, int dayOffset) {
        return new AiDraft.Task(title, "설명", TaskPriority.HIGH, assignee, START.plusDays(dayOffset),
            START.plusDays(dayOffset + 1));
    }

    // 스프린트 2개(작업 2개 + 1개), 이벤트 1개
    private AiDraft draft() {
        return new AiDraft(
            List.of(
                new AiDraft.Sprint("기획", "목표1", START, START.plusDays(13),
                    List.of(draftTask("정의서 쓰기", 1L, 0), draftTask("담당 없는 작업 하기", null, 1))),
                new AiDraft.Sprint("개발", null, START.plusDays(14), START.plusDays(27),
                    List.of(draftTask("API 구현하기", 2L, 14)))),
            List.of(new AiDraft.Event("스프린트 리뷰", START.plusDays(11))));
    }

    @Test
    @DisplayName("관리자는 초안으로 스프린트·작업·이벤트를 한 번에 만든다")
    void adminAppliesDraft() {
        myRole(WorkspaceRole.ADMIN);
        workspaceMembers(me, other);
        statuses(todo);

        when(taskRepository.findMaxTaskNumber(workspace)).thenReturn(7);
        when(taskRepository.findByWorkspaceAndStatusOrderByPositionAsc(workspace, todo)).thenReturn(List.of());

        AtomicLong sprintId = new AtomicLong(100);
        when(sprintRepository.save(any(Sprint.class))).thenAnswer(invocation -> {
            Sprint sprint = invocation.getArgument(0);
            ReflectionTestUtils.setField(sprint, "sprintId", sprintId.getAndIncrement());
            return sprint;
        });
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AiApplyResponse response = service.apply(5L, draft(), "a@a.com");

        assertEquals(2, response.sprintCount());
        assertEquals(3, response.taskCount());
        assertEquals(1, response.eventCount());
        assertEquals(List.of(100L, 101L), response.sprintIds());

        // 스프린트: 계획 중 상태로, 색은 돌려가며
        ArgumentCaptor<Sprint> sprints = ArgumentCaptor.forClass(Sprint.class);
        verify(sprintRepository, times(2)).save(sprints.capture());
        assertEquals("기획", sprints.getAllValues().get(0).getName());
        assertEquals(SprintStatus.PLANNING, sprints.getAllValues().get(0).getStatus());
        assertEquals(WorkspaceColor.BLUE, sprints.getAllValues().get(0).getColor());
        assertEquals(WorkspaceColor.GREEN, sprints.getAllValues().get(1).getColor());

        // 작업: 기존 번호(7) 뒤에서 이어지고, 칸반 위치도 차례대로, 모두 TODO 상태
        ArgumentCaptor<Task> tasks = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository, times(3)).save(tasks.capture());
        List<Task> savedTasks = tasks.getAllValues();
        assertEquals(List.of(8, 9, 10), savedTasks.stream().map(Task::getTaskNumber).toList());
        assertEquals(List.of(BigDecimal.valueOf(0), BigDecimal.valueOf(1), BigDecimal.valueOf(2)),
            savedTasks.stream().map(Task::getPosition).toList());
        assertSame(todo, savedTasks.get(0).getStatus());
        assertSame(sprints.getAllValues().get(0), savedTasks.get(0).getSprint());
        assertSame(sprints.getAllValues().get(1), savedTasks.get(2).getSprint());
        assertEquals(TaskPriority.HIGH, savedTasks.get(0).getPriority());

        // 담당자는 담당이 있는 작업(2개)에만 저장
        ArgumentCaptor<TaskAssignee> assignees = ArgumentCaptor.forClass(TaskAssignee.class);
        verify(taskAssigneeRepository, times(2)).save(assignees.capture());
        assertSame(me, assignees.getAllValues().get(0).getUser());
        assertSame(other, assignees.getAllValues().get(1).getUser());

        // 이벤트: 그날 10시~11시
        ArgumentCaptor<Event> events = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository).save(events.capture());
        assertEquals("스프린트 리뷰", events.getValue().getTitle());
        assertEquals(LocalDateTime.of(2026, 10, 23, 10, 0), events.getValue().getStartDatetime());
        assertEquals(LocalDateTime.of(2026, 10, 23, 11, 0), events.getValue().getEndDatetime());

        // 활동 기록은 스프린트마다 하나씩
        verify(activityService).log(eq(workspace), eq(me), eq(ActivityType.SPRINT_CREATED),
            eq(ActivityTargetType.SPRINT), eq(100L));
        verify(activityService).log(eq(workspace), eq(me), eq(ActivityType.SPRINT_CREATED),
            eq(ActivityTargetType.SPRINT), eq(101L));
    }

    @Test
    @DisplayName("할 일(TODO) 분류가 있으면 앞에 다른 상태가 있어도 TODO에 놓는다")
    void prefersTodoCategory() {
        TaskStatus inProgress = TaskStatus.builder().statusId(11L).name("진행").category(TaskStatusCategory.IN_PROGRESS)
            .build();

        myRole(WorkspaceRole.OWNER);
        workspaceMembers(me, other);
        statuses(inProgress, todo);

        when(taskRepository.findMaxTaskNumber(workspace)).thenReturn(0);
        when(taskRepository.findByWorkspaceAndStatusOrderByPositionAsc(workspace, todo)).thenReturn(List.of());
        when(sprintRepository.save(any(Sprint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.apply(5L, draft(), "a@a.com");

        ArgumentCaptor<Task> tasks = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository, times(3)).save(tasks.capture());
        assertSame(todo, tasks.getAllValues().get(0).getStatus());
    }

    @Test
    @DisplayName("일반 멤버는 AI 초안을 만들 수 없다")
    void memberCannotApply() {
        myRole(WorkspaceRole.MEMBER);

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> service.apply(5L, draft(), "a@a.com"));

        assertEquals(ErrorCode.ACCESS_DENIED, e.getErrorCode());
        verify(sprintRepository, never()).save(any());
        verify(taskRepository, never()).save(any());
    }

    @Test
    @DisplayName("워크스페이스 멤버가 아니면 만들 수 없다")
    void nonMemberCannotApply() {
        when(workspaceMemberRepository.findByWorkspaceAndUser(workspace, me)).thenReturn(Optional.empty());

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> service.apply(5L, draft(), "a@a.com"));

        assertEquals(ErrorCode.ACCESS_DENIED, e.getErrorCode());
        verify(sprintRepository, never()).save(any());
    }

    @Test
    @DisplayName("멤버가 아닌 사람을 담당자로 지정한 초안은 아무것도 만들지 않는다")
    void outsiderAssigneeSavesNothing() {
        myRole(WorkspaceRole.ADMIN);
        // 담당자 2번이 멤버 목록에 없음
        workspaceMembers(me);

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> service.apply(5L, draft(), "a@a.com"));

        assertEquals(ErrorCode.ACCESS_DENIED, e.getErrorCode());
        verify(sprintRepository, never()).save(any());
        verify(taskRepository, never()).save(any());
        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("작업 상태가 하나도 없으면 만들지 않는다")
    void noStatusSavesNothing() {
        myRole(WorkspaceRole.ADMIN);
        workspaceMembers(me, other);
        when(workspaceTaskStatusRepository.findByWorkspaceOrderByPositionAsc(workspace)).thenReturn(List.of());

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> service.apply(5L, draft(), "a@a.com"));

        assertEquals(ErrorCode.INVALID_TASK_STATUS, e.getErrorCode());
        verify(sprintRepository, never()).save(any());
    }

    @Test
    @DisplayName("작업의 하위 작업은 적은 순서대로, 미완료·담당자 없이 저장한다")
    void savesSubtasksInOrder() {
        myRole(WorkspaceRole.ADMIN);
        workspaceMembers(me, other);
        statuses(todo);

        when(taskRepository.findMaxTaskNumber(workspace)).thenReturn(0);
        when(taskRepository.findByWorkspaceAndStatusOrderByPositionAsc(workspace, todo)).thenReturn(List.of());
        when(sprintRepository.save(any(Sprint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AiDraft draft = new AiDraft(
            List.of(new AiDraft.Sprint("개발", null, START, START.plusDays(13),
                List.of(new AiDraft.Task("회원가입 화면 구현", "설명", TaskPriority.HIGH, 1L, START, START.plusDays(1),
                    List.of("회원가입 화면 구성", " 회원가입 API 연결 ")),
                    draftTask("하위 작업 없는 작업", null, 3)))),
            List.of());

        service.apply(5L, draft, "a@a.com");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<SubTask>> saved = ArgumentCaptor.forClass(List.class);
        // 하위 작업이 있는 작업(1개)에서만 저장해요.
        verify(subTaskRepository, times(1)).saveAll(saved.capture());

        List<SubTask> subtasks = saved.getValue();
        assertEquals(2, subtasks.size());
        assertEquals("회원가입 화면 구성", subtasks.get(0).getContent());
        assertEquals("회원가입 API 연결", subtasks.get(1).getContent());
        assertEquals(List.of(0, 1), subtasks.stream().map(SubTask::getPosition).toList());
        assertEquals(List.of(false, false), subtasks.stream().map(SubTask::getIsCompleted).toList());
        assertEquals("회원가입 화면 구현", subtasks.get(0).getTask().getTitle());
    }
}
