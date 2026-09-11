package com.flowspace.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.flowspace.dto.comment.CommentResponse;
import com.flowspace.dto.page.PageCoverUpdateRequest;
import com.flowspace.dto.page.PageCreateRequest;
import com.flowspace.dto.page.PageDetailResponse;
import com.flowspace.dto.page.PageResponse;
import com.flowspace.dto.page.PageUpdateRequest;
import com.flowspace.entity.File;
import com.flowspace.entity.Page;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.ActivityTargetType;
import com.flowspace.entity.enums.ActivityType;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.BlockRepository;
import com.flowspace.repository.CommentRepository;
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
    private final BlockRepository blockRepository;
    private final UserRepository userRepository;
    private final FileService fileService;
    private final CommentRepository commentRepository;

    private final ActivityService activityService;

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

        activityService.log(workspace, user, ActivityType.PAGE_CREATED, ActivityTargetType.PAGE, page.getPageId());

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

    // 페이지 정보와 블록 전체 조회
    @Transactional(readOnly = true)
    public PageDetailResponse getPageDetail(Long pageId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        List<PageDetailResponse.BlockItem> blockItems = blockRepository.findByPageOrderByPositionAsc(page).stream()
            .map(block -> {
                List<CommentResponse> comments = commentRepository
                    .findByBlockAndParentCommentIsNullOrderByCreatedAtAsc(block).stream().map(comment -> {
                        List<CommentResponse> replies = commentRepository
                            .findByParentCommentOrderByCreatedAtAsc(comment).stream()
                            .map(reply -> CommentResponse.from(reply, List.of())).toList();

                        return CommentResponse.from(comment, replies);
                    }).toList();

                return PageDetailResponse.BlockItem.from(block, comments);
            }).toList();

        List<Page> childPages = pageRepository.findByParentPageAndIsDeletedFalse(page);

        return PageDetailResponse.from(page, blockItems, childPages);
    }

    // 페이지 커버 업로드
    public PageResponse uploadCover(Long pageId, MultipartFile file, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        if (page.getCoverFile() != null) {
            fileService.delete(page.getCoverFile());
        }

        File cover = fileService.upload(file, page.getWorkspace(), email);

        page.updateCover(cover);

        return PageResponse.from(page);
    }

    // 페이지 커버 삭제
    public PageResponse deleteCover(Long pageId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        if (page.getCoverFile() != null) {
            fileService.delete(page.getCoverFile());
            page.updateCover(null);
        }

        return PageResponse.from(page);
    }

    // 기본 커버 적용
    public PageResponse applyDefaultCover(Long pageId, PageCoverUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        if (page.getCoverFile() != null) {
            fileService.delete(page.getCoverFile());
        }

        File cover = fileService.createDefaultCover(request.coverName(), page.getWorkspace(), user);

        page.updateCover(cover);

        return PageResponse.from(page);
    }
}
