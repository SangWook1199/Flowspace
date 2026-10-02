-- 알림 테이블 추가 (기존 DB에서 한 번만 실행)
CREATE TABLE notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    actor_id BIGINT NULL,
    workspace_id BIGINT NULL,
    type VARCHAR(30) NOT NULL,
    message VARCHAR(300) NOT NULL,
    ref_id BIGINT NULL,
    link_path VARCHAR(255) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_notifications_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_user_created
ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread
ON notifications(user_id, is_read);
