package com.flowspace.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.flowspace.entity.Page;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;

// 휴지통에 있는 페이지는 쓰기를 거절하고, 살아 있는 페이지는 통과시켜요.
class PageGuardTest {

    @Test
    @DisplayName("휴지통 페이지는 PAGE_NOT_FOUND로 거절한다")
    void trashedPageIsRejected() {
        Page page = Page.builder().pageId(1L).isDeleted(true).build();

        FlowSpaceException e = assertThrows(FlowSpaceException.class, () -> PageGuard.requireActive(page));

        assertEquals(ErrorCode.PAGE_NOT_FOUND, e.getErrorCode());
    }

    @Test
    @DisplayName("살아 있는 페이지는 통과한다")
    void activePageIsAllowed() {
        Page page = Page.builder().pageId(1L).isDeleted(false).build();

        assertDoesNotThrow(() -> PageGuard.requireActive(page));
    }

    @Test
    @DisplayName("복원한 페이지는 다시 통과한다")
    void restoredPageIsAllowed() {
        Page page = Page.builder().pageId(1L).isDeleted(true).build();
        page.restore();

        assertDoesNotThrow(() -> PageGuard.requireActive(page));
    }
}
