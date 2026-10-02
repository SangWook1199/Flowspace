package com.flowspace.service;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// 댓글 본문의 @멘션을 읽어요. 멘션은 글 안에 "@[이름](사용자id)" 모양으로 저장돼요(예: "@[민수](12) 확인 부탁해요").
// 화면(utils/mention.js)이 이 모양으로 저장하고, 서버는 여기서 멘션된 사용자 id를 뽑아 알림을 보내요.
public final class MentionParser {

    private static final Pattern TOKEN = Pattern.compile("@\\[([^\\]\\n]+)\\]\\((\\d+)\\)");

    private MentionParser() {
    }

    // 본문에서 멘션된 사용자 id들 (나온 순서, 중복 없이)
    public static Set<Long> extractUserIds(String content) {

        Set<Long> ids = new LinkedHashSet<>();

        if (content == null) {
            return ids;
        }

        Matcher matcher = TOKEN.matcher(content);

        while (matcher.find()) {
            try {
                ids.add(Long.parseLong(matcher.group(2)));
            } catch (NumberFormatException e) {
                // 숫자가 너무 커서 사용자 id가 아닌 값은 무시해요.
            }
        }

        return ids;
    }

    // 멘션을 "@이름"으로 풀어 쓴 글 (알림 미리보기용)
    public static String toPlain(String content) {

        if (content == null) {
            return "";
        }

        return TOKEN.matcher(content).replaceAll(match -> "@" + Matcher.quoteReplacement(match.group(1)));
    }
}
