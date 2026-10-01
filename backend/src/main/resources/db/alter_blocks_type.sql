-- 이미 만들어진 DB의 blocks.type 에 새 블록 타입(H3, TOGGLE, CALLOUT)을 추가하는 마이그레이션.
-- (신규 DB는 ddl.sql 에 이미 반영돼 있어서 실행하지 않아도 돼요.)
ALTER TABLE blocks
    MODIFY COLUMN type ENUM('TEXT', 'H1', 'H2', 'H3', 'TODO', 'BULLET', 'NUMBERED',
        'QUOTE', 'TOGGLE', 'CALLOUT', 'TASK', 'EVENT', 'SPRINT', 'DATABASE', 'IMAGE', 'FILE', 'DIVIDER', 'CODE')
        NOT NULL DEFAULT 'TEXT';
