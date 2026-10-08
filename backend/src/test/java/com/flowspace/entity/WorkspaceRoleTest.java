package com.flowspace.entity;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.entity.enums.WorkspaceRole;

// 역할 높낮이(OWNER > ADMIN > MEMBER) 비교를 확인해요.
class WorkspaceRoleTest {

    @Test
    @DisplayName("소유자는 모든 역할 이상이다")
    void ownerIsAtLeastEverything() {
        assertTrue(WorkspaceRole.OWNER.isAtLeast(WorkspaceRole.OWNER));
        assertTrue(WorkspaceRole.OWNER.isAtLeast(WorkspaceRole.ADMIN));
        assertTrue(WorkspaceRole.OWNER.isAtLeast(WorkspaceRole.MEMBER));
    }

    @Test
    @DisplayName("관리자는 관리자·멤버 이상이지만 소유자 이상은 아니다")
    void adminIsBetween() {
        assertFalse(WorkspaceRole.ADMIN.isAtLeast(WorkspaceRole.OWNER));
        assertTrue(WorkspaceRole.ADMIN.isAtLeast(WorkspaceRole.ADMIN));
        assertTrue(WorkspaceRole.ADMIN.isAtLeast(WorkspaceRole.MEMBER));
    }

    @Test
    @DisplayName("멤버는 멤버 이상일 뿐이다")
    void memberIsLowest() {
        assertFalse(WorkspaceRole.MEMBER.isAtLeast(WorkspaceRole.OWNER));
        assertFalse(WorkspaceRole.MEMBER.isAtLeast(WorkspaceRole.ADMIN));
        assertTrue(WorkspaceRole.MEMBER.isAtLeast(WorkspaceRole.MEMBER));
    }
}
