package com.flowspace.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
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

    private final FileRepository fileRepository;
    private final UserRepository userRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

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

    // 파일 복사 (페이지 복제용, 원본 파일이 없으면 null)
    public File copy(File source, Workspace workspace, User user) {

        // 기본 커버는 실제 파일 없이 정적 리소스를 가리키므로 행만 새로 만들어요.
        if (source.getFileUrl().startsWith("/covers/")) {

            File cover = File.builder().workspace(workspace).uploadedBy(user).originalName(source.getOriginalName())
                .storedName(source.getStoredName()).mimeType(source.getMimeType()).size(source.getSize())
                .width(source.getWidth()).height(source.getHeight()).fileUrl(source.getFileUrl()).build();

            return fileRepository.save(cover);
        }

        try {

            Path directory = Paths.get(uploadDir);
            Path sourcePath = directory.resolve(source.getStoredName());

            if (!Files.exists(sourcePath)) {
                return null;
            }

            String storedName = source.getStoredName();
            String extension = storedName.contains(".") ? storedName.substring(storedName.lastIndexOf(".")) : "";
            String copiedName = UUID.randomUUID() + extension;

            Files.copy(sourcePath, directory.resolve(copiedName), StandardCopyOption.REPLACE_EXISTING);

            File copied = File.builder().workspace(workspace).uploadedBy(user).originalName(source.getOriginalName())
                .storedName(copiedName).mimeType(source.getMimeType()).size(source.getSize()).width(source.getWidth())
                .height(source.getHeight()).fileUrl("/uploads/" + copiedName).build();

            return fileRepository.save(copied);

        } catch (IOException e) {
            throw new FlowSpaceException(ErrorCode.FILE_UPLOAD_FAILED);
        }
    }

    // 기본 커버 File 생성
    public File createDefaultCover(String coverName, Workspace workspace, User user) {

        // 커버 이름에 경로 문자가 섞여 있으면 static/covers 밖을 가리킬 수 있어서 막아요.
        if (coverName == null || coverName.isBlank() || coverName.contains("/") || coverName.contains("\\")
            || coverName.contains("..")) {
            throw new FlowSpaceException(ErrorCode.FILE_NOT_FOUND);
        }

        // 갤러리에는 실제 파일 확장자(png 등)로 올라가 있어서, 있는 확장자를 찾아서 써요.
        String fileName = coverName + ".png";
        ClassPathResource resource = new ClassPathResource("static/covers/" + fileName);

        for (String ext : List.of("png", "jpg", "jpeg", "webp")) {
            ClassPathResource candidate = new ClassPathResource("static/covers/" + coverName + "." + ext);
            if (candidate.exists()) {
                fileName = coverName + "." + ext;
                resource = candidate;
                break;
            }
        }

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

    // 프로필 이미지 저장
    public File uploadProfileImage(byte[] imageBytes, Workspace workspace, User user) {

        try {

            String storedName = UUID.randomUUID() + ".jpg";

            Path directory = Paths.get(uploadDir);
            Files.createDirectories(directory);

            Path target = directory.resolve(storedName);
            Files.write(target, imageBytes);

            File file = File.builder().workspace(workspace).uploadedBy(user).originalName("profile.jpg")
                .storedName(storedName).mimeType("image/jpeg").size((long) imageBytes.length).width(null).height(null)
                .fileUrl("/uploads/" + storedName).build();

            return fileRepository.save(file);

        } catch (IOException e) {
            throw new FlowSpaceException(ErrorCode.FILE_UPLOAD_FAILED);
        }
    }
}