import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ================= PopoverPortal =================
   .db-block-wrap은 표 카드의 둥근 모서리를 보여주려고 overflow:hidden이
   걸려 있고, .db-table-scroll도 컬럼이 많을 때 가로 스크롤을 위해
   overflow-x:auto가 걸려 있어요(브라우저는 이럴 때 overflow-y도 자동으로
   auto 취급해요). 팝오버가 그 안에서 아래로 넘치면 이 두 겹의 overflow에
   그대로 잘려버려서 — 특히 열을 막 추가해 표가 아직 짧을 때 — "행 추가"
   버튼과 겹쳐 보이는 문제가 있었어요(실측 확인함: repro에서 wrap 바닥
   183px에 팝오버 329px까지 내용이 그대로 잘려나감). 그래서 팝오버는
   document.body로 포털링해서 position:fixed로 트리거 버튼 바로 아래에
   독립적으로 그리고, 스크롤·리사이즈가 생기면 위치를 다시 계산해요.

   "바깥 클릭하면 닫기"는 처음엔 화면 전체를 덮는 투명 오버레이(z-index
   30)로 만들었는데, 그러면 그 오버레이가 다른 모든 버튼(예: 다른 열의
   팝오버 트리거)보다 위에 그려져서 그 클릭 자체를 가로채버려요 —
   Playwright로 실제 클릭 좌표를 강제로 찍어서 확인함: 오버레이가 클릭을
   먹고 그 버튼의 onClick은 아예 호출이 안 됨. 그래서 팝오버가 열려 있는
   채로 다른 열의 트리거를 클릭하면, 한 번에 그 팝오버로 안 바뀌고 항상
   "일단 닫히고 → 한 번 더 눌러야 열리는" 두 번 클릭이 필요했어요.
   오버레이 대신 document에 mousedown(캡처 단계) 리스너를 하나 달아서
   "트리거도 아니고 팝오버 안도 아닌 곳을 클릭했을 때만" onClose를
   불러요 — 클릭 자체를 막지 않으니까(오버레이처럼 이벤트를 가로채지
   않으니까), mousedown에서 지금 팝오버가 먼저 닫히고 나서 바로 이어지는
   click이 실제로 그 다른 트리거 버튼까지 도달해서 한 번에 전환돼요.
   Esc도 여기서 한 번에 처리해서, 검색창이 없는 팝오버(상태·사람)도
   똑같이 Esc로 닫혀요.

   원래 DatabaseBlock.jsx 안에만 있었는데, SimpleTableBlock의 행 메뉴
   (⋯)도 표 카드 밖으로 넘치는 똑같은 overflow 문제를 겪어서 이 파일로
   뽑아내 두 컴포넌트가 같이 써요.

   중첩(팝오버 안에서 또 다른 팝오버를 띄우는 경우 — 댓글 패널 안에서
   댓글별 ⋯ 메뉴가 뜨는 게 그 예)도 지원해요. 포털은 항상
   document.body 바로 밑에 형제로 그려지기 때문에, 안쪽 팝오버는 바깥
   팝오버의 contentRef.contains() 판정에 안 걸려요(DOM 트리 안이
   아니라 옆이라서) — 그래서 안쪽 팝오버 안을 클릭하면 바깥 팝오버가
   "바깥을 클릭했다"고 착각해서 먼저 닫혀버리고, 그 순간 안쪽 팝오버도
   같이 사라지면서 정작 누른 버튼의 onClick은 실행이 안 되는 버그가
   있었어요(수정/삭제가 "눌러도 반응 없음"처럼 보였던 원인). 모든
   PopoverPortal 콘텐츠에 data-popover-portal 마커를 달아두고, 클릭
   지점이 "어떤 팝오버 콘텐츠 안"이기만 하면(자기 것이든 중첩된
   다른 것이든) 바깥 클릭으로 안 쳐서 이 문제를 없앴어요.

   (UI/UX 재검토 중 발견) 항상 트리거 "아래"에만 열었더니, 화면 아래
   여유가 얼마 없는 블록(특히 페이지 맨 아래쪽 블록들)에서 댓글 패널
   (최대 300px대 목록 + 입력줄)처럼 키가 큰 팝오버를 열면 화면 밖으로
   넘어가서 아랫부분이 아예 안 보이고 스크롤도 안 되는 문제가 있었어요
   — position:fixed라 페이지 스크롤과 무관하고, top을 한 번 계산한
   뒤로는 다시 안 바뀌니까요. 아래쪽 여유 공간이 위쪽보다 좁으면
   자동으로 트리거 "위"로 뒤집어 열리게(flip) 했어요 — 폭 중앙 정렬과
   같은 이유로, 팝오버의 실제 높이를 JS에서 몰라도 top을 트리거
   위쪽으로 잡고 CSS transform:translateY(-100%)로 자기 높이만큼
   스스로 위로 당기게 해서, 콘텐츠 높이를 따로 측정할 필요가 없어요. */

