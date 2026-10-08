-- 페이지 저장 충돌 감지용 버전 번호 추가 (기존 DB에서 한 번만 실행)
-- 블록을 저장할 때마다 1씩 올라가고, 오래된 버전으로 저장하려 하면 서버가 409로 거절해요.
ALTER TABLE pages ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER deleted_at;
