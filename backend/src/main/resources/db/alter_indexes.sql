-- 조회 속도를 위한 인덱스 추가 (기존 DB에서 한 번만 실행)
-- 이미 같은 이름의 인덱스가 있으면 "Duplicate key name" 오류가 나니, 그 줄만 건너뛰고 실행하세요.

-- 로그인 갱신·정리 작업
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expired ON refresh_tokens(expired_at);
CREATE INDEX idx_reset_tokens_expires ON password_reset_tokens(expires_at);

-- 작업: 스프린트/백로그 목록 정렬, 달력(시작일 범위), 마감 임박 알림(마감일)
CREATE INDEX idx_tasks_sprint_position ON tasks(sprint_id, position);
CREATE INDEX idx_tasks_workspace_sprint_position ON tasks(workspace_id, sprint_id, position);
CREATE INDEX idx_tasks_sprint_start ON tasks(sprint_id, start_date);
CREATE INDEX idx_tasks_workspace_start ON tasks(workspace_id, start_date);
CREATE INDEX idx_tasks_end_date ON tasks(end_date);

-- 페이지: 사이드바 트리(워크스페이스·상위 페이지·순서), 휴지통 자동 정리
-- (FK가 쓰던 workspace_id 인덱스는 새 복합 인덱스가 대신해서 기존 인덱스는 지워요)
CREATE INDEX idx_pages_workspace_parent_position ON pages(workspace_id, parent_page_id, position);
CREATE INDEX idx_pages_deleted ON pages(is_deleted, deleted_at);
DROP INDEX idx_pages_workspace ON pages;

-- 초대: 받은 초대 조회, 오래된 대기 초대 정리
CREATE INDEX idx_invites_email_status ON workspace_invites(email, status);
CREATE INDEX idx_invites_status_created ON workspace_invites(status, created_at);

-- 댓글: 블록·작업·대댓글을 작성 순서로 읽기
CREATE INDEX idx_comments_block_created ON comments(block_id, created_at);
CREATE INDEX idx_comments_task_created ON comments(task_id, created_at);
CREATE INDEX idx_comments_parent_created ON comments(parent_comment_id, created_at);
DROP INDEX idx_comments_block ON comments;

-- 활동: 사용자별·종류별 필터
CREATE INDEX idx_activity_workspace_user ON activities(workspace_id, user_id, created_at DESC);
CREATE INDEX idx_activity_workspace_type ON activities(workspace_id, type, created_at DESC);

-- 알림: 오래된 알림 정리
CREATE INDEX idx_notifications_created ON notifications(created_at);
