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
   뽑아내 두 컴포넌트가 같이 써요. */

export default function PopoverPortal({ anchorEl, onClose, children }) {
  const [pos, setPos] = useState(null);
  const contentRef = useRef(null);

  useLayoutEffect(() => {
    if (!anchorEl) return;
    const update = () => {
      const rect = anchorEl.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
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
  }, [anchorEl]);

  useEffect(() => {
    if (!anchorEl) return;

    const handlePointerDown = (e) => {
      if (anchorEl.contains(e.target)) return; // 트리거 자체는 자기 onClick이 토글을 처리해요.
      if (contentRef.current?.contains(e.target)) return; // 팝오버 안 클릭(옵션 고르기 등)은 각자 로직이 처리해요.
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
      style={{ position: "fixed", top: pos.top, left: pos.left }}
    >
      {children}
    </div>,
    document.body,
  );
}
