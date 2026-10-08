CREATE DATABASE IF NOT EXISTS flow_space
DEFAULT CHARACTER SET utf8mb4
DEFAULT COLLATE utf8mb4_unicode_ci;

USE flow_space;

CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NULL,
    nickname VARCHAR(30) NOT NULL,
    provider ENUM('LOCAL','GOOGLE','MICROSOFT', 'APPLE') DEFAULT 'LOCAL',
    provider_id VARCHAR(255),
    last_active_at DATETIME,
    bio VARCHAR(100) NULL,
    deleted_at DATETIME NULL,
    profile_file_id BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	UNIQUE(provider, provider_id)
);

CREATE TABLE workspaces (
    workspace_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    initials VARCHAR(4) NOT NULL,
    color ENUM('BLUE','PURPLE','GREEN','RED','ORANGE','PINK', 'GRAY','WHITE')
          NOT NULL DEFAULT 'BLUE',
    icon VARCHAR(20) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_owner
        FOREIGN KEY (owner_id) REFERENCES users(user_id)
);

ALTER TABLE users ADD last_workspace_id BIGINT NULL,
ADD CONSTRAINT fk_user_last_workspace FOREIGN KEY (last_workspace_id) REFERENCES workspaces(workspace_id) ON DELETE SET NULL;

CREATE TABLE workspace_invites (
    invite_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    inviter_id BIGINT NOT NULL,
    email VARCHAR(100) NOT NULL,
    status ENUM('PENDING','ACCEPTED','DECLINED') DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME NULL,
    CONSTRAINT fk_invite_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_inviter FOREIGN KEY (inviter_id) REFERENCES users(user_id)
);

CREATE TABLE workspace_members (
    member_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('OWNER', 'ADMIN', 'MEMBER') DEFAULT 'MEMBER',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_member_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(workspace_id, user_id)
);

