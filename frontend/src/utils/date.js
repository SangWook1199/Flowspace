// 날짜 계산 공용 함수 모음 — 화면마다 따로 `new Date("YYYY-MM-DD")`를 쓰면 UTC로 해석돼서 한국 시간대에서
// 하루가 어긋나고, "오늘"을 화면에 박아두면 실제 날짜와 모순돼요. 그래서 날짜는 전부 이 파일을 거쳐요.
// (API를 붙일 때도 서버가 주는 "YYYY-MM-DD" 문자열을 그대로 여기에 넘기면 돼요.)

const pad = (n) => String(n).padStart(2, "0");

// Date → "YYYY-MM-DD" (로컬 시간 기준).
export const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// "오늘"의 날짜 키. 테스트나 화면 확인용으로 window.__TODAY__("YYYY-MM-DD")가 있으면 그 값을 써요.
export const todayKey = () => {
  if (typeof window !== "undefined" && typeof window.__TODAY__ === "string") return window.__TODAY__;
  return toDateKey(new Date());
};

// "YYYY-MM-DD"(또는 "YYYY-MM-DDTHH:mm…") → 로컬 자정의 Date. 잘못된 값이면 null.
export const parseDateKey = (value) => {
  if (!value || typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

// 두 날짜 키 사이의 일 수(b - a). 서머타임에도 안 틀리게 반올림해요. 하나라도 잘못되면 null.
export const diffDays = (a, b) => {
  const da = parseDateKey(a);
  const db = parseDateKey(b);
  if (!da || !db) return null;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
};

// 시작일~종료일(포함)의 총 일수. 순서가 뒤집혔거나 잘못된 값이면 0.
export const inclusiveDays = (start, end) => {
  const d = diffDays(start, end);
  return d === null || d < 0 ? 0 : d + 1;
};

// 종료일이 시작일보다 앞서면 true(둘 다 있을 때만 검사).
export const isRangeReversed = (start, end) => {
  const d = diffDays(start, end);
  return d !== null && d < 0;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// "2026.09.16 (수)" 꼴.
export const formatDateWithWeekday = (key) => {
  const d = parseDateKey(key);
  return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${WEEKDAYS[d.getDay()]})` : "";
};

// "2026.09.16" 꼴.
export const formatDateDots = (key) => {
  const d = parseDateKey(key);
  return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : "";
};

// 0~100 사이로 자르고 NaN/Infinity는 0으로.
export const clampPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

// done/total → 0~100 정수 퍼센트(total이 0이면 0).
export const percentOf = (done, total) => (total > 0 ? clampPercent(Math.round((done / total) * 100)) : 0);
