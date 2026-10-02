package com.flowspace.config;

import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir}")
    private String uploadDir;

    // 업로드한 파일(/uploads/**)을 디스크 폴더에서 바로 내려주도록 연결해요.
    // 기본 커버는 static/covers 안에 있어서 별도 설정 없이 /covers/** 로 열려요.
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        String location = Paths.get(uploadDir).toAbsolutePath().toUri().toString();

        if (!location.endsWith("/")) {
            location = location + "/";
        }

        registry.addResourceHandler("/uploads/**").addResourceLocations(location);
    }
}