package com.flowspace.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.dto.page.PageCreateRequest;
import com.flowspace.dto.page.PageResponse;
import com.flowspace.dto.page.PageUpdateRequest;
import com.flowspace.entity.Page;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.PageRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class PageService {

    private final PageRepository pageRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    // 페이지 생성
    public PageResponse createPage(Long workspaceId, PageCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        Page parent = null;
        if (request.parentPageId() != null) {
            parent = pageRepository.findByPageIdAndIsDeletedFalse(request.parentPageId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

            if (!parent.getWorkspace().getWorkspaceId().equals(workspace.getWorkspaceId())) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }
        }

        Page page = Page.builder().workspace(workspace).parentPage(parent).title(request.title()).icon(request.icon())
            .createdBy(user).build();

        pageRepository.save(page);

        return PageResponse.from(page);
    }

    // 페이지 목록 조회
    public List<PageResponse> getPages(Long workspaceId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return pageRepository.findByWorkspaceAndIsDeletedFalseOrderByCreatedAtDesc(workspace).stream()
            .map(PageResponse::from).toList();
    }

    // 페이지 단건 조회
    public PageResponse getPage(Long pageId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return PageResponse.from(page);
    }

    // 페이지 수정
    public PageResponse updatePage(Long pageId, PageUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        Page parent = null;

        if (request.parentPageId() != null) {
            parent = pageRepository.findByPageIdAndIsDeletedFalse(request.parentPageId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

            if (!parent.getWorkspace().getWorkspaceId().equals(page.getWorkspace().getWorkspaceId())) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }

            validateParentHierarchy(page, parent);
        }

        page.update(request.title(), request.icon(), page.getCoverFile(), parent);

        return PageResponse.from(page);
    }

    // 페이지 삭제
    public void deletePage(Long pageId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        page.delete();
    }

    // 순환 참조 검증
    private void validateParentHierarchy(Page page, Page parent) {

        Page current = parent;

        while (current != null) {

            if (current.getPageId().equals(page.getPageId())) {
                throw new FlowSpaceException(ErrorCode.INVALID_PAGE_PARENT);
            }

            current = current.getParentPage();
        }
    }

}
