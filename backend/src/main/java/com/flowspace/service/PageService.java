package com.flowspace.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import com.flowspace.dto.comment.CommentResponse;
import com.flowspace.dto.page.PageCoverUpdateRequest;
import com.flowspace.dto.page.PageCreateRequest;
import com.flowspace.dto.page.PageDetailResponse;
import com.flowspace.dto.page.PageDuplicateRequest;
import com.flowspace.dto.page.PageReorderRequest;
import com.flowspace.dto.page.PageResponse;
import com.flowspace.dto.page.PageUpdateRequest;
import com.flowspace.entity.Block;
import com.flowspace.entity.BlockDatabase;
import com.flowspace.entity.BlockDatabaseCell;
import com.flowspace.entity.BlockDatabaseColumn;
import com.flowspace.entity.BlockDatabaseColumnOption;
import com.flowspace.entity.BlockDatabaseRow;
import com.flowspace.entity.File;
import com.flowspace.entity.Page;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.ActivityTargetType;
import com.flowspace.entity.enums.ActivityType;
import com.flowspace.entity.enums.BlockType;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.BlockDatabaseCellRepository;
import com.flowspace.repository.BlockDatabaseColumnOptionRepository;
import com.flowspace.repository.BlockDatabaseColumnRepository;
import com.flowspace.repository.BlockDatabaseRepository;
import com.flowspace.repository.BlockDatabaseRowRepository;
import com.flowspace.repository.BlockRepository;
import com.flowspace.repository.CommentRepository;
import com.flowspace.repository.PageRepository;
import com.flowspace.repository.RetrospectiveRepository;
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
    private final BlockDatabaseRowRepository blockDatabaseRowRepository;
    private final BlockDatabaseRepository blockDatabaseRepository;
    private final BlockDatabaseColumnRepository blockDatabaseColumnRepository;
    private final BlockDatabaseColumnOptionRepository blockDatabaseColumnOptionRepository;
    private final BlockDatabaseCellRepository blockDatabaseCellRepository;
    private final RetrospectiveRepository retrospectiveRepository;

    private final ActivityService activityService;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

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
            .position(countSiblings(workspace, parent)).createdBy(user).build();

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

        return pageRepository.findByWorkspaceAndIsDeletedFalseOrderByPositionAscCreatedAtAsc(workspace).stream()
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

        // 하위 페이지도 같은 시각으로 함께 휴지통에 보내요. 이미 휴지통에 있던 하위 페이지는
        // 삭제 시각을 덮어쓰지 않아요(복원할 때 함께 삭제된 묶음을 구분하기 위해서예요).
        LocalDateTime deletedAt = LocalDateTime.now();

        for (Page target : collectSubtree(page)) {

            if (target.getIsDeleted()) {
                continue;
            }

            target.delete(deletedAt);

            // 데이터베이스 행 = 페이지라서, 다른 페이지의 데이터베이스 블록에
            // 이 페이지를 가리키는 행이 있으면 같이 지워줘요 — 안 그러면 삭제된
            // 페이지를 계속 가리키는 고아 행이 남아요(셀은 FK ON DELETE CASCADE로
            // 같이 정리돼요).
            blockDatabaseRowRepository.deleteAll(blockDatabaseRowRepository.findByPage(target));
        }
    }

    // 휴지통 목록 조회
    @Transactional(readOnly = true)
    public List<PageResponse> getTrash(Long workspaceId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return pageRepository.findByWorkspaceAndIsDeletedTrueOrderByDeletedAtDesc(workspace).stream()
            .map(PageResponse::from).toList();
    }

    // 휴지통 페이지 복원
    public PageResponse restorePage(Long pageId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedTrue(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        // 이 페이지와 같은 시각에 함께 삭제된 하위 페이지만 복원해요.
        LocalDateTime deletedAt = page.getDeletedAt();

        // 상위 페이지가 아직 휴지통에 있으면 사이드바에서 보이지 않으니 최상위로 올려요.
        if (page.getParentPage() != null && page.getParentPage().getIsDeleted()) {
            page.updateParent(null);
            page.updatePosition(countSiblings(page.getWorkspace(), null));
        }

        for (Page target : collectSubtree(page)) {
            if (target.getIsDeleted() && Objects.equals(target.getDeletedAt(), deletedAt)) {
                target.restore();
            }
        }

        return PageResponse.from(page);
    }

    // 휴지통 페이지 영구 삭제
    public void deletePagePermanently(Long pageId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedTrue(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        List<Page> subtree = collectSubtree(page);

        // 회고 페이지가 하위에 있으면 FK 연쇄 삭제로 회고가 함께 사라지므로 막아요.
        for (Page target : subtree) {
            if (retrospectiveRepository.existsByPage(target)) {
                throw new FlowSpaceException(ErrorCode.RETROSPECTIVE_PAGE_PROTECTED);
            }
        }

        // 하위 페이지부터 지워야 DB 연쇄 삭제와 겹치지 않아요.
        List<Page> ordered = new ArrayList<>(subtree);
        Collections.reverse(ordered);

        for (Page target : ordered) {
            purgePage(target);
        }
    }

    // 휴지통 비우기 (회고 페이지는 남겨둠)
    public void emptyTrash(Long workspaceId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        List<Page> trashed = pageRepository.findByWorkspaceAndIsDeletedTrueOrderByDeletedAtDesc(workspace);

        Map<Long, Page> trashedById = new HashMap<>();
        for (Page page : trashed) {
            trashedById.put(page.getPageId(), page);
        }

        // 회고 페이지와 그 상위 페이지는 삭제하지 않아요.
        Set<Long> protectedIds = new HashSet<>();
        for (Page page : trashed) {
            if (!retrospectiveRepository.existsByPage(page)) {
                continue;
            }

            Page current = page;
            while (current != null && trashedById.containsKey(current.getPageId())) {
                protectedIds.add(current.getPageId());
                current = current.getParentPage();
            }
        }

        // 깊은 페이지부터 지워야 DB 연쇄 삭제와 겹치지 않아요.
        List<Page> targets = new ArrayList<>(trashed);
        targets.removeIf(page -> protectedIds.contains(page.getPageId()));
        targets.sort((a, b) -> depthOf(b) - depthOf(a));

        for (Page target : targets) {
            purgePage(target);
        }
    }

    // 페이지 한 개를 실제로 삭제 (블록/데이터베이스는 DB 연쇄 삭제, 파일은 직접 정리)
    private void purgePage(Page page) {

        List<File> files = new ArrayList<>();

        if (page.getCoverFile() != null) {
            files.add(page.getCoverFile());
        }

        for (Block block : blockRepository.findByPageOrderByPositionAsc(page)) {
            if (block.getImageFile() != null) {
                files.add(block.getImageFile());
            }
        }

        blockDatabaseRowRepository.deleteAll(blockDatabaseRowRepository.findByPage(page));

        pageRepository.delete(page);
        pageRepository.flush();

        for (File file : files) {
            fileService.delete(file);
        }
    }

    // 페이지 깊이 계산
    private int depthOf(Page page) {

        int depth = 0;
        Page current = page.getParentPage();

        while (current != null) {
            depth++;
            current = current.getParentPage();
        }

        return depth;
    }

    // 삭제 여부와 상관없이 본인과 모든 하위 페이지 (상위가 먼저 오는 순서)
    private List<Page> collectSubtree(Page root) {

        List<Page> result = new ArrayList<>();
        result.add(root);

        for (int i = 0; i < result.size(); i++) {
            result.addAll(pageRepository.findByParentPage(result.get(i)));
        }

        return result;
    }

    // 삭제되지 않은 본인과 하위 페이지 (상위가 먼저 오는 순서)
    private List<Page> collectActiveSubtree(Page root) {

        List<Page> result = new ArrayList<>();
        result.add(root);

        for (int i = 0; i < result.size(); i++) {
            result.addAll(pageRepository.findByParentPageAndIsDeletedFalse(result.get(i)));
        }

        return result;
    }

    // 같은 상위 페이지 아래의 페이지 개수 (새 페이지를 맨 뒤에 두기 위해 사용)
    private int countSiblings(Workspace workspace, Page parent) {

        long count = parent == null ? pageRepository.countByWorkspaceAndParentPageIsNullAndIsDeletedFalse(workspace)
            : pageRepository.countByWorkspaceAndParentPageAndIsDeletedFalse(workspace, parent);

        return (int) count;
    }

    // 페이지 순서 변경
    public void reorderPages(Long workspaceId, PageReorderRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        List<Long> pageIds = request.pageIds();

        if (new HashSet<>(pageIds).size() != pageIds.size()) {
            throw new FlowSpaceException(ErrorCode.INVALID_PAGE_REORDER);
        }

        Long parentId = null;

        for (int i = 0; i < pageIds.size(); i++) {

            Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageIds.get(i))
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

            if (!page.getWorkspace().getWorkspaceId().equals(workspaceId)) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }

            Long currentParentId = page.getParentPage() == null ? null : page.getParentPage().getPageId();

            if (i == 0) {
                parentId = currentParentId;
            } else if (!Objects.equals(parentId, currentParentId)) {
                throw new FlowSpaceException(ErrorCode.INVALID_PAGE_REORDER);
            }

            page.updatePosition(i);
        }
    }

    // 페이지 복제 (하위 페이지, 블록, 데이터베이스까지 함께 복사)
    public PageResponse duplicatePage(Long pageId, PageDuplicateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page source = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        Workspace workspace = source.getWorkspace();

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        List<Page> sources = collectActiveSubtree(source);

        // 복제본의 상위 페이지 (지정하지 않으면 원본과 같은 위치)
        Page newParent = source.getParentPage();

        if (request != null && request.parentPageId() != null) {

            newParent = pageRepository.findByPageIdAndIsDeletedFalse(request.parentPageId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

            if (!newParent.getWorkspace().getWorkspaceId().equals(workspace.getWorkspaceId())) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }

            for (Page target : sources) {
                if (target.getPageId().equals(newParent.getPageId())) {
                    throw new FlowSpaceException(ErrorCode.INVALID_PAGE_PARENT);
                }
            }
        }

        // 1단계: 페이지 복사 (상위 페이지가 먼저 만들어지는 순서)
        Map<Long, Page> copies = new LinkedHashMap<>();

        for (Page target : sources) {

            boolean isRoot = target.getPageId().equals(source.getPageId());

            Page parent = isRoot ? newParent : copies.get(target.getParentPage().getPageId());

            File cover = target.getCoverFile() == null ? null
                : fileService.copy(target.getCoverFile(), workspace, user);

            Page copy = Page.builder().workspace(workspace).parentPage(parent).title(target.getTitle())
                .icon(target.getIcon()).coverFile(cover)
                .position(isRoot ? countSiblings(workspace, parent) : target.getPosition()).createdBy(user).build();

            copies.put(target.getPageId(), pageRepository.save(copy));
        }

        // 2단계: 블록 복사 (하위 페이지 연결과 데이터베이스 행의 페이지는 복제본으로 바꿔요)
        for (Page target : sources) {
            copyBlocks(target, copies.get(target.getPageId()), copies, user);
        }

        Page rootCopy = copies.get(source.getPageId());

        activityService.log(workspace, user, ActivityType.PAGE_CREATED, ActivityTargetType.PAGE,
            rootCopy.getPageId());

        return PageResponse.from(rootCopy);
    }

    // 페이지의 블록 복사
    private void copyBlocks(Page source, Page target, Map<Long, Page> pageCopies, User user) {

        List<Block> blocks = blockRepository.findByPageOrderByPositionAsc(source);

        Map<Long, Block> blockCopies = new HashMap<>();

        for (Block block : blocks) {

            File image = block.getImageFile() == null ? null
                : fileService.copy(block.getImageFile(), target.getWorkspace(), user);

            Block copy = Block.builder().page(target).task(block.getTask()).event(block.getEvent())
                .sprint(block.getSprint()).imageFile(image).type(block.getType()).position(block.getPosition())
                .content(remapPageId(block.getContent(), pageCopies)).createdBy(user).build();

            blockRepository.save(copy);

            blockCopies.put(block.getBlockId(), copy);

            if (block.getType() == BlockType.DATABASE) {
                blockDatabaseRepository.findByBlock(block)
                    .ifPresent(database -> copyDatabase(database, copy, pageCopies));
            }
        }

        // 블록 부모 관계 복원
        for (Block block : blocks) {
            if (block.getParentBlock() != null) {
                blockCopies.get(block.getBlockId())
                    .updateParent(blockCopies.get(block.getParentBlock().getBlockId()));
            }
        }
    }

    // 데이터베이스 복사 (컬럼, 옵션, 행, 셀)
    private void copyDatabase(BlockDatabase source, Block newBlock, Map<Long, Page> pageCopies) {

        BlockDatabase database = blockDatabaseRepository.save(
            BlockDatabase.builder().block(newBlock).title(source.getTitle()).viewType(source.getViewType()).build());

        Map<Long, BlockDatabaseColumn> columnCopies = new HashMap<>();

        for (BlockDatabaseColumn column : blockDatabaseColumnRepository.findByDatabaseOrderByPositionAsc(source)) {

            BlockDatabaseColumn columnCopy = blockDatabaseColumnRepository
                .save(BlockDatabaseColumn.builder().database(database).name(column.getName()).type(column.getType())
                    .position(column.getPosition()).width(column.getWidth()).build());

            columnCopies.put(column.getColumnId(), columnCopy);

            for (BlockDatabaseColumnOption option : blockDatabaseColumnOptionRepository
                .findByColumnOrderByPositionAsc(column)) {

                blockDatabaseColumnOptionRepository.save(BlockDatabaseColumnOption.builder().column(columnCopy)
                    .value(option.getValue()).color(option.getColor()).statusGroup(option.getStatusGroup())
                    .position(option.getPosition()).build());
            }
        }

        for (BlockDatabaseRow row : blockDatabaseRowRepository.findByDatabaseOrderByPositionAsc(source)) {

            // 행 페이지가 이번에 같이 복제된 페이지면 복제본을, 아니면 원래 페이지를 그대로 연결해요.
            Page rowPage = row.getPage() == null ? null
                : pageCopies.getOrDefault(row.getPage().getPageId(), row.getPage());

            BlockDatabaseRow rowCopy = blockDatabaseRowRepository.save(BlockDatabaseRow.builder()
                .database(database).page(rowPage).position(row.getPosition()).build());

            for (BlockDatabaseCell cell : blockDatabaseCellRepository.findByRowOrderByColumnPositionAsc(row)) {

                BlockDatabaseColumn columnCopy = columnCopies.get(cell.getColumn().getColumnId());

                if (columnCopy == null) {
                    continue;
                }

                blockDatabaseCellRepository.save(BlockDatabaseCell.builder().row(rowCopy).column(columnCopy)
                    .value(cell.getValue()).build());
            }
        }
    }

    // 하위 페이지 링크 블록({"pageId": N})의 페이지 ID를 복제본으로 교체
    private String remapPageId(String content, Map<Long, Page> pageCopies) {

        if (content == null || content.isBlank()) {
            return content;
        }

        try {
            JsonNode node = OBJECT_MAPPER.readTree(content);

            if (node instanceof ObjectNode object && object.hasNonNull("pageId")
                && object.get("pageId").canConvertToLong()) {

                Page copy = pageCopies.get(object.get("pageId").asLong());

                if (copy != null) {
                    object.put("pageId", copy.getPageId());
                    return OBJECT_MAPPER.writeValueAsString(object);
                }
            }

            return content;

        } catch (JsonProcessingException e) {
            return content;
        }
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
