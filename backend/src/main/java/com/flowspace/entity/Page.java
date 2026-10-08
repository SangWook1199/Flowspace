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

    @Column(name = "position", nullable = false)
    @Builder.Default
    private Integer position = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // 블록을 저장할 때마다 1씩 올라가는 번호예요. 오래된 화면이 최신 내용을 덮어쓰는 걸 막는 데 써요.
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    public void update(String title, String icon, File coverFile, Page parentPage) {
        this.title = title;
        this.icon = icon;
        this.coverFile = coverFile;
        this.parentPage = parentPage;
    }

    public void delete() {
        delete(LocalDateTime.now());
    }

    // 상위 페이지와 같은 시각으로 삭제해야 복원할 때 함께 삭제된 묶음을 구분할 수 있어요.
    public void delete(LocalDateTime deletedAt) {
        this.isDeleted = true;
        this.deletedAt = deletedAt;
    }

    // 블록 내용이 바뀔 때마다 부르는 버전 올리기
    public void bumpVersion() {
        this.version = (this.version == null ? 0L : this.version) + 1;
    }

    public void restore() {
        this.isDeleted = false;
        this.deletedAt = null;
    }

    public void updateParent(Page parentPage) {
        this.parentPage = parentPage;
    }

    public void updatePosition(Integer position) {
        this.position = position;
    }

    public void updateCover(File coverFile) {
        this.coverFile = coverFile;
    }
}