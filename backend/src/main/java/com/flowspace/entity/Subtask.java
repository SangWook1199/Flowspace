package com.flowspace.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "subtasks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SubTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subtask_id")
    private Long subtaskId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id", nullable = true)
    private User assignee;

    @Column(name = "content", nullable = false, length = 300)
    private String content;

    @Column(name = "is_completed", nullable = false)
    @Builder.Default
    private Boolean isCompleted = false;

    @Column(name = "position", nullable = false)
    @Builder.Default
    private Integer position = 0;

    public void update(String content, User assignee) {
        this.content = content;
        this.assignee = assignee;
    }

    public void updateCompleted(Boolean isCompleted) {
        this.isCompleted = isCompleted;
    }

    public void updatePosition(Integer position) {
        this.position = position;
    }
}