// align="start"(기본)는 트리거 왼쪽 끝에 팝오버 왼쪽 끝을 맞춰요(⋯
// 메뉴 등 대부분 여기 해당). align="center"는 댓글 패널처럼 "블록
// 가운데서 떠오르는" 느낌이 필요할 때 써요 — 팝오버의 실제 렌더링
// 폭을 몰라도(레이아웃 전에는 알 수 없으니) left를 앵커의 가로 중심
// 좌표로 잡고 CSS transform:translateX(-50%)로 자기 폭의 절반만큼
// 스스로 왼쪽으로 당겨서 중심을 맞추는 방식이라, JS에서 폭을 따로
// 측정할 필요가 없어요.
export default function PopoverPortal({ anchorEl, onClose, children, align = "start" }) {
  const [pos, setPos] = useState(null);
  const contentRef = useRef(null);

  useLayoutEffect(() => {
    if (!anchorEl) return;
    const update = () => {
      const rect = anchorEl.getBoundingClientRect();
      // 아래쪽 여유가 200px도 안 되는데(어지간한 메뉴는 다 들어가는
      // 기준값) 위쪽에 여유가 더 많으면 위로 뒤집어요. 둘 다 넉넉하면
      // (평소 대부분의 경우) 그냥 원래대로 아래에 열려요.
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const flip = spaceBelow < 200 && spaceAbove > spaceBelow;
      setPos(
        align === "center"
          ? { top: flip ? rect.top - 6 : rect.bottom + 6, left: rect.left + rect.width / 2, center: true, flip }
          : align === "end"
            ? {
                top: flip ? rect.top - 6 : rect.bottom + 6,
                right: window.innerWidth - rect.right,
                end: true,
                flip,
              }
            : { top: flip ? rect.top - 6 : rect.bottom + 6, left: rect.left, flip },
      );
    };
    update();
    // capture:true라야 .db-table-scroll처럼 안쪽에서 일어나는 스크롤도
    // window까지 올라오면서 잡혀서 위치를 다시 계산해요.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorEl, align]);

  useEffect(() => {
    if (!anchorEl) return;

    const handlePointerDown = (e) => {
      if (anchorEl.contains(e.target)) return; // 트리거 자체는 자기 onClick이 토글을 처리해요.
      if (contentRef.current?.contains(e.target)) return; // 팝오버 안 클릭(옵션 고르기 등)은 각자 로직이 처리해요.
      // 이 팝오버 안이 아니라 "다른" 팝오버(중첩해서 뜬 것) 안을
      // 클릭한 경우도 바깥 클릭이 아니에요 — 위 파일 설명 참고.
      if (e.target.closest?.("[data-popover-portal]")) return;
      onClose();
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorEl, onClose]);

  if (!anchorEl || !pos) return null;

  return createPortal(
    <div
      ref={contentRef}
      className="db-popover-portal"
      data-popover-portal="true"
      style={{
        position: "fixed",
        top: pos.top,
        ...(pos.end ? { right: pos.right } : { left: pos.left }),
        transform:
          [pos.center ? "translateX(-50%)" : "", pos.flip ? "translateY(-100%)" : ""]
            .filter(Boolean)
            .join(" ") || undefined,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
