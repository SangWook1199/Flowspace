package com.flowspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.flowspace.dto.workspace.WorkspaceInviteRequest;
import com.flowspace.dto.workspace.WorkspaceMemberResponse;
import com.flowspace.dto.workspace.WorkspaceRoleChangeRequest;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.WorkspaceMember;
import com.flowspace.entity.WorkspaceInvite;
import com.flowspace.entity.enums.WorkspaceRole;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.TaskAssigneeRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.TaskStatusRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceInviteRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import com.flowspace.repository.WorkspaceTaskStatusRepository;

// 워크스페이스 역할 규칙: 초대·추방은 관리자 이상, 역할 변경은 소유자만, 관리자는 관리자를 못 내보내는지 확인해요.
@ExtendWith(MockitoExtension.class)
class WorkspaceServiceRoleTest {

    @Mock
    private WorkspaceRepository workspaceRepository;
    @Mock
    private WorkspaceMemberRepository workspaceMemberRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private WorkspaceInviteRepository workspaceInviteRepository;
    @Mock
    private TaskStatusRepository taskStatusRepository;
    @Mock
    private WorkspaceTaskStatusRepository workspaceTaskStatusRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private PresenceService presenceService;
    @Mock
    private TaskAssigneeRepository taskAssigneeRepository;
    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private WorkspaceService workspaceService;

    private Workspace workspace;
    private User actor;
    private User target;

    @BeforeEach
    void setUp() {
        workspace = Workspace.builder().workspaceId(5L).name("w").initials("W").build();
        actor = User.builder().userId(1L).email("actor@a.com").nickname("actor").build();
        target = User.builder().userId(2L).email("target@a.com").nickname("target").build();

        lenient().when(userRepository.findByEmail("actor@a.com")).thenReturn(Optional.of(actor));
        lenient().when(userRepository.findById(2L)).thenReturn(Optional.of(target));
        lenient().when(workspaceRepository.findById(5L)).thenReturn(Optional.of(workspace));
    }

    private WorkspaceMember actorWithRole(WorkspaceRole role) {
        WorkspaceMember member = WorkspaceMember.builder().workspace(workspace).user(actor).role(role).build();
        lenient().when(workspaceMemberRepository.findByWorkspaceAndUser(workspace, actor))
            .thenReturn(Optional.of(member));
        return member;
    }

    private WorkspaceMember targetWithRole(WorkspaceRole role) {
        WorkspaceMember member = WorkspaceMember.builder().workspace(workspace).user(target).role(role).build();
        lenient().when(workspaceMemberRepository.findByWorkspaceAndUser(workspace, target))
            .thenReturn(Optional.of(member));
        return member;
    }

    // ───── 초대 ─────

    @Test
    @DisplayName("일반 멤버는 초대할 수 없다")
    void memberCannotInvite() {
        actorWithRole(WorkspaceRole.MEMBER);

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> workspaceService.inviteMember(5L, new WorkspaceInviteRequest("target@a.com"), "actor@a.com"));

