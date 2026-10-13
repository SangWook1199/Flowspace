package com.flowspace.service.ai;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.flowspace.dto.ai.AiDraftLimits;

// 모델이 쓴 글을 화면에 보여줘도 되는 평문으로 정리하는 규칙이에요(마크다운·HTML 제거, 길이 제한, 조사 교정 등).
final class AiText {

    // "스프린트 1:", "Sprint 2 -" 같은 번호 접두사(화면이 이미 순서를 보여줘서 이름에는 필요 없어요)
    private static final Pattern SPRINT_PREFIX = Pattern.compile(
        "^\\s*(?:스프린트|sprint)\\s*\\d+\\s*(?:[:：.)\\-–—]\\s*)?", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    // 모델이 가끔 한국어 문장 중간에 중국어(한자)나 일본어를 섞어 써요.
    private static final Pattern FOREIGN_SCRIPT = Pattern.compile("[\\p{IsHan}\\p{IsHiragana}\\p{IsKatakana}]+");

    // 한글 낱말 뒤에 붙은 '와/과'(낱말 끝에서만)
    private static final Pattern PARTICLE = Pattern.compile("([가-힣]+)(과|와)(?=[\\s,.)]|$)");

    // 받침이 없는 글자 뒤에 오지만 조사가 아니라 낱말의 일부인 '과'
    private static final List<String> GWA_NOUNS = List.of("효과", "사과", "교과", "외과", "내과", "부과", "초과", "인과", "대과",
        "전과", "약과", "이과", "문과", "치과", "소아과", "피부과", "총무과", "인사과", "재무과");

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]*>");
    private static final Pattern LEADING_MARK = Pattern.compile("^[#>*\\-\\s]+");
    private static final Pattern SPACES = Pattern.compile("[\\p{Cntrl}\\s]+");
    private static final Pattern LINE_SPACES = Pattern.compile("[\\p{Cntrl}\\s&&[^\\n]]+");

    private AiText() {
    }

    // 한 줄 글: HTML 태그·마크다운 기호·제어문자를 지우고 공백을 하나로 모아요. 비어 있으면 빈 문자열이에요.
    static String clean(String value, int max) {

        if (value == null) {
            return "";
        }

        String text = removeMarkup(value);
        text = SPACES.matcher(text).replaceAll(" ").strip();
        text = LEADING_MARK.matcher(text).replaceFirst("").strip();

        return truncate(text, max);
    }

    // 설명은 줄바꿈을 살리고 빈 줄은 없애요. 비어 있으면 null이에요.
    static String cleanDescription(String value) {

        if (value == null) {
            return null;
        }

        String text = removeMarkup(value).replace("\r\n", "\n").replace('\r', '\n');
        List<String> lines = new ArrayList<>();

        for (String line : text.split("\n")) {
            String stripped = LINE_SPACES.matcher(line).replaceAll(" ").strip();

            if (!stripped.isEmpty()) {
                lines.add(stripped);
            }
        }

        String joined = truncate(String.join("\n", lines), AiDraftLimits.MAX_DESCRIPTION);

        return joined.isEmpty() ? null : joined;
    }

    // 스프린트 이름: 번호 접두사를 떼고 길이를 맞춰요(떼고 나서 맞춰야 이름이 잘리지 않아요). 비면 "스프린트 N"이에요.
    static String sprintName(String raw, int number) {

        String name = SPRINT_PREFIX.matcher(clean(raw, AiDraftLimits.MAX_SPRINT_NAME + 20)).replaceFirst("").strip();
        name = fixParticles(truncate(name, AiDraftLimits.MAX_SPRINT_NAME));

        return name.isEmpty() ? "스프린트 " + number : name;
    }

    // 받침에 맞지 않는 '와/과'를 고쳐요(예: "관리과 검색" → "관리와 검색"). 받침이 없으면 '와', 있으면 '과'예요.
    // "효과"처럼 '과'로 끝나는 낱말은 건드리지 않아요.
    static String fixParticles(String text) {

        if (text == null) {
            return null;
        }

        Matcher matcher = PARTICLE.matcher(text);
        StringBuilder result = new StringBuilder();

        while (matcher.find()) {

            String word = matcher.group(1);
            String particle = matcher.group(2);
            char last = word.charAt(word.length() - 1);
            boolean hasFinalConsonant = (last - 0xAC00) % 28 != 0;

            String fixed = particle;

            if (particle.equals("와") && hasFinalConsonant) {
                fixed = "과";
            } else if (particle.equals("과") && !hasFinalConsonant && !endsWithNounGwa(word + particle)) {
                fixed = "와";
            }

            matcher.appendReplacement(result, Matcher.quoteReplacement(word + fixed));
        }

        matcher.appendTail(result);

        return result.toString();
    }

    // 한자·일본어 글자가 섞여 있으면 그 글자를, 없으면 null을 돌려줘요.
    static String findForeignScript(String text) {

        if (text == null) {
            return null;
        }

        Matcher matcher = FOREIGN_SCRIPT.matcher(text);

        return matcher.find() ? matcher.group() : null;
    }

    private static boolean endsWithNounGwa(String token) {

        for (String noun : GWA_NOUNS) {
            if (token.endsWith(noun)) {
                return true;
            }
        }

        return false;
    }

    private static String removeMarkup(String value) {
        return HTML_TAG.matcher(value).replaceAll(" ").replace("`", "").replace("**", "").replace("__", "");
    }

    // 글자(코드포인트) 기준으로 자르고 뒤 공백은 지워요.
    private static String truncate(String text, int max) {

        if (text.codePointCount(0, text.length()) <= max) {
            return text;
        }

        return text.substring(0, text.offsetByCodePoints(0, max)).strip();
    }
}
