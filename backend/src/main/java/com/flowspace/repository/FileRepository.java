package com.flowspace.repository;

import com.flowspace.entity.File;
import com.flowspace.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FileRepository extends JpaRepository<File, Long> {

    List<File> findByWorkspace(Workspace workspace);
}