        assertEquals(ErrorCode.ACCESS_DENIED, e.getErrorCode());
        verify(workspaceInviteRepository, never()).save(any(WorkspaceInvite.class));
    }

    @Test
    @DisplayName("관리자는 초대할 수 있다")
    void adminCanInvite() {
        actorWithRole(WorkspaceRole.ADMIN);
        lenient().when(userRepository.findByEmail("target@a.com")).thenReturn(Optional.of(target));
        lenient().when(workspaceMemberRepository.existsByWorkspaceAndUser(workspace, target)).thenReturn(false);
        lenient().when(workspaceInviteRepository.findByWorkspaceAndEmailAndStatus(any(), any(), any()))
            .thenReturn(Optional.empty());

        workspaceService.inviteMember(5L, new WorkspaceInviteRequest("target@a.com"), "actor@a.com");

        verify(workspaceInviteRepository).save(any(WorkspaceInvite.class));
    }

    // ───── 추방 ─────

    @Test
    @DisplayName("일반 멤버는 추방할 수 없다")
    void memberCannotRemove() {
        actorWithRole(WorkspaceRole.MEMBER);
        targetWithRole(WorkspaceRole.MEMBER);

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> workspaceService.removeMember(5L, 2L, "actor@a.com"));

        assertEquals(ErrorCode.ACCESS_DENIED, e.getErrorCode());
    }

    @Test
    @DisplayName("관리자는 일반 멤버를 내보낼 수 있다")
    void adminCanRemoveMember() {
        actorWithRole(WorkspaceRole.ADMIN);
        WorkspaceMember targetMember = targetWithRole(WorkspaceRole.MEMBER);

        workspaceService.removeMember(5L, 2L, "actor@a.com");

        verify(workspaceMemberRepository).delete(targetMember);
    }

    @Test
    @DisplayName("관리자는 다른 관리자를 내보낼 수 없다")
    void adminCannotRemoveAdmin() {
        actorWithRole(WorkspaceRole.ADMIN);
        targetWithRole(WorkspaceRole.ADMIN);

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> workspaceService.removeMember(5L, 2L, "actor@a.com"));

        assertEquals(ErrorCode.ACCESS_DENIED, e.getErrorCode());
        verify(workspaceMemberRepository, never()).delete(any(WorkspaceMember.class));
    }

    @Test
    @DisplayName("소유자는 관리자도 내보낼 수 있다")
    void ownerCanRemoveAdmin() {
        actorWithRole(WorkspaceRole.OWNER);
        WorkspaceMember targetMember = targetWithRole(WorkspaceRole.ADMIN);

        workspaceService.removeMember(5L, 2L, "actor@a.com");

        verify(workspaceMemberRepository).delete(targetMember);
    }

    @Test
    @DisplayName("소유자는 누구도 내보낼 수 없다")
    void ownerCannotBeRemoved() {
        actorWithRole(WorkspaceRole.ADMIN);
        targetWithRole(WorkspaceRole.OWNER);

        FlowSpaceException e = assertThrows(FlowSpaceException.class,
            () -> workspaceService.removeMember(5L, 2L, "actor@a.com"));

        assertEquals(ErrorCode.OWNER_CANNOT_REMOVE, e.getErrorCode());
    }

    // ───── 역할 변경 ─────

    @Test
    @DisplayName("소유자는 멤버를 관리자로 바꿀 수 있다")
    void ownerCanPromoteMember() {
        actorWithRole(WorkspaceRole.OWNER);
        WorkspaceMember targetMember = targetWithRole(WorkspaceRole.MEMBER);
        lenient().when(presenceService.isOnline(2L)).thenReturn(false);

        WorkspaceMemberResponse response = workspaceService.changeMemberRole(5L, 2L,
            new WorkspaceRoleChangeRequest(WorkspaceRole.ADMIN), "actor@a.com");

        assertEquals(WorkspaceRole.ADMIN, targetMember.getRole());
        assertEquals(WorkspaceRole.ADMIN, response.role());
    }

    @Test
    @DisplayName("소유자는 관리자를 다시 멤버로 바꿀 수 있다")
    void ownerCanDemoteAdmin() {
        actorWithRole(WorkspaceRole.OWNER);
        WorkspaceMember targetMember = targetWithRole(WorkspaceRole.ADMIN);

        workspaceService.changeMemberRole(5L, 2L, new WorkspaceRoleChangeRequest(WorkspaceRole.MEMBER),
            "actor@a.com");

        assertEquals(WorkspaceRole.MEMBER, targetMember.getRole());
    }

    @Test
    @DisplayName("관리자는 역할을 바꿀 수 없다")
    void adminCannotChangeRole() {
        actorWithRole(WorkspaceRole.ADMIN);
        WorkspaceMember targetMember = targetWithRole(WorkspaceRole.MEMBER);

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> workspaceService.changeMemberRole(5L, 2L,
            new WorkspaceRoleChangeRequest(WorkspaceRole.ADMIN), "actor@a.com"));

        assertEquals(ErrorCode.ACCESS_DENIED, e.getErrorCode());
        assertEquals(WorkspaceRole.MEMBER, targetMember.getRole());
    }

    @Test
    @DisplayName("역할을 소유자로 바꾸는 요청은 거절한다 (소유권 이전을 써야 해요)")
    void cannotSetOwnerByRoleChange() {
        actorWithRole(WorkspaceRole.OWNER);
        WorkspaceMember targetMember = targetWithRole(WorkspaceRole.MEMBER);

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> workspaceService.changeMemberRole(5L, 2L,
            new WorkspaceRoleChangeRequest(WorkspaceRole.OWNER), "actor@a.com"));

        assertEquals(ErrorCode.INVALID_ROLE_CHANGE, e.getErrorCode());
        assertEquals(WorkspaceRole.MEMBER, targetMember.getRole());
    }

    @Test
    @DisplayName("소유자의 역할은 바꿀 수 없다")
    void cannotChangeOwnerRole() {
        actorWithRole(WorkspaceRole.OWNER);
        WorkspaceMember targetMember = targetWithRole(WorkspaceRole.OWNER);

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> workspaceService.changeMemberRole(5L, 2L,
            new WorkspaceRoleChangeRequest(WorkspaceRole.MEMBER), "actor@a.com"));

        assertEquals(ErrorCode.INVALID_ROLE_CHANGE, e.getErrorCode());
        assertEquals(WorkspaceRole.OWNER, targetMember.getRole());
    }
}
