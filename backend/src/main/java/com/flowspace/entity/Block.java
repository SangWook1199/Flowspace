package com.flowspace.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.flowspace.entity.enums.BlockType;

import java.math.BigDecimal;

@Entity
@Table(name = "blocks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Block extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "block_id")
    private Long blockId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id", nullable = false)
    private Page page;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "image_file_id")
    private File imageFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_block_id")
    private Block parentBlock;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    @Builder.Default
    private BlockType type = BlockType.TEXT;

    @Column(name = "position", nullable = false, precision = 20, scale = 10)
    private BigDecimal position;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content", columnDefinition = "json")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @OneToOne(mappedBy = "block", fetch = FetchType.LAZY)
    private BlockDatabase database;

    public void update(BlockType type, String content, User updatedBy) {
        this.type = type;
        this.content = content;
        this.updatedBy = updatedBy;
    }

    public void updateContent(String content, User updatedBy) {
        this.content = content;
        this.updatedBy = updatedBy;
    }

    public void updatePosition(BigDecimal position) {
        this.position = position;
    }

    public void updateParent(Block parentBlock) {
        this.parentBlock = parentBlock;
    }

    public void updateType(BlockType type) {
        this.type = type;
    }

    public void updateImage(File image) {
        this.imageFile = image;
    }
}