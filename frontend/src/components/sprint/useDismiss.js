import { useEffect } from "react";

// 열려 있는 팝업(open)을 바깥을 누르거나 Esc를 누르면 닫아줘요. ref는 팝업과 버튼을 함께 감싼 요소예요.
export default function useDismiss(open, ref, close) {
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!ref.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, ref, close]);
}
