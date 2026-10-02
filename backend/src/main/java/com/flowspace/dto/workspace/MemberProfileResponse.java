package com.flowspace.dto.workspace;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.flowspace.entity.Task;
import com.flowspace.entity.enums.TaskPriority;
import com.flowspace.entity.enums.WorkspaceRole;
import com.flowspace.service.NotificationService;

// @formatter:off

// 멤버 프로필 카드 응답 DTO (이 워크스페이스 안에서의 정보만 담아요)
public record MemberProfileResponse(

    Long userId,
    String nickname,
    String email,
    String bio,
    String profileImageUrl,
    WorkspaceRole role,
    LocalDateTime joinedAt,
    boolean online,
    LocalDateTime lastActiveAt,
    long openTaskCount,
    long doneTaskCount,
    List<TaskItem> tasks

) {

    // 맡고 있는 작업 한 줄 (link: 눌렀을 때 이동할 화면 경로)
    public record TaskItem(

        Long taskId,
        String title,
        LocalDate endDate,
        TaskPriority priority,
        String statusName,
        String link

    ) {

        public static TaskItem from(Task task) {
            return new TaskItem(
                task.getTaskId(),
                task.getTitle(),
                task.getEndDate(),
                task.getPriority(),
                task.getStatus().getName(),
                NotificationService.taskLink(task)
            );
        }
    }
}

// @formatter:on
