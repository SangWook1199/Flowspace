package com.flowspace.repository;

import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

    // 사용자가 속한 워크스페이스 멤버 조회
    List<Workspace> findByOwner(User owner);
}