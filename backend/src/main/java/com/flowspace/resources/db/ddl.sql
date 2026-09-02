CREATE DATABASE IF NOT EXISTS flow_space
DEFAULT CHARACTER SET utf8mb4
DEFAULT COLLATE utf8mb4_unicode_ci;
USE flow_space;

CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NULL,
    name VARCHAR(30) NOT NULL,
    nickname VARCHAR(30) UNIQUE,
    provider ENUM('LOCAL','GOOGLE','KAKAO') DEFAULT 'LOCAL',
    provider_id VARCHAR(255),
    status ENUM('ONLINE','OFFLINE') DEFAULT 'OFFLINE',
    last_active_at DATETIME,
    profile_file_id BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	UNIQUE(provider, provider_id)
);

CREATE TABLE workspaces (
    workspace_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_owner FOREIGN KEY (owner_id) REFERENCES users(user_id)
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
    role ENUM('OWNER', 'MEMBER') DEFAULT 'MEMBER',
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
    created_by BIGINT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
	deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_page_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_page_parent FOREIGN KEY (parent_page_id) REFERENCES pages(page_id) ON DELETE CASCADE,
    CONSTRAINT fk_page_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_page_cover FOREIGN KEY (cover_file_id) REFERENCES files(file_id) ON DELETE SET NULL
);

CREATE TABLE blocks (
    block_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    page_id BIGINT NOT NULL,
    parent_block_id BIGINT NULL,
    type VARCHAR(30) NOT NULL  DEFAULT 'TEXT',
    position DECIMAL(20,10) NOT NULL,
    content JSON NULL,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_block_page FOREIGN KEY (page_id) REFERENCES pages(page_id) ON DELETE CASCADE,
    CONSTRAINT fk_block_parent FOREIGN KEY (parent_block_id) REFERENCES blocks(block_id) ON DELETE CASCADE,
    CONSTRAINT fk_block_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_block_updater FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE sprints (
    sprint_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    created_by BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date >= start_date),
    status ENUM('PLANNING', 'ACTIVE', 'COMPLETED') DEFAULT 'PLANNING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sprint_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_sprint_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE tasks (
    task_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    block_id BIGINT NOT NULL UNIQUE,
    sprint_id BIGINT NULL,
    created_by BIGINT NOT NULL,
    assignee_id BIGINT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    completed_at DATETIME NULL,
    status ENUM('TODO', 'DOING', 'DONE') DEFAULT 'TODO',
    priority ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_task_block FOREIGN KEY (block_id) REFERENCES blocks(block_id) ON DELETE CASCADE,
    CONSTRAINT fk_task_sprint FOREIGN KEY (sprint_id) REFERENCES sprints(sprint_id) ON DELETE SET NULL,
    CONSTRAINT fk_task_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_id) REFERENCES users(user_id)
);

CREATE TABLE subtasks (
    subtask_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    content VARCHAR(300) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    position INT DEFAULT 0,
    CONSTRAINT fk_subtask_task FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);

CREATE TABLE events (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    page_id BIGINT NULL,
    created_by BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type ENUM('MEETING',  'PRESENTATION', 'REVIEW', 'CUSTOM') DEFAULT 'CUSTOM',
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule VARCHAR(100) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_event_page FOREIGN KEY (page_id) REFERENCES pages(page_id) ON DELETE SET NULL,
    CONSTRAINT fk_event_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT chk_event_time CHECK ( end_datetime IS NULL OR end_datetime >= start_datetime)
);

CREATE TABLE comments (
    comment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    block_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_comment_id BIGINT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_block FOREIGN KEY (block_id) REFERENCES blocks(block_id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_comment_parent FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE
);

CREATE TABLE activities (
    activity_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    type ENUM('CREATE_PAGE', 'EDIT_BLOCK', 'CREATE_TASK', 'MOVE_TASK', 'COMPLETE_TASK', 'CREATE_COMMENT') NOT NULL,
    target_type VARCHAR(30) NOT NULL,
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
CREATE INDEX idx_pages_workspace
ON pages(workspace_id);
CREATE INDEX idx_blocks_page
ON blocks(page_id, position);
CREATE INDEX idx_tasks_workspace
ON tasks(workspace_id, status);
CREATE INDEX idx_tasks_assignee
ON tasks(assignee_id);
CREATE INDEX idx_events_workspace
ON events(workspace_id, start_datetime);
CREATE INDEX idx_comments_block
ON comments(block_id);
CREATE INDEX idx_activity_workspace
ON activities(workspace_id, created_at DESC);
CREATE INDEX idx_workspace_member_user
ON workspace_members(user_id);
CREATE INDEX idx_users_last_workspace
ON users(last_workspace_id);