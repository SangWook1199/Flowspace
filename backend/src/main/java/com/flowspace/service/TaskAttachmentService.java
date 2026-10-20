package com.flowspace.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.flowspace.dto.task.TaskAttachmentPageRequest;
import com.flowspace.dto.task.TaskAttachmentResponse;
import com.flowspace.entity.File;
import com.flowspace.entity.Page;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskAttachment;
import com.flowspace.entity.User;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.PageRepository;
import com.flowspace.repository.TaskAttachmentRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;

import lombok.RequiredArgsConstructor;

// 작업의 "관련 문서": 페이지를 연결하거나 문서 파일(엑셀·워드·한글·PDF 등)을 올려 둬요.
// 작업을 볼 수 있는 워크스페이스 멤버라면 누구나 추가하고 지울 수 있어요(작업·하위 작업 편집 권한과 같아요).
@Service
@RequiredArgsConstructor
@Transactional
public class TaskAttachmentService {

    // 한 작업에 붙일 수 있는 관련 문서 수예요.
    static final int MAX_ATTACHMENTS_PER_TASK = 30;

    private final TaskAttachmentRepository taskAttachmentRepository;
    private final TaskRepository taskRepository;
    private final PageRepository pageRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final FileService fileService;

    // 관련 문서 목록 (휴지통에 있는 페이지는 빼요)
    @Transactional(readOnly = true)
    public List<TaskAttachmentResponse> getAttachments(Long taskId, String email) {

        Task task = loadTaskForMember(taskId, email).task();

        return taskAttachmentRepository.findByTaskOrderByAttachmentIdAsc(task).stream()
            .filter(attachment -> !attachment.isPage() || !attachment.getPage().getIsDeleted())
            .map(TaskAttachmentResponse::from).toList();
    }

    // 페이지 연결
    public TaskAttachmentResponse addPage(Long taskId, TaskAttachmentPageRequest request, String email) {

        TaskAndUser loaded = loadTaskForMember(taskId, email);
        Task task = loaded.task();

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(request.pageId())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        // 다른 워크스페이스의 페이지는 연결할 수 없어요.
        if (!page.getWorkspace().getWorkspaceId().equals(task.getWorkspace().getWorkspaceId())) {
            throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
        }

        if (taskAttachmentRepository.existsByTaskAndPage(task, page)) {
            throw new FlowSpaceException(ErrorCode.TASK_ATTACHMENT_ALREADY_EXISTS);
        }

        checkLimit(task);

        TaskAttachment attachment = TaskAttachment.builder().task(task).page(page).createdBy(loaded.user()).build();

        return TaskAttachmentResponse.from(taskAttachmentRepository.save(attachment));
    }

    // 문서 파일 올리기
    public TaskAttachmentResponse addFile(Long taskId, MultipartFile multipartFile, String email) {

        TaskAndUser loaded = loadTaskForMember(taskId, email);
        Task task = loaded.task();

        checkLimit(task);

        File file = fileService.uploadDocument(multipartFile, task.getWorkspace(), email);

        TaskAttachment attachment = TaskAttachment.builder().task(task).file(file).createdBy(loaded.user()).build();

        return TaskAttachmentResponse.from(taskAttachmentRepository.save(attachment));
    }

    // 관련 문서 삭제 (올린 파일이면 서버의 파일도 같이 지워요)
    public void deleteAttachment(Long taskId, Long attachmentId, String email) {

        Task task = loadTaskForMember(taskId, email).task();

        TaskAttachment attachment = taskAttachmentRepository.findByAttachmentIdAndTask(attachmentId, task)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_ATTACHMENT_NOT_FOUND));

        File file = attachment.getFile();

        taskAttachmentRepository.delete(attachment);
        taskAttachmentRepository.flush();

        if (file != null) {
            fileService.delete(file);
        }
    }

    private void checkLimit(Task task) {

        if (taskAttachmentRepository.countByTask(task) >= MAX_ATTACHMENTS_PER_TASK) {
            throw new FlowSpaceException(ErrorCode.TASK_ATTACHMENT_LIMIT);
        }
    }

    // 작업을 찾고, 요청한 사람이 그 워크스페이스 멤버인지 확인해요.
    private TaskAndUser loadTaskForMember(Long taskId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Task task = taskRepository.findById(taskId).orElseThrow(() -> new FlowSpaceException(ErrorCode.TASK_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(task.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return new TaskAndUser(task, user);
    }

    private record TaskAndUser(Task task, User user) {
    }
}
