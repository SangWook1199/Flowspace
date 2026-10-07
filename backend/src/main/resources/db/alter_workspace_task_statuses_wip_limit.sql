-- workspace_task_statuses.wip_limit 컬럼 추가 (기존 DB에서 한 번만 실행)
-- 칸반 컬럼의 작업 수 제한(WIP). 비어 있으면 제한 없음이고, 넘어도 작업을 막지는 않고 화면에서 표시만 해요.
ALTER TABLE workspace_task_statuses ADD COLUMN wip_limit INT NULL AFTER is_default;
