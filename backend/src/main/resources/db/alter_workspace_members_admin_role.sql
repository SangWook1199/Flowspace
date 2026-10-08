-- 워크스페이스 멤버 역할에 ADMIN(관리자) 추가 (기존 DB에서 한 번만 실행)
ALTER TABLE workspace_members
    MODIFY COLUMN role ENUM('OWNER', 'ADMIN', 'MEMBER') DEFAULT 'MEMBER';
