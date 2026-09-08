package com.flowspace.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.flowspace.dto.file.CoverResponse;
import com.flowspace.entity.File;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.FileRepository;
import com.flowspace.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class FileService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    private final FileRepository fileRepository;
    private final UserRepository userRepository;

    // 파일 업로드
    public File upload(MultipartFile multipartFile, Workspace workspace, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        try {

            String originalName = multipartFile.getOriginalFilename();

            String extension = "";
            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf("."));
            }

            String storedName = UUID.randomUUID() + extension;

            Path directory = Paths.get(uploadDir);
            Files.createDirectories(directory);

            Path target = directory.resolve(storedName);
            multipartFile.transferTo(target);

            File file = File.builder().workspace(workspace).uploadedBy(user).originalName(originalName)
                .storedName(storedName).mimeType(multipartFile.getContentType()).size(multipartFile.getSize())
                .width(null).height(null).fileUrl("/uploads/" + storedName).build();

            return fileRepository.save(file);

        } catch (IOException e) {
            throw new FlowSpaceException(ErrorCode.FILE_UPLOAD_FAILED);
        }
    }

    // 파일 삭제
    public void delete(File file) {

        if (!file.getFileUrl().startsWith("/covers/")) {
            try {
                Path path = Paths.get(uploadDir).resolve(file.getStoredName());
                Files.deleteIfExists(path);
            } catch (IOException e) {
                throw new FlowSpaceException(ErrorCode.FILE_DELETE_FAILED);
            }
        }

        fileRepository.delete(file);
    }

    // 기본 커버 File 생성
    public File createDefaultCover(String coverName, Workspace workspace, User user) {

        String fileName = coverName + ".jpg";

        ClassPathResource resource = new ClassPathResource("static/covers/" + fileName);

        String extension = fileName.substring(fileName.lastIndexOf(".") + 1);

        String mimeType = switch (extension.toLowerCase()) {
        case "png" -> "image/png";
        case "webp" -> "image/webp";
        default -> "image/jpeg";
        };

        if (!resource.exists()) {
            throw new FlowSpaceException(ErrorCode.FILE_NOT_FOUND);
        }

        File file = File.builder().workspace(workspace).uploadedBy(user).originalName(fileName).storedName(fileName)
            .mimeType(mimeType).size(0L).width(null).height(null).fileUrl("/covers/" + fileName).build();

        return fileRepository.save(file);
    }

    // 기본 커버 갤러리 조회
    @Transactional(readOnly = true)
    public List<CoverResponse> getCoverGallery() {

        try {
            Resource resource = new ClassPathResource("static/covers");
            Path path = resource.getFile().toPath();

            try (Stream<Path> files = Files.list(path)) {

                return files.filter(Files::isRegularFile).sorted(Comparator.comparing(p -> p.getFileName().toString()))
                    .map(file -> {
                        String fileName = file.getFileName().toString();
                        String name = fileName.substring(0, fileName.lastIndexOf('.'));

                        return new CoverResponse(name, "/covers/" + fileName);
                    }).toList();
            }

        } catch (IOException e) {
            throw new FlowSpaceException(ErrorCode.FILE_NOT_FOUND);
        }
    }
}