CREATE TABLE files (
    file_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    uploaded_by BIGINT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    width INT NULL,
	height INT NULL,
    file_url VARCHAR(500) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_file_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_file_user FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

ALTER TABLE users ADD CONSTRAINT fk_user_profile FOREIGN KEY (profile_file_id) REFERENCES files(file_id) ON DELETE SET NULL;

CREATE TABLE pages (
    page_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    parent_page_id BIGINT NULL,
    title VARCHAR(200) NOT NULL DEFAULT '제목 없음',
    icon VARCHAR(20),
    cover_file_id BIGINT NULL,
    position INT NOT NULL DEFAULT 0,
    created_by BIGINT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
	deleted_at DATETIME,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_page_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_page_parent FOREIGN KEY (parent_page_id) REFERENCES pages(page_id) ON DELETE CASCADE,
    CONSTRAINT fk_page_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_page_cover FOREIGN KEY (cover_file_id) REFERENCES files(file_id) ON DELETE SET NULL
);

CREATE TABLE sprints (
    sprint_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    created_by BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    goal TEXT,
    description TEXT NULL,
    color ENUM('BLUE','PURPLE','GREEN','RED','ORANGE','PINK', 'GRAY','WHITE')
          NOT NULL DEFAULT 'BLUE',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('PLANNING', 'ACTIVE', 'COMPLETED') DEFAULT 'PLANNING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sprint_date CHECK (end_date >= start_date),
    CONSTRAINT fk_sprint_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_sprint_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE task_statuses (
    status_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    category ENUM('TODO','IN_PROGRESS','DONE') NOT NULL,
    color ENUM('BLUE','PURPLE','GREEN','RED','ORANGE','PINK', 'GRAY','WHITE')
          NOT NULL DEFAULT 'BLUE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO task_statuses (name, category, color)
VALUES
('TODO', 'TODO', 'GRAY'),
('IN_PROGRESS', 'IN_PROGRESS', 'BLUE'),
('DONE', 'DONE', 'GREEN');

CREATE TABLE workspace_task_statuses (
    workspace_id BIGINT NOT NULL,
    status_id BIGINT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    wip_limit INT NULL,
    PRIMARY KEY (workspace_id, status_id),
    CONSTRAINT fk_wts_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_wts_status FOREIGN KEY (status_id) REFERENCES task_statuses(status_id)
);

CREATE TABLE tasks (
    task_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    sprint_id BIGINT NULL,
    status_id BIGINT NOT NULL,
    task_number INT NOT NULL,
    position DECIMAL(20,10) NOT NULL DEFAULT 0,
    created_by BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    completed_at DATETIME NULL,
    priority ENUM('LOW','MEDIUM','HIGH') DEFAULT 'MEDIUM',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id),
    FOREIGN KEY (sprint_id) REFERENCES sprints(sprint_id),
    FOREIGN KEY (status_id) REFERENCES task_statuses(status_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT uk_task_workspace_number UNIQUE (workspace_id, task_number)
);

CREATE TABLE task_assignees (
	task_assignee_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    CONSTRAINT fk_task_assignee_task FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    CONSTRAINT fk_task_assignee_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT uk_task_assignee UNIQUE (task_id, user_id)
);

CREATE TABLE subtasks (
    subtask_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    assignee_id BIGINT NULL,
    content VARCHAR(300) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    position INT DEFAULT 0,
    CONSTRAINT fk_subtask_task FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    CONSTRAINT fk_subtask_assignee FOREIGN KEY (assignee_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE events (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    created_by BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    color ENUM('BLUE','PURPLE','GREEN', 'RED','ORANGE','PINK','GRAY','WHITE') NOT NULL DEFAULT 'PURPLE',
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_event_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT chk_event_time CHECK ( end_datetime IS NULL OR end_datetime >= start_datetime)
);

CREATE TABLE blocks (
    block_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    page_id BIGINT NOT NULL,
    task_id BIGINT NULL,
    event_id BIGINT NULL,
    sprint_id BIGINT NULL,
    image_file_id BIGINT NULL,
    parent_block_id BIGINT NULL,
    type ENUM('TEXT', 'H1', 'H2', 'H3', 'TODO', 'BULLET', 'NUMBERED',
		'QUOTE', 'TOGGLE', 'CALLOUT', 'TASK', 'EVENT', 'SPRINT', 'DATABASE', 'IMAGE', 'FILE', 'DIVIDER', 'CODE') NOT NULL DEFAULT 'TEXT',
    position DECIMAL(20,10) NOT NULL,
    content JSON NULL,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_block_page FOREIGN KEY (page_id) REFERENCES pages(page_id) ON DELETE CASCADE,
    CONSTRAINT fk_block_task  FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE SET NULL,
    CONSTRAINT fk_block_image FOREIGN KEY (image_file_id) REFERENCES files(file_id) ON DELETE SET NULL,
    CONSTRAINT fk_block_event  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL,
    CONSTRAINT fk_block_sprint FOREIGN KEY (sprint_id) REFERENCES sprints(sprint_id) ON DELETE SET NULL,
    CONSTRAINT fk_block_parent FOREIGN KEY (parent_block_id) REFERENCES blocks(block_id) ON DELETE CASCADE,
    CONSTRAINT fk_block_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_block_updater FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE block_databases (
    database_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    block_id BIGINT NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL DEFAULT '제목 없음',
    view_type ENUM('TABLE','DATABASE') NOT NULL DEFAULT 'TABLE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_block_database FOREIGN KEY (block_id) REFERENCES blocks(block_id) ON DELETE CASCADE
);

CREATE TABLE block_database_columns (
    column_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    database_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM(
    'TEXT','NUMBER','DATE','CHECKBOX','SELECT','TITLE',
    'MULTI_SELECT','STATUS','PERSON','URL','EMAIL','PHONE','CREATED_TIME'
	) NOT NULL DEFAULT 'TEXT',
    position INT NOT NULL DEFAULT 0,
    width INT NULL DEFAULT 200,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_database_column FOREIGN KEY (database_id) REFERENCES block_databases(database_id) ON DELETE CASCADE
);

CREATE TABLE block_database_rows (
    row_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    database_id BIGINT NOT NULL,
    page_id BIGINT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_database_row FOREIGN KEY (database_id) REFERENCES block_databases(database_id) ON DELETE CASCADE,
    CONSTRAINT fk_database_row_page FOREIGN KEY (page_id) REFERENCES pages(page_id) ON DELETE SET NULL
);

CREATE TABLE block_database_cells (
    row_id BIGINT NOT NULL,
    column_id BIGINT NOT NULL,
    value TEXT NULL,
    PRIMARY KEY (row_id, column_id),
    CONSTRAINT fk_database_cell_row FOREIGN KEY (row_id) REFERENCES block_database_rows(row_id) ON DELETE CASCADE,
    CONSTRAINT fk_database_cell_column FOREIGN KEY (column_id) REFERENCES block_database_columns(column_id) ON DELETE CASCADE
);

CREATE TABLE block_database_column_options (
    option_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    column_id BIGINT NOT NULL,
    value VARCHAR(100) NOT NULL,
    color ENUM('BLUE','PURPLE','GREEN','RED','ORANGE','PINK','GRAY','WHITE')
          NOT NULL DEFAULT 'GRAY',
	status_group ENUM('TODO','IN_PROGRESS','DONE') NULL,
    position INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_column_option FOREIGN KEY (column_id)
        REFERENCES block_database_columns(column_id) ON DELETE CASCADE
);

CREATE TABLE retrospectives (
    retrospective_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sprint_id BIGINT NOT NULL UNIQUE,
    page_id BIGINT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_retro_sprint FOREIGN KEY (sprint_id)  REFERENCES sprints(sprint_id) ON DELETE CASCADE,
    CONSTRAINT fk_retro_page FOREIGN KEY (page_id) REFERENCES pages(page_id) ON DELETE CASCADE
);

CREATE TABLE retrospective_status_snapshots (
    snapshot_status_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    retrospective_id BIGINT NOT NULL,
    original_status_id BIGINT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    position INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_snapshot_retrospective FOREIGN KEY (retrospective_id)
        REFERENCES retrospectives(retrospective_id) ON DELETE CASCADE
);

CREATE TABLE task_snapshots (
    snapshot_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    retrospective_id BIGINT NOT NULL,
    snapshot_status_id BIGINT NOT NULL,
    original_task_id BIGINT NULL,
    title VARCHAR(200) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    position DECIMAL(20,10) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_snapshot_retrospective FOREIGN KEY (retrospective_id) 
		REFERENCES retrospectives(retrospective_id) ON DELETE CASCADE,
    CONSTRAINT fk_task_snapshot_status FOREIGN KEY (snapshot_status_id)  
		REFERENCES retrospective_status_snapshots(snapshot_status_id) ON DELETE CASCADE
);

CREATE TABLE task_snapshot_assignees (
    snapshot_assignee_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    snapshot_id BIGINT NOT NULL,
    original_user_id BIGINT NULL,
    nickname VARCHAR(30) NOT NULL,
    profile_file_id BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_snapshot_assignee_snapshot FOREIGN KEY (snapshot_id)
        REFERENCES task_snapshots(snapshot_id)  ON DELETE CASCADE,
    CONSTRAINT fk_snapshot_assignee_profile FOREIGN KEY (profile_file_id)
        REFERENCES files(file_id) ON DELETE SET NULL
);

CREATE TABLE subtask_snapshots (
    subtask_snapshot_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    snapshot_id BIGINT NOT NULL,
    original_subtask_id BIGINT NULL,
    content VARCHAR(300) NOT NULL,
    is_completed BOOLEAN NOT NULL,
    assignee_name VARCHAR(50) NULL,
    assignee_profile_file_id BIGINT NULL,
    position INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subtask_snapshot FOREIGN KEY (snapshot_id)
        REFERENCES task_snapshots(snapshot_id) ON DELETE CASCADE,
    CONSTRAINT fk_subtask_snapshot_profile FOREIGN KEY (assignee_profile_file_id)
        REFERENCES files(file_id) ON DELETE SET NULL
);

CREATE TABLE comments (
    comment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NULL,
    block_id BIGINT NULL,
    user_id BIGINT NOT NULL,
    parent_comment_id BIGINT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_task FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_block FOREIGN KEY (block_id) REFERENCES blocks(block_id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_comment_parent FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE
);

CREATE TABLE activities (
    activity_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE refresh_tokens (
    token_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(500) NOT NULL,
    expired_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

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

-- 소셜 계정 연결 (alter_social_accounts_password_reset.sql과 같아요)
CREATE TABLE user_social_accounts (
    social_account_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider ENUM('LOCAL','GOOGLE','MICROSOFT', 'APPLE') NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, provider_id),
    CONSTRAINT fk_social_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 비밀번호 재설정 링크
CREATE TABLE password_reset_tokens (
    reset_token_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_created
ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread
ON notifications(user_id, is_read);
CREATE INDEX idx_pages_workspace_parent_position
ON pages(workspace_id, parent_page_id, position);
CREATE INDEX idx_pages_deleted
ON pages(is_deleted, deleted_at);
CREATE INDEX idx_blocks_page
ON blocks(page_id, position);
CREATE INDEX idx_tasks_workspace_status
ON tasks(workspace_id, status_id);
CREATE INDEX idx_workspace_task_status_position
ON workspace_task_statuses(workspace_id, position);
CREATE INDEX idx_task_assignees_task
ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user
ON task_assignees(user_id);
CREATE INDEX idx_subtasks_task
ON subtasks(task_id, position);
CREATE INDEX idx_events_workspace
ON events(workspace_id, start_datetime);
CREATE INDEX idx_comments_block_created
ON comments(block_id, created_at);
CREATE INDEX idx_comments_task_created
ON comments(task_id, created_at);
CREATE INDEX idx_comments_parent_created
ON comments(parent_comment_id, created_at);
CREATE INDEX idx_activity_workspace
ON activities(workspace_id, created_at DESC);
CREATE INDEX idx_activity_workspace_user
ON activities(workspace_id, user_id, created_at DESC);
CREATE INDEX idx_activity_workspace_type
ON activities(workspace_id, type, created_at DESC);
CREATE INDEX idx_workspace_member_user
ON workspace_members(user_id);
CREATE INDEX idx_users_last_workspace
ON users(last_workspace_id);
CREATE INDEX idx_task_snapshots_retro_status
ON task_snapshots(retrospective_id, snapshot_status_id);
CREATE INDEX idx_snapshot_assignees_snapshot
ON task_snapshot_assignees(snapshot_id);
CREATE INDEX idx_subtask_snapshots_snapshot
ON subtask_snapshots(snapshot_id, position);

CREATE INDEX idx_tasks_sprint_position
ON tasks(sprint_id, position);
CREATE INDEX idx_tasks_workspace_sprint_position
ON tasks(workspace_id, sprint_id, position);
CREATE INDEX idx_tasks_sprint_start
ON tasks(sprint_id, start_date);
CREATE INDEX idx_tasks_workspace_start
ON tasks(workspace_id, start_date);
CREATE INDEX idx_tasks_end_date
ON tasks(end_date);
CREATE INDEX idx_refresh_tokens_token
ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expired
ON refresh_tokens(expired_at);
CREATE INDEX idx_reset_tokens_expires
ON password_reset_tokens(expires_at);
CREATE INDEX idx_invites_email_status
ON workspace_invites(email, status);
CREATE INDEX idx_invites_status_created
ON workspace_invites(status, created_at);
CREATE INDEX idx_notifications_created
ON notifications(created_at);
