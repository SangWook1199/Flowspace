package com.flowspace.service.ai;

import java.time.DayOfWeek;
import java.time.LocalDate;

// 평일(월~금) 기준 날짜 계산이에요. 공휴일은 따로 보지 않아요.
final class AiWorkdays {

    private AiWorkdays() {
    }

    static boolean isWorkday(LocalDate date) {
        return date.getDayOfWeek() != DayOfWeek.SATURDAY && date.getDayOfWeek() != DayOfWeek.SUNDAY;
    }

    // 그날이 평일이면 그날, 주말이면 다음 월요일
    static LocalDate onOrAfter(LocalDate date) {

        return switch (date.getDayOfWeek()) {
            case SATURDAY -> date.plusDays(2);
            case SUNDAY -> date.plusDays(1);
            default -> date;
        };
    }

    // 그날이 평일이면 그날, 주말이면 그 앞 금요일
    static LocalDate onOrBefore(LocalDate date) {

        return switch (date.getDayOfWeek()) {
            case SATURDAY -> date.minusDays(1);
            case SUNDAY -> date.minusDays(2);
            default -> date;
        };
    }

    // 다음 날 이후 첫 평일
    static LocalDate after(LocalDate date) {
        return onOrAfter(date.plusDays(1));
    }

    // 평일 기준으로 days일 뒤 날짜(days가 0이면 그대로)
    static LocalDate plus(LocalDate date, int days) {

        LocalDate result = date;
        int remaining = days;

        while (remaining > 0) {
            result = result.plusDays(1);

            if (isWorkday(result)) {
                remaining--;
            }
        }

        return result;
    }

    // from부터 to까지(둘 다 포함) 평일이 며칠인지
    static int count(LocalDate from, LocalDate to) {

        int count = 0;

        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            if (isWorkday(date)) {
                count++;
            }
        }

        return count;
    }
}
