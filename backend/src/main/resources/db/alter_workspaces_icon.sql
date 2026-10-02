-- 워크스페이스 아이콘(이모지) 컬럼 추가 (기존 DB에서 한 번만 실행)
ALTER TABLE workspaces ADD COLUMN icon VARCHAR(20) NULL AFTER color;
