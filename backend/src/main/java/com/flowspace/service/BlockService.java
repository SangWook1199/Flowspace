package com.flowspace.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.flowspace.dto.block.BlockCreateRequest;
import com.flowspace.dto.block.BlockIndentRequest;
import com.flowspace.dto.block.BlockOrderItem;
import com.flowspace.dto.block.BlockReorderRequest;
import com.flowspace.dto.block.BlockResponse;
import com.flowspace.dto.block.BlockUpdateRequest;
import com.flowspace.entity.Block;
import com.flowspace.entity.Event;
import com.flowspace.entity.Page;
import com.flowspace.entity.Task;
import com.flowspace.entity.File;
import com.flowspace.entity.User;
import com.flowspace.entity.enums.BlockType;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.BlockRepository;
import com.flowspace.repository.EventRepository;
import com.flowspace.repository.PageRepository;
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
    private final FileService fileService;

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

        Task task = null;
        if (type == BlockType.TASK) {
            task = taskRepository.findById(request.taskId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

            if (!task.getWorkspace().getWorkspaceId().equals(page.getWorkspace().getWorkspaceId())) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }
        }

        Event event = null;
        if (type == BlockType.EVENT) {
            event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.EVENT_NOT_FOUND));

            if (!event.getWorkspace().getWorkspaceId().equals(page.getWorkspace().getWorkspaceId())) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }
        }

        BigDecimal position = BigDecimal.valueOf(blockRepository.findByPageOrderByPositionAsc(page).size());

        Block block = Block.builder().page(page).parentBlock(parent).task(task).event(event).type(type)
            .position(position).content(request.content()).createdBy(user).build();

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

    // 블록 이미지 업로드
    public BlockResponse uploadImage(Long blockId, MultipartFile multipartFile, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Block block = blockRepository.findById(blockId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.BLOCK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(block.getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        // 이미지 파일만 허용
        if (multipartFile.getContentType() == null || !multipartFile.getContentType().startsWith("image/")) {
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
