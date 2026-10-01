-- 페이지 표시 순서 컬럼 추가 (기존 DB에서 한 번만 실행)
ALTER TABLE pages ADD COLUMN position INT NOT NULL DEFAULT 0 AFTER cover_file_id;

-- 같은 상위 페이지 안에서 생성 순서대로 0부터 번호를 매겨요.
UPDATE pages p
JOIN (
    SELECT page_id,
           ROW_NUMBER() OVER (PARTITION BY workspace_id, parent_page_id ORDER BY created_at, page_id) - 1 AS rn
    FROM pages
) t ON p.page_id = t.page_id
SET p.position = t.rn;
