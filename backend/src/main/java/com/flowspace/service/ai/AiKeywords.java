package com.flowspace.service.ai;

import java.util.List;
import java.util.Locale;

// 작업 제목에서 낱말을 찾는 도구예요. 띄어쓰기와 대소문자는 무시해요("DB 설계" = "db설계").
// 짧은 영어 낱말(ui, api, db처럼 3글자 이하)은 다른 영어 단어의 일부일 때는 찾지 않아요(build 안의 ui, form 안의 orm은 아니에요).
// 그 판단은 띄어쓰기를 지키는 원래 글에서 해요("REST API"의 api는 찾아야 하니까요).
final class AiKeywords {

    private AiKeywords() {
    }

    // 소문자로 바꾸고 모든 공백을 없애요.
    static String squash(String text) {
        return text == null ? "" : text.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    static boolean hasAny(String text, List<String> words) {

        String key = squash(text);
        String lower = text == null ? "" : text.toLowerCase(Locale.ROOT);

        for (String word : words) {
            if (isShortAscii(word) ? contains(lower, word) : key.contains(word)) {
                return true;
            }
        }

        return false;
    }

    // text에서 word를 찾아요. word가 짧은 영어 낱말이면 앞뒤가 영어·숫자가 아닐 때만 찾은 걸로 쳐요.
    static boolean contains(String text, String word) {

        int from = 0;

        while (true) {

            int index = text.indexOf(word, from);

            if (index < 0) {
                return false;
            }

            if (!isShortAscii(word) || (!isAsciiAlnum(charBefore(text, index)) && !isAsciiAlnum(charAfter(text, index + word.length())))) {
                return true;
            }

            from = index + 1;
        }
    }

    private static boolean isShortAscii(String word) {
        return word.length() <= 3 && word.chars().allMatch(c -> c < 128);
    }

    private static char charBefore(String text, int index) {
        return index == 0 ? ' ' : text.charAt(index - 1);
    }

    private static char charAfter(String text, int index) {
        return index >= text.length() ? ' ' : text.charAt(index);
    }

    private static boolean isAsciiAlnum(char c) {
        return (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
    }
}
