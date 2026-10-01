import { useEffect, useRef } from "react";

const FOCUSABLE = 'input, select, textarea, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

// 상태 모달 공통 접근성 훅이에요 — 스크린리더/키보드 사용자도 모달을 쓸 수 있게 해줘요.
// 1) 열릴 때 첫 입력칸(없으면 첫 버튼)에 포커스를 줘요.
// 2) Esc나 바깥 클릭으로 닫아요.
// 3) Tab이 모달 밖으로 새지 않게 가둬요.
// 4) 닫힐 때 모달을 연 버튼으로 포커스를 돌려줘요(연 버튼이 사라졌으면 그냥 넘어가요).
// onClose는 렌더마다 새 함수일 수 있어서 ref에 담아두고 써요 — 안 그러면 리렌더마다 이벤트를
// 다시 붙이고 포커스 위치도 흔들려요.
export default function useModalA11y(modalRef, onClose) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const modal = modalRef.current;
    const opener = document.activeElement;

    const first =
      modal?.querySelector("input, select, textarea") ??
      modal?.querySelector("button:not(.closeBtn)") ??
      modal;
    first?.focus?.();

    const handleMouse = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) closeRef.current?.();
    };

    const handleKey = (e) => {
      if (e.key === "Escape") {
        closeRef.current?.();
        return;
      }

      if (e.key !== "Tab" || !modalRef.current) return;

      const items = Array.from(modalRef.current.querySelectorAll(FOCUSABLE));
      if (!items.length) return;

      const head = items[0];
      const tail = items[items.length - 1];

      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };

    document.addEventListener("mousedown", handleMouse);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleMouse);
      document.removeEventListener("keydown", handleKey);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [modalRef]);
}
