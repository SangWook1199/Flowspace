package com.flowspace.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "task_assignees", uniqueConstraints = @UniqueConstraint(name = "uk_task_assignee", columnNames = {
        "task_id", "user_id" }))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class TaskAssignee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "task_assignee_id")
    private Long taskAssigneeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}