// 프로필 이미지가 없을 때 아바타에 보여줄 "이니셜"을 만들어요(첫 글자).
// charAt(0)이나 [0]은 UTF-16 코드 단위 하나만 잘라서, 이모지나 일부 한자
// 같은 서로게이트 쌍은 반쪽만 남아 깨진 글자("�")가 돼요. 그래서
// 사용자가 보는 글자 단위(grapheme)로 자르고, Intl.Segmenter가 없는 환경
// 에선 Array.from(코드 포인트 단위)으로 대신해요.
const segmenter =
  typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

export function getInitial(name, fallback = "?") {
  const trimmed = (name ?? "").trim();

  if (!trimmed) return fallback;

  const first = segmenter
    ? segmenter.segment(trimmed)[Symbol.iterator]().next().value?.segment
    : Array.from(trimmed)[0];

  return (first ?? fallback).toUpperCase();
}
