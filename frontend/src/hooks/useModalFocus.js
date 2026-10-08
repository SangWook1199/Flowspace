import { useEffect, useRef, useState } from "react";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// 모달이 열려 있는 동안: Esc로 닫고, Tab이 모달 밖으로 나가지 않게 가둬요. 닫으면 열기 전 위치로 포커스를 돌려줘요.
// 모달 맨 바깥 요소에 dialogRef를 달아 주세요.
export default function useModalFocus(dialogRef, onClose) {
  // 첫 입력칸에 자동 포커스가 가기 전, 모달을 연 요소를 기억해둬요(닫을 때 거기로 돌려주려고요).
  const [opener] = useState(() => document.activeElement);
  // 최신 onClose를 ref에 담아둬서, 부모가 다시 그려져도 키보드 이벤트를 다시 등록하지 않아요.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;

      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [dialogRef, opener]);
}
