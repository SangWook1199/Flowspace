package com.flowspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.flowspace.dto.sprint.SprintStatusUpdateRequest;
import com.flowspace.entity.Page;
import com.flowspace.entity.Retrospective;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskStatus;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceMember;
import com.flowspace.entity.enums.ActivityTargetType;
import com.flowspace.entity.enums.ActivityType;
import com.flowspace.entity.enums.SprintStatus;
import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceRole;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.BlockDatabaseCellRepository;
import com.flowspace.repository.BlockDatabaseColumnRepository;
import com.flowspace.repository.BlockDatabaseRepository;
import com.flowspace.repository.BlockDatabaseRowRepository;
import com.flowspace.repository.BlockRepository;
import com.flowspace.repository.PageRepository;
import com.flowspace.repository.RetrospectiveRepository;
import com.flowspace.repository.RetrospectiveStatusSnapshotRepository;
import com.flowspace.repository.SprintRepository;
import com.flowspace.repository.SubTaskRepository;
import com.flowspace.repository.SubTaskSnapshotRepository;
import com.flowspace.repository.TaskAssigneeRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.TaskSnapshotAssigneeRepository;
import com.flowspace.repository.TaskSnapshotRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceTaskStatusRepository;

// 스프린트 완료 → 회고 생성(진행 중이던 작업만 백로그로), 이미 회고가 있으면 거절, 삭제는 관리자 이상만 가능한지 확인해요.
@ExtendWith(MockitoExtension.class)
class SprintServiceTest {

    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private WorkspaceMemberRepository workspaceMemberRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private PageRepository pageRepository;
    @Mock
    private BlockRepository blockRepository;
    @Mock
    private BlockDatabaseRepository blockDatabaseRepository;
    @Mock
    private BlockDatabaseRowRepository blockDatabaseRowRepository;
    @Mock
    private BlockDatabaseCellRepository blockDatabaseCellRepository;
    @Mock
    private BlockDatabaseColumnRepository blockDatabaseColumnRepository;
    @Mock
    private WorkspaceTaskStatusRepository workspaceTaskStatusRepository;
    @Mock
    private RetrospectiveRepository retrospectiveRepository;
    @Mock
    private RetrospectiveStatusSnapshotRepository statusSnapshotRepository;
    @Mock
    private TaskSnapshotRepository taskSnapshotRepository;
    @Mock
    private TaskSnapshotAssigneeRepository taskSnapshotAssigneeRepository;
    @Mock
    private SubTaskSnapshotRepository subTaskSnapshotRepository;
    @Mock
    private TaskAssigneeRepository taskAssigneeRepository;
    @Mock
    private SubTaskRepository subTaskRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ActivityService activityService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private SprintService sprintService;

    private User user;
    private Workspace workspace;
    private Sprint sprint;

    @BeforeEach
    void setUp() {
        user = User.builder().userId(1L).email("a@a.com").nickname("a").build();
        workspace = Workspace.builder().workspaceId(5L).name("w").initials("W").build();
        sprint = Sprint.builder().sprintId(10L).workspace(workspace).name("스프린트 1").startDate(LocalDate.now())
            .endDate(LocalDate.now().plusDays(7)).status(SprintStatus.ACTIVE).build();

        when(userRepository.findByEmail("a@a.com")).thenReturn(Optional.of(user));
        when(sprintRepository.findById(10L)).thenReturn(Optional.of(sprint));
    }

    private void memberWithRole(WorkspaceRole role) {
        when(workspaceMemberRepository.findByWorkspaceAndUser(workspace, user))
            .thenReturn(Optional.of(WorkspaceMember.builder().workspace(workspace).user(user).role(role).build()));
    }

    @Test
    @DisplayName("스프린트를 완료하면 회고가 만들어지고, 끝나지 않은 작업만 백로그로 간다")
    void completingSprintCreatesRetrospective() {
        memberWithRole(WorkspaceRole.MEMBER);

        TaskStatus doneStatus = TaskStatus.builder().statusId(3L).name("DONE").category(TaskStatusCategory.DONE).build();
        TaskStatus todoStatus = TaskStatus.builder().statusId(1L).name("TODO").category(TaskStatusCategory.TODO).build();
        Task done = Task.builder().taskId(1L).workspace(workspace).sprint(sprint).status(doneStatus).title("끝난 작업")
            .taskNumber(1).build();
        Task todo = Task.builder().taskId(2L).workspace(workspace).sprint(sprint).status(todoStatus).title("남은 작업")
            .taskNumber(2).build();

        when(taskRepository.findBySprintOrderByPositionAsc(sprint)).thenReturn(List.of(done, todo));
        when(pageRepository.save(any(Page.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(retrospectiveRepository.save(any(Retrospective.class))).thenAnswer(invocation -> invocation.getArgument(0));

        sprintService.updateStatus(10L, new SprintStatusUpdateRequest(SprintStatus.COMPLETED), "a@a.com");

        assertEquals(SprintStatus.COMPLETED, sprint.getStatus());

        // 회고 페이지 제목과 회고-스프린트 연결
        ArgumentCaptor<Page> page = ArgumentCaptor.forClass(Page.class);
        verify(pageRepository).save(page.capture());
        assertEquals("스프린트 1 회고", page.getValue().getTitle());

        ArgumentCaptor<Retrospective> retrospective = ArgumentCaptor.forClass(Retrospective.class);
        verify(retrospectiveRepository).save(retrospective.capture());
        assertSame(sprint, retrospective.getValue().getSprint());
        assertSame(page.getValue(), retrospective.getValue().getPage());

        // 작업 두 개 모두 스냅샷으로 남고, 끝난 작업은 스프린트에 남고 끝나지 않은 작업만 백로그로 가요.
        verify(taskSnapshotRepository, org.mockito.Mockito.times(2)).save(any());
        assertSame(sprint, done.getSprint());
        assertNull(todo.getSprint());

        verify(activityService).log(eq(workspace), eq(user), eq(ActivityType.SPRINT_COMPLETED),
            eq(ActivityTargetType.SPRINT), eq(10L));
    }

    @Test
    @DisplayName("이미 회고가 있는 스프린트는 다시 완료할 수 없다")
    void alreadyHasRetrospective() {
        memberWithRole(WorkspaceRole.MEMBER);
        when(retrospectiveRepository.existsBySprint(sprint)).thenReturn(true);

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> sprintService.updateStatus(10L, new SprintStatusUpdateRequest(SprintStatus.COMPLETED), "a@a.com"));

        assertEquals(ErrorCode.RETROSPECTIVE_ALREADY_EXISTS, e.getErrorCode());
        assertEquals(SprintStatus.ACTIVE, sprint.getStatus());
        verify(retrospectiveRepository, never()).save(any(Retrospective.class));
    }

    @Test
    @DisplayName("일반 멤버는 스프린트를 삭제할 수 없다")
    void memberCannotDeleteSprint() {
        memberWithRole(WorkspaceRole.MEMBER);

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> sprintService.deleteSprint(10L, "a@a.com"));

        assertEquals(ErrorCode.ACCESS_DENIED, e.getErrorCode());
        verify(sprintRepository, never()).delete(any(Sprint.class));
    }

    @Test
    @DisplayName("관리자는 스프린트를 삭제할 수 있다")
    void adminCanDeleteSprint() {
        memberWithRole(WorkspaceRole.ADMIN);

        sprintService.deleteSprint(10L, "a@a.com");

        verify(sprintRepository).delete(sprint);
    }
}
