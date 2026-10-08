package com.flowspace.service;

import com.flowspace.entity.Page;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;

// 휴지통에 있는 페이지 안의 블록·데이터베이스·댓글은 고칠 수 없게 막는 공용 확인이에요.
// 블록 id처럼 페이지를 거치지 않고 바로 찾는 경로는 휴지통 여부를 따로 확인해야 해서 여기 모아뒀어요.
// 페이지를 복원하면 다시 쓸 수 있어요.
final class PageGuard {

    private PageGuard() {
    }

    // 휴지통에 있는 페이지면 "페이지를 찾을 수 없음"으로 거절해요.
    static void requireActive(Page page) {

        if (Boolean.TRUE.equals(page.getIsDeleted())) {
            throw new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND);
        }
    }
}
