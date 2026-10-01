import { CalendarDays, Flag } from "lucide-react";

import { todayKey } from "../../utils/date";
import { getSprintPhase } from "../../utils/sprintRange";

const SPRINT_COLOR = {
  BLUE: "#3B82F6",
  PURPLE: "#9333EA",
  GREEN: "#22C55E",
  RED: "#EF4444",
  ORANGE: "#F59E0B",
  PINK: "#EC4899",
  GRAY: "#64748B",
};

// 시작 전/진행 중/종료에 따라 D-day와 "N/M일" 문구를 만들어요.
// 하나의 식(올림 계산)으로 다 처리하면 시작 전에 "D--2"나 종료 후에 "16/14일"처럼 말이 안 되는 값이 나와서 단계별로 나눴어요.
const getBannerText = (info) => {
  switch (info.phase) {
    case "before":
      return {
        dday: `시작 D-${info.daysUntilStart}`,
        caption: `시작 전 · 총 ${info.totalDays}일`,
      };
    case "during":
      return {
        dday: info.daysLeft === 0 ? "D-Day" : `D-${info.daysLeft}`,
        caption: `${info.passedDays}/${info.totalDays}일 진행`,
      };
    case "after":
      return {
        dday: "종료",
        caption: `총 ${info.totalDays}일 · 종료됨`,
      };
    default:
      return { dday: "-", caption: "기간 정보 없음" };
  }
};

// today를 안 넘기면 실제 오늘(todayKey)을 써요. 테스트할 때는 window.__TODAY__나 today prop으로 바꿀 수 있어요.
export default function CalendarSprintBanner({ sprint, today = todayKey() }) {
  // 선택된 스프린트가 없으면 배너 자체를 그리지 않아요(undefined.name으로 화면이 죽지 않게).
  if (!sprint) return null;

  const info = getSprintPhase(sprint, today);
  const { dday, caption } = getBannerText(info);
  const progress = info.timeProgress;

  const color = SPRINT_COLOR[sprint.color] ?? SPRINT_COLOR.GRAY;

  return (
    <section className="calendarSprintBanner">
      <div className="bannerAccent" style={{ background: color }} />

      <div className="bannerLeft">
        <div
          className="bannerIcon"
          style={{
            background: `${color}18`,
            color,
          }}
        >
          <Flag size={28} />
        </div>

        <div>
          <h2>{sprint.name}</h2>

          <p>{sprint.goal}</p>

          <div className="bannerDate">
            <CalendarDays size={14} />

            <span>
              {sprint.startDate} ~ {sprint.endDate}
            </span>
          </div>
        </div>
      </div>

      <div className="bannerRight">
        <strong>{progress}%</strong>

        <span className="dDay" style={{ color }}>
          {dday}
        </span>

        <div className="bannerProgress">
          <i
            style={{
              width: `${progress}%`,
              background: color,
            }}
          />
        </div>

        <small>
          {caption}
        </small>
      </div>
    </section>
  );
}
