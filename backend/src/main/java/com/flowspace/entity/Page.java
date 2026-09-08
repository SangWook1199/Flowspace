package com.flowspace.entity;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Page extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "page_id")
    private Long pageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_page_id")
    private Page parentPage;

    @Column(name = "title", nullable = false, length = 200)
    @Builder.Default
    private String title = "제목 없음";

    @Column(name = "icon", length = 20)
    private String icon;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cover_file_id")
    private File coverFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public void update(String title, String icon, File coverFile, Page parentPage) {
        this.title = title;
        this.icon = icon;
        this.coverFile = coverFile;
        this.parentPage = parentPage;
    }

    public void delete() {
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
    }

    public void updateCover(File coverFile) {
        this.coverFile = coverFile;
    }
}