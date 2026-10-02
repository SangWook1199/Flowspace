package com.flowspace.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.flowspace.dto.notification.NotificationPageResponse;
import com.flowspace.dto.notification.NotificationResponse;
import com.flowspace.dto.notification.UnreadCountResponse;
import com.flowspace.entity.Notification;
import com.flowspace.entity.Task;
import com.flowspace.entity.TaskAssignee;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.entity.enums.NotificationType;
import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.NotificationRepository;
import com.flowspace.repository.TaskAssigneeRepository;
import com.flowspace.repository.TaskRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.websocket.NotificationWebSocketHandler;

import lombok.RequiredArgsConstructor;

// 알림 저장 · 조회 · 읽음 처리, 그리고 WebSocket으로 실시간 전달
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private static final int MAX_PAGE_SIZE = 50;

    // WebSocket으로 보내는 메시지의 type 값
    private static final String SOCKET_TYPE_NOTIFICATION = "NOTIFICATION";

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;
    private final NotificationWebSocketHandler socketHandler;

    // ---------- 알림 만들기 (다른 서비스에서 호출) ----------

    // 알림 한 건 저장 후 실시간 전달. 내가 일으킨 일은 나에게 알리지 않아요(recipient가 actor면 건너뜀).
    // 호출한 쪽의 트랜잭션에 같이 묶여서, 그쪽이 롤백되면 알림도 저장되지 않아요.
    @Transactional
    public void send(User recipient, User actor, Workspace workspace, NotificationType type, String message,
        Long refId, String linkPath) {

        if (recipient == null) {
            return;
        }

        if (actor != null && Objects.equals(actor.getUserId(), recipient.getUserId())) {
            return;
        }

        Notification notification = notificationRepository.save(Notification.builder().user(recipient).actor(actor)
            .workspace(workspace).type(type).message(truncate(message)).refId(refId).linkPath(linkPath).build());

        publish(recipient.getUserId(), NotificationResponse.from(notification));
    }

    // 여러 명에게 같은 알림 (같은 사람은 한 번만)
    @Transactional
    public void sendAll(Collection<User> recipients, User actor, Workspace workspace, NotificationType type,
        String message, Long refId, String linkPath) {

        Map<Long, User> unique = new LinkedHashMap<>();

        for (User recipient : recipients) {
            if (recipient != null) {
                unique.putIfAbsent(recipient.getUserId(), recipient);
            }
        }

        for (User recipient : unique.values()) {
            send(recipient, actor, workspace, type, message, refId, linkPath);
        }
    }

    // 특정 대상에 대한 알림을 읽음 처리 (초대를 수락/거절하면 그 초대 알림을 읽음으로)
    @Transactional
    public void markReadByRef(User user, NotificationType type, Long refId) {
        notificationRepository.findByUserAndTypeAndRefIdAndIsReadFalse(user, type, refId)
            .forEach(Notification::markRead);
    }

    // ---------- 조회 · 읽음 처리 (API) ----------

    // 내 알림 목록 (최신순)
    public NotificationPageResponse getNotifications(String email, int page, int size) {

        User user = getUser(email);

        Page<Notification> result = notificationRepository.findByUserOrderByCreatedAtDescNotificationIdDesc(user,
            PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE)));

        return NotificationPageResponse.from(result, notificationRepository.countByUserAndIsReadFalse(user));
    }

    // 읽지 않은 알림 수
    public UnreadCountResponse getUnreadCount(String email) {
        return new UnreadCountResponse(notificationRepository.countByUserAndIsReadFalse(getUser(email)));
    }

    // 알림 한 건 읽음
    @Transactional
    public void markRead(Long notificationId, String email) {
        getOwnNotification(notificationId, email).markRead();
    }

    // 모두 읽음
    @Transactional
    public void markAllRead(String email) {
        notificationRepository.markAllRead(getUser(email));
    }

    // 알림 한 건 삭제
    @Transactional
    public void delete(Long notificationId, String email) {
        notificationRepository.delete(getOwnNotification(notificationId, email));
    }

    // ---------- 정기 작업 (NotificationScheduler가 호출) ----------

    // 오늘·내일이 마감인데 아직 끝나지 않은 작업의 담당자에게 알려요(같은 날 같은 작업은 한 번만).
    @Transactional
    public int sendDueSoonNotifications() {

        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        int sent = 0;

        for (int plusDays = 0; plusDays <= 1; plusDays++) {

            String when = plusDays == 0 ? "오늘" : "내일";

            List<Task> tasks = taskRepository.findByEndDateAndStatus_CategoryNot(today.plusDays(plusDays),
                TaskStatusCategory.DONE);

            for (Task task : tasks) {

                for (TaskAssignee assignee : taskAssigneeRepository.findByTaskOrderByTaskAssigneeIdAsc(task)) {

                    User user = assignee.getUser();

                    if (notificationRepository.existsByUserAndTypeAndRefIdAndCreatedAtAfter(user,
                        NotificationType.TASK_DUE_SOON, task.getTaskId(), startOfToday)) {
                        continue;
                    }

                    send(user, null, task.getWorkspace(), NotificationType.TASK_DUE_SOON,
                        "'" + task.getTitle() + "' 작업의 마감이 " + when + "이에요.", task.getTaskId(), taskLink(task));
                    sent++;
                }
            }
        }

        return sent;
    }

    // 오래된 알림 정리 (보관 기간이 지난 알림 삭제)
    @Transactional
    public int deleteOldNotifications(int retentionDays) {
        return notificationRepository.deleteOlderThan(LocalDateTime.now().minusDays(retentionDays));
    }

    // ---------- 공통 ----------

    // 작업 알림을 누르면 가는 화면: 스프린트에 속한 작업이면 그 스프린트의 작업 화면, 아니면 칸반
    public static String taskLink(Task task) {
        return task.getSprint() == null ? "/kanban" : "/sprints/" + task.getSprint().getSprintId() + "/tasks";
    }

    // 커밋된 뒤에 보내요(롤백된 알림이 화면에 뜨지 않게). 트랜잭션 밖이면 바로 보내요.
    private void publish(Long userId, NotificationResponse payload) {

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    socketHandler.sendToUser(userId, SOCKET_TYPE_NOTIFICATION, payload);
                }
            });
        } else {
            socketHandler.sendToUser(userId, SOCKET_TYPE_NOTIFICATION, payload);
        }
    }

    private String truncate(String message) {
        return message != null && message.length() > 300 ? message.substring(0, 299) + "…" : message;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));
    }

    // 내 알림만 다룰 수 있어요
    private Notification getOwnNotification(Long notificationId, String email) {

        User user = getUser(email);

        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.NOTIFICATION_NOT_FOUND));

        if (!notification.getUser().getUserId().equals(user.getUserId())) {
            throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
        }

        return notification;
    }
}
