import { useLayoutEffect, useRef } from "react";

// 노션처럼, 표/데이터베이스가 본문 칼럼보다 넓어지면 칼럼 폭에 갇혀 스크롤되지 않고
// 화면 끝(오른쪽 끝, 왼쪽은 메인 영역 끝)까지 펼쳐져서 거기서 가로 스크롤이 생기게 해요.
//
// 하는 일은 딱 두 가지예요.
//  1) 표 원래 폭이 칼럼에 안 들어가면 .db-block-wrap에 "is-bleed" 클래스를 붙여요.
//  2) 펼칠 때 필요한 값 두 개를 CSS 변수로 넣어줘요.
//     --bleed-w : 펼쳐질 영역의 폭(= 페이지 영역 전체 폭)
//     --bleed-l : 표가 시작하는 자리부터 영역 왼쪽 끝까지의 거리(왼쪽·오른쪽 여백으로 써요)
// 실제 모양은 page-detail.css의 .db-block-wrap.is-bleed 규칙이 그려요.
//
// 값은 React 상태가 아니라 DOM에 바로 넣어서, 창 크기를 줄이거나 사이드바를 접는 동안
// (매 프레임 바뀌어도) 블록을 다시 그리지 않아요.

const BOUNDS_SELECTOR = ".page-detail-page";
// 열(column) 블록 안의 표는 그 칸 폭을 지키고, 펼치지 않아요.
const SKIP_INSIDE_SELECTOR = ".block-columns";

export default function useTableBleed() {
  const wrapRef = useRef(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    const bounds = wrap.closest(BOUNDS_SELECTOR);
    const table = wrap.querySelector("table");
    if (!bounds || !table || wrap.closest(SKIP_INSIDE_SELECTOR)) return undefined;

    let frame = 0;

    const update = () => {
      frame = 0;

      const boundsRect = bounds.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const left = Math.max(0, Math.round(wrapRect.left - boundsRect.left));

      // 펼쳐져 있을 때도 wrap의 폭은 "칼럼에서 쓸 수 있는 폭"으로 고정돼요(자식이 칼럼보다
      // 넓게 보여도 wrap 자체는 안 늘어나요). 그래서 표 폭이 이 값보다 크면 펼치고,
      // 작으면 접는 한 가지 기준으로 두 상태를 모두 판단할 수 있어요(깜빡이지 않아요).
      const needBleed = left > 0 && table.offsetWidth > wrap.clientWidth + 1;

      wrap.classList.toggle("is-bleed", needBleed);
      if (needBleed) {
        wrap.style.setProperty("--bleed-w", `${Math.round(boundsRect.width)}px`);
        wrap.style.setProperty("--bleed-l", `${left}px`);
      } else {
        wrap.style.removeProperty("--bleed-w");
        wrap.style.removeProperty("--bleed-l");
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();

    // 페이지 영역(창 크기·사이드바 접기), 표(열 추가·폭 조절), wrap 자신이 바뀔 때 다시 계산해요.
    const observer = new ResizeObserver(schedule);
    observer.observe(bounds);
    observer.observe(table);
    observer.observe(wrap);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return wrapRef;
}
