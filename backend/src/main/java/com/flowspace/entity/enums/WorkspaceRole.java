package com.flowspace.entity.enums;

public enum WorkspaceRole {
    OWNER,
    ADMIN,
    MEMBER;

    // 권한 높낮이 (OWNER > ADMIN > MEMBER)
    private int level() {
        return switch (this) {
            case OWNER -> 3;
            case ADMIN -> 2;
            case MEMBER -> 1;
        };
    }

    // 이 역할이 required 이상의 권한인지 확인해요.
    public boolean isAtLeast(WorkspaceRole required) {
        return level() >= required.level();
    }
}
