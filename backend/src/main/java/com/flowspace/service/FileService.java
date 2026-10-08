package com.flowspace.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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

    // 올릴 수 없는 확장자예요. 업로드한 파일은 /uploads 주소에서 그대로 열리는데, 브라우저가 HTML·SVG·스크립트를 열면
    // 그 안의 코드가 이 서비스의 주소에서 실행될 수 있어서 처음부터 받지 않아요.
    private static final Set<String> BLOCKED_EXTENSIONS = Set.of("html", "htm", "xhtml", "shtml", "svg", "svgz", "xml",
        "xsl", "xslt", "js", "mjs", "jsp", "php", "asp", "aspx", "swf");

    // 이미지로 올릴 수 있는 확장자예요(SVG는 스크립트를 담을 수 있어서 제외해요).
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "webp", "bmp", "avif");

    // 파일 업로드 (파일 블록처럼 종류를 가리지 않는 첨부)
    public File upload(MultipartFile multipartFile, Workspace workspace, String email) {
        return store(multipartFile, workspace, email, false);
    }

    // 이미지 업로드 (커버·프로필·이미지 블록). 확장자·Content-Type·파일 첫 바이트가 모두 이미지여야 해요.
    public File uploadImage(MultipartFile multipartFile, Workspace workspace, String email) {
        return store(multipartFile, workspace, email, true);
    }

    // 실제 저장 처리: 확장자를 소문자 영숫자로 정리해서 쓰고, 막은 확장자·이미지가 아닌 파일은 거절해요.
    private File store(MultipartFile multipartFile, Workspace workspace, String email, boolean imageOnly) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        String originalName = multipartFile.getOriginalFilename();
        String extension = extensionOf(originalName);

        if (BLOCKED_EXTENSIONS.contains(extension)) {
            throw new FlowSpaceException(ErrorCode.UNSUPPORTED_FILE_TYPE);
        }

        if (imageOnly) {
            validateImage(multipartFile, extension);
        }

        try {

            String storedName = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);

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

    // 파일 이름의 마지막 확장자를 소문자로 돌려줘요. 영숫자 10자 이하가 아니면(경로 문자 등) 확장자 없음으로 봐요.
    private String extensionOf(String originalName) {

        if (originalName == null || !originalName.contains(".")) {
            return "";
        }

        String extension = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);

        return extension.matches("[a-z0-9]{1,10}") ? extension : "";
    }

    // 이미지 파일인지 확인해요: 허용한 확장자 + image/* (SVG 제외) + 파일 맨 앞 바이트가 실제 이미지 형식.
    private void validateImage(MultipartFile multipartFile, String extension) {

        String contentType = multipartFile.getContentType() == null ? ""
            : multipartFile.getContentType().toLowerCase(Locale.ROOT);

        if (!contentType.startsWith("image/") || contentType.contains("svg") || !IMAGE_EXTENSIONS.contains(extension)) {
            throw new FlowSpaceException(ErrorCode.INVALID_IMAGE_FILE);
        }

        byte[] head = new byte[12];
        int length;

        try (InputStream in = multipartFile.getInputStream()) {
            length = in.readNBytes(head, 0, head.length);
        } catch (IOException e) {
            throw new FlowSpaceException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        if (!hasImageSignature(head, length)) {
            throw new FlowSpaceException(ErrorCode.INVALID_IMAGE_FILE);
        }
    }

    // PNG·JPEG·GIF·WEBP·BMP·AVIF 중 하나의 시작 바이트와 맞는지 봐요.
    private boolean hasImageSignature(byte[] h, int length) {

        boolean png = length >= 4 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G';
        boolean jpeg = length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF;
        boolean gif = length >= 4 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8';
        boolean webp = length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F' && h[8] == 'W'
            && h[9] == 'E' && h[10] == 'B' && h[11] == 'P';
        boolean bmp = length >= 2 && h[0] == 'B' && h[1] == 'M';
        boolean avif = length >= 12 && h[4] == 'f' && h[5] == 't' && h[6] == 'y' && h[7] == 'p';

        return png || jpeg || gif || webp || bmp || avif;
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