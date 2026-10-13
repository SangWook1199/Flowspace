package com.flowspace.service.ai;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowspace.dto.ai.AiProgressInfo;

// 모델이 JSON을 쓰는 동안 "지금까지 받은 글"을 읽어서 진행 상황을 어림해요.
// 스프린트 이름("name")과 작업 제목("title")이 하나 끝까지 나올 때마다 세어요.
// 퍼센트는 (끝난 스프린트 + 지금 스프린트의 작업 수 / 예상 작업 수) / 스프린트 수예요. 모델이 예상보다 많이 써도
// 스프린트 하나가 차지하는 몫의 95%까지만 채워서, 다음 스프린트가 시작될 때 자연스럽게 넘어가요.
// 한 시도 안에서는 퍼센트가 줄어들지 않아요. 만드는 스레드 하나만 쓰는 객체예요.
class AiProgressTracker {

    private static final Pattern FIELD = Pattern.compile("\"(name|title)\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    static final int RECENT_TASKS = 6;

    // 글이 다 나와도 검사·변환이 남아 있어서 100%는 마지막(DONE)에만 써요.
    private static final int MAX_WRITING_PERCENT = 97;
    private static final int CHECKING_PERCENT = 99;

    private final int sprintCount;
    private final int expectedTasksPerSprint;

    private int scanFrom;
    private int sprintIndex;
    private String sprintName;
    private int tasksInSprint;
    private int taskCount;
    private int percent;
    private boolean started;
    private final Deque<String> recent = new ArrayDeque<>();

    AiProgressTracker(int sprintCount, int expectedTasksPerSprint) {
        this.sprintCount = Math.max(1, sprintCount);
        this.expectedTasksPerSprint = Math.max(1, expectedTasksPerSprint);
    }

    // 지금까지 받은 글 전체를 넘겨요. 바뀐 것이 있으면 true예요(이미 읽은 부분은 다시 읽지 않아요).
    boolean accept(String contentSoFar) {

        boolean changed = !started;
        started = true;

        Matcher matcher = FIELD.matcher(contentSoFar);
        matcher.region(scanFrom, contentSoFar.length());

        while (matcher.find()) {

            scanFrom = matcher.end();
            String value = unescape(matcher.group(2)).strip();

            if (matcher.group(1).equals("name")) {
                sprintIndex++;
                sprintName = value;
                tasksInSprint = 0;
            } else {
                taskCount++;
                tasksInSprint++;
                recent.addLast(value);

                while (recent.size() > RECENT_TASKS) {
                    recent.removeFirst();
                }
            }

            changed = true;
        }

        int next = estimate();

        if (next > percent) {
            percent = next;
            changed = true;
        }

        return changed;
    }

    AiProgressInfo snapshot() {
        return info("WRITING", percent);
    }

    // 글을 다 받고 검사하는 단계예요.
    AiProgressInfo checking() {
        percent = Math.max(percent, CHECKING_PERCENT);

        return info("CHECKING", percent);
    }

    private AiProgressInfo info(String phase, int percent) {
        return new AiProgressInfo(percent, phase, Math.min(Math.max(sprintIndex, 1), sprintCount), sprintCount,
            sprintName, taskCount, List.copyOf(recent));
    }

    private int estimate() {

        if (sprintIndex == 0) {
            return started ? 1 : 0;
        }

        int done = Math.min(sprintIndex - 1, sprintCount - 1);
        double fraction = Math.min(0.95, (double) tasksInSprint / expectedTasksPerSprint);
        int value = (int) Math.floor((done + fraction) * 100 / sprintCount);

        return Math.max(1, Math.min(MAX_WRITING_PERCENT, value));
    }

    // JSON 글자 안의 줄바꿈·따옴표·유니코드 이스케이프 표기를 풀어요. 풀 수 없으면 그대로 써요.
    private static String unescape(String raw) {

        if (raw.indexOf('\\') < 0) {
            return raw;
        }

        try {
            return MAPPER.readValue("\"" + raw + "\"", String.class);
        } catch (Exception e) {
            return raw;
        }
    }
}
