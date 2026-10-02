package com.flowspace.dto.user;

import com.flowspace.entity.User;

// @formatter:off

// 이메일로 찾은 사용자 응답 DTO (워크스페이스 초대할 때 "이 사람이 맞나요?"를 보여주는 용도)
public record UserLookupResponse(

    Long userId,
    String nickname,
    String email,
    String profileImageUrl,
    Status status

) {

    // AVAILABLE: 초대할 수 있음 / MEMBER: 이미 이 워크스페이스 멤버 / INVITED: 이미 초대함(대기 중) / SELF: 나 자신
    public enum Status {
        AVAILABLE, MEMBER, INVITED, SELF
    }

    public static UserLookupResponse of(User user, Status status) {
        return new UserLookupResponse(
            user.getUserId(),
            user.getNickname(),
            user.getEmail(),
            user.getProfileFile() == null ? null : user.getProfileFile().getFileUrl(),
            status
        );
    }

}

// @formatter:on
