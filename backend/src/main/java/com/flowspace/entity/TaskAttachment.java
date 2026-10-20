package com.flowspace.entity;

import jakarta.persistence.*;
import lombok.*;

// 작업의 "관련 문서" 한 건이에요. 워크스페이스의 페이지를 연결한 것(page)이거나, 직접 올린 문서 파일(file)이에요.
// 둘 중 정확히 하나만 값이 있어요(DB의 chk_task_attachment_one이 지켜줘요).
@Entity
@Table(name = "task_attachments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class TaskAttachment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attachment_id")
    private Long attachmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id")
    private Page page;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id")
    private File file;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    public boolean isPage() {
        return page != null;
    }
}
