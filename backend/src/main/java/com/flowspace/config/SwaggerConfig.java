package com.flowspace.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

        // Swagger OpenAPI 설정
        @Bean
        public OpenAPI openAPI() {

                final String securitySchemeName = "OAuth2";

                return new OpenAPI()
                                .info(new Info()
                                                .title("FlowSpace API")
                                                .description("FlowSpace 프로젝트 API 문서")
                                                .version("v1.0.0"))
                                .components(new Components()
                                                .addSecuritySchemes(
                                                                securitySchemeName,
                                                                new SecurityScheme()
                                                                                .type(SecurityScheme.Type.OAUTH2)
                                                                                .flows(new OAuthFlows()
                                                                                                .password(new OAuthFlow()
                                                                                                                .tokenUrl("/api/auth/token")
                                                                                                                .scopes(new Scopes())))))
                                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                                .externalDocs(new ExternalDocumentation()
                                                .description("FlowSpace GitHub"));
        }
}