package com.flowspace.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.flowspace.dto.block.BlockCreateRequest;
import com.flowspace.dto.block.BlockIndentRequest;
import com.flowspace.dto.block.BlockOrderItem;
import com.flowspace.dto.block.BlockReorderRequest;
import com.flowspace.dto.block.BlockResponse;
import com.flowspace.dto.block.BlockSyncRequest;
import com.flowspace.dto.block.BlockSyncRequest.BlockSyncItem;
import com.flowspace.dto.block.BlockSyncResponse;
import com.flowspace.dto.block.BlockSyncResponse.BlockSyncResult;
import com.flowspace.dto.block.BlockUpdateRequest;
import com.flowspace.entity.Block;
import com.flowspace.entity.Event;
import com.flowspace.entity.Page;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.Task;
import com.flowspace.entity.File;
import com.flowspace.entity.User;
import com.flowspace.entity.enums.BlockType;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.BlockRepository;
import com.flowspace.repository.EventRepository;
import com.flowspace.repository.PageRepository;
import com.flowspace.repository.SprintRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class BlockService {

    private final BlockRepository blockRepository;
    private final PageRepository pageRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final TaskRepository taskRepository;
    private final EventRepository eventRepository;
    private final SprintRepository sprintRepository;
    private final FileService fileService;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    // 블록 생성
    public BlockResponse createBlock(Long pageId, BlockCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        Block parent = null;
        if (request.parentBlockId() != null) {
            parent = blockRepository.findById(request.parentBlockId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.BLOCK_NOT_FOUND));

            if (!parent.getPage().getPageId().equals(pageId)) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }
        }

        BlockType type = request.type() == null ? BlockType.TEXT : request.type();

        validateContent(request.content());

        Task task = findLinkedTask(type, request.taskId(), page);
        Event event = findLinkedEvent(type, request.eventId(), page);
        Sprint sprint = findLinkedSprint(type, request.sprintId(), page);

        BigDecimal position = BigDecimal.valueOf(blockRepository.findByPageOrderByPositionAsc(page).size());

        Block block = Block.builder().page(page).parentBlock(parent).task(task).event(event).sprint(sprint)
            .type(type).position(position).content(request.content()).createdBy(user).build();

        blockRepository.save(block);

        return BlockResponse.from(block);
    }

    // 페이지 블록 목록 조회
    @Transactional(readOnly = true)
    public List<BlockResponse> getBlocks(Long pageId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return blockRepository.findByPageOrderByPositionAsc(page).stream().map(BlockResponse::from).toList();
    }

    // 블록 수정
    public BlockResponse updateBlock(Long blockId, BlockUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Block block = blockRepository.findById(blockId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.BLOCK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(block.getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        validateContent(request.content());

        block.update(request.type() == null ? BlockType.TEXT : request.type(), request.content(), user);

        return BlockResponse.from(block);
    }

    // 블록 삭제
    public void deleteBlock(Long blockId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Block block = blockRepository.findById(blockId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.BLOCK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(block.getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        if (block.getImageFile() != null) {
            fileService.delete(block.getImageFile());
        }

        blockRepository.delete(block);
    }

    // 블록 순서 변경
    public void reorderBlocks(Long pageId, BlockReorderRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        for (BlockOrderItem item : request.blocks()) {

            Block block = blockRepository.findById(item.blockId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.BLOCK_NOT_FOUND));

            if (!block.getPage().getPageId().equals(pageId)) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }

            block.updatePosition(BigDecimal.valueOf(item.position()));
        }
    }

    // 블록 이동
    public BlockResponse moveBlock(Long blockId, BlockIndentRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Block block = blockRepository.findById(blockId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.BLOCK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(block.getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        Block parent = null;

        if (request.parentBlockId() != null) {
            parent = blockRepository.findById(request.parentBlockId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.BLOCK_NOT_FOUND));

            if (!parent.getPage().getPageId().equals(block.getPage().getPageId())) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }

            validateParentHierarchy(block, parent);
        }

        block.updateParent(parent);
        block.updatePosition(BigDecimal.valueOf(request.position()));

        return BlockResponse.from(block);
    }

    // 블록 순환 참조 검증
    private void validateParentHierarchy(Block block, Block parent) {

        Block current = parent;

        while (current != null) {

            if (current.getBlockId().equals(block.getBlockId())) {
                throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_PARENT);
            }

            current = current.getParentBlock();
        }
    }

    // 블록 일괄 동기화 (목록 순서 = 블록 순서, 목록에 없는 기존 블록은 삭제)
    public BlockSyncResponse syncBlocks(Long pageId, BlockSyncRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        List<BlockSyncItem> items = request.blocks();

        validateSyncItems(items);

        Map<Long, Block> existing = new HashMap<>();
        for (Block block : blockRepository.findByPageOrderByPositionAsc(page)) {
            existing.put(block.getBlockId(), block);
        }

        // 1단계: 생성 / 수정 (부모는 아직 연결하지 않음)
        Map<String, Block> byClientId = new HashMap<>();
        Set<Long> keptIds = new HashSet<>();

        for (int i = 0; i < items.size(); i++) {

            BlockSyncItem item = items.get(i);
            BlockType type = item.type() == null ? BlockType.TEXT : item.type();

            validateContent(item.content());

            Block block;

            if (item.blockId() != null) {

                block = existing.get(item.blockId());

                if (block == null) {
                    throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_SYNC);
                }

                keptIds.add(block.getBlockId());

                // 데이터베이스 블록은 별도 API로 관리하므로 위치/부모만 변경
                if (block.getType() == BlockType.DATABASE) {
                    if (type != BlockType.DATABASE) {
                        throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_SYNC);
                    }
                } else {
                    if (type == BlockType.DATABASE) {
                        throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_SYNC);
                    }

                    block.update(type, item.content(), user);
                    block.updateLinks(findLinkedTask(type, item.taskId(), page),
                        findLinkedEvent(type, item.eventId(), page), findLinkedSprint(type, item.sprintId(), page));
                }

            } else {

                // 새 데이터베이스 블록은 POST /pages/{pageId}/databases 로만 생성 가능
                if (type == BlockType.DATABASE) {
                    throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_SYNC);
                }

                block = Block.builder().page(page).type(type).position(BigDecimal.valueOf(i)).content(item.content())
                    .task(findLinkedTask(type, item.taskId(), page)).event(findLinkedEvent(type, item.eventId(), page))
                    .sprint(findLinkedSprint(type, item.sprintId(), page)).createdBy(user).build();

                blockRepository.save(block);
            }

            byClientId.put(item.clientId(), block);
        }

        // 2단계: 부모 연결 및 순서 반영
        List<BlockSyncResult> results = new ArrayList<>();

        for (int i = 0; i < items.size(); i++) {

            BlockSyncItem item = items.get(i);
            Block block = byClientId.get(item.clientId());

            block.updateParent(item.parentClientId() == null ? null : byClientId.get(item.parentClientId()));
            block.updatePosition(BigDecimal.valueOf(i));
        }

        // 3단계: 목록에 없는 기존 블록 삭제 (삭제 대상끼리의 부모 관계는 먼저 끊어 중복 삭제 방지)
        List<Block> removed = new ArrayList<>();
        for (Block block : existing.values()) {
            if (!keptIds.contains(block.getBlockId())) {
                block.updateParent(null);
                removed.add(block);
            }
        }

        for (Block block : removed) {
            if (block.getImageFile() != null) {
                fileService.delete(block.getImageFile());
            }
            blockRepository.delete(block);
        }

        for (BlockSyncItem item : items) {
            results.add(new BlockSyncResult(item.clientId(), BlockResponse.from(byClientId.get(item.clientId()))));
        }

        return new BlockSyncResponse(results);
    }

    // 동기화 요청 검증 (clientId 중복, 부모는 자식보다 앞에 위치)
    private void validateSyncItems(List<BlockSyncItem> items) {

        Set<String> seenClientIds = new HashSet<>();
        Set<Long> seenBlockIds = new HashSet<>();

        for (BlockSyncItem item : items) {

            if (!seenClientIds.add(item.clientId())) {
                throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_SYNC);
            }

            if (item.blockId() != null && !seenBlockIds.add(item.blockId())) {
                throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_SYNC);
            }

            if (item.parentClientId() != null && !seenClientIds.contains(item.parentClientId())) {
                throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_SYNC);
            }

            if (item.parentClientId() != null && item.parentClientId().equals(item.clientId())) {
                throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_PARENT);
            }
        }
    }

    // 블록 content JSON 형식 검증
    private void validateContent(String content) {

        if (content == null || content.isBlank()) {
            return;
        }

        try {
            OBJECT_MAPPER.readTree(content);
        } catch (JsonProcessingException e) {
            throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_CONTENT);
        }
    }

    // 업무 블록 연결 대상 조회
    private Task findLinkedTask(BlockType type, Long taskId, Page page) {

        if (type != BlockType.TASK) {
            return null;
        }

        if (taskId == null) {
            throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_SYNC);
        }

        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        if (!task.getWorkspace().getWorkspaceId().equals(page.getWorkspace().getWorkspaceId())) {
            throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
        }

        return task;
    }

    // 일정 블록 연결 대상 조회
    private Event findLinkedEvent(BlockType type, Long eventId, Page page) {

        if (type != BlockType.EVENT) {
            return null;
        }

        if (eventId == null) {
            throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_SYNC);
        }

        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.EVENT_NOT_FOUND));

        if (!event.getWorkspace().getWorkspaceId().equals(page.getWorkspace().getWorkspaceId())) {
            throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
        }

        return event;
    }

    // 스프린트 블록 연결 대상 조회
    private Sprint findLinkedSprint(BlockType type, Long sprintId, Page page) {

        if (type != BlockType.SPRINT) {
            return null;
        }

        if (sprintId == null) {
            throw new FlowSpaceException(ErrorCode.INVALID_BLOCK_SYNC);
        }

        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.SPRINT_NOT_FOUND));

        if (!sprint.getWorkspace().getWorkspaceId().equals(page.getWorkspace().getWorkspaceId())) {
            throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
        }

        return sprint;
    }

    // 블록 이미지 업로드
    public BlockResponse uploadImage(Long blockId, MultipartFile multipartFile, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Block block = blockRepository.findById(blockId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.BLOCK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(block.getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        // 이미지 블록은 이미지 파일만 허용하고, 파일 블록(FILE)은 종류와 상관없이 올릴 수 있어요.
        if (block.getType() != BlockType.FILE
            && (multipartFile.getContentType() == null || !multipartFile.getContentType().startsWith("image/"))) {
            throw new FlowSpaceException(ErrorCode.INVALID_IMAGE_FILE);
        }

        // 기존 이미지 삭제
        if (block.getImageFile() != null) {
            fileService.delete(block.getImageFile());
        }

        File image = fileService.upload(multipartFile, block.getPage().getWorkspace(), email);

        block.updateImage(image);

        return BlockResponse.from(block);
    }

    // 블록 이미지 삭제
    public BlockResponse deleteImage(Long blockId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Block block = blockRepository.findById(blockId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.BLOCK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(block.getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        if (block.getImageFile() != null) {
            fileService.delete(block.getImageFile());
            block.updateImage(null);
        }

        return BlockResponse.from(block);
    }
}
