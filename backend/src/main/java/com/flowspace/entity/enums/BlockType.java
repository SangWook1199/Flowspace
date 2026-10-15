package com.flowspace.entity.enums;

public enum BlockType {
    TEXT, H1, H2, H3, TODO, BULLET, NUMBERED, QUOTE, TOGGLE, CALLOUT, TASK, EVENT, SPRINT, DATABASE, IMAGE, FILE,
    DIVIDER, CODE,
    // 열 나누기(2열/3열): COLUMN_LIST 아래에 COLUMN이 자식으로 달리고, 열 안의 내용은 COLUMN의 자식이에요(content.width = 열 비율).
    COLUMN_LIST, COLUMN
}