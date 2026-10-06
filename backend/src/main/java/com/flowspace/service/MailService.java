package com.flowspace.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 메일 발송. 요청 처리를 기다리게 하지 않으려고 따로 돌려요(@Async).
// 메일 서버 설정(spring.mail.*)이 없거나 발송에 실패하면 서버 로그에만 남기고 넘어가요(요청은 실패시키지 않아요).
@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    // 보내는 사람 주소: 비우면 메일 계정(spring.mail.username)을 써요. Gmail은 계정과 같은 주소여야 해요.
    @Value("${app.mail.from:${spring.mail.username:}}")
    private String from;

    @Async
    public void sendPasswordReset(String to, String link, int validMinutes) {

        JavaMailSender sender = mailSenderProvider.getIfAvailable();

        if (sender == null || from == null || from.isBlank()) {
            log.warn("메일 설정(spring.mail.*)이 없어 메일을 보내지 못했어요. 개발 중이면 아래 링크로 직접 들어가 보세요. to={}, link={}", to, link);
            return;
        }

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

            helper.setFrom(from, "Flowspace");
            helper.setTo(to);
            helper.setSubject("[Flowspace] 비밀번호 재설정 안내");
            helper.setText(passwordResetHtml(link, validMinutes), true);

            sender.send(message);
            log.info("비밀번호 재설정 메일을 보냈어요. to={}", to);
        } catch (Exception e) {
            log.error("비밀번호 재설정 메일을 보내지 못했어요. to={}", to, e);
        }
    }

    private String passwordResetHtml(String link, int validMinutes) {

        String href = HtmlUtils.htmlEscape(link);

        return """
            <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2a3d">
              <h2 style="margin:0 0 16px">비밀번호 재설정</h2>
              <p style="line-height:1.6">아래 버튼을 눌러 새 비밀번호를 정해 주세요. 링크는 %d분 동안만 쓸 수 있고, 한 번 쓰면 사라져요.</p>
              <p style="margin:24px 0">
                <a href="%s" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600">비밀번호 재설정하기</a>
              </p>
              <p style="line-height:1.6;color:#64748b;font-size:13px">버튼이 안 눌리면 아래 주소를 브라우저에 붙여 넣어 주세요.<br>%s</p>
              <p style="line-height:1.6;color:#64748b;font-size:13px">비밀번호 재설정을 요청하지 않았다면 이 메일은 무시하셔도 돼요. 비밀번호는 바뀌지 않아요.</p>
            </div>
            """.formatted(validMinutes, href, href);
    }
}
