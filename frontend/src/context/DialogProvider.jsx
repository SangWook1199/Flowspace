import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { DialogContext } from "./DialogContext";

const TOAST_MS = { error: 6000, success: 3500, info: 3500 };
const TOAST_ICON = { error: CircleAlert, success: CircleCheck, info: Info };

// 앱 전체의 확인창(confirm)과 안내 토스트(notify)를 보여주는 Provider예요.
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { options, resolve }
  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(1);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        const normalized = typeof options === "string" ? { message: options } : options;
        // 이미 떠 있는 확인창이 있으면 "취소"로 닫고 새로 띄워요.
        setDialog((prev) => {
          prev?.resolve(false);
          return { options: normalized, resolve };
        });
      }),
    [],
  );

  const settle = useCallback((result) => {
    setDialog((prev) => {
      prev?.resolve(result);
      return null;
    });
  }, []);

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((toast) => toast.id !== id)), []);

  const notify = useCallback(
    (message, { type = "error" } = {}) => {
      if (!message) return;
      const id = nextToastId.current++;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), TOAST_MS[type] ?? 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ confirm, notify }), [confirm, notify]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && <ConfirmDialog options={dialog.options} onSettle={settle} />}
      <div className="toastStack" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = TOAST_ICON[toast.type] ?? Info;
          return (
            <div key={toast.id} className={`appToast ${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>
              <Icon size={18} />
              <p>{toast.message}</p>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="닫기">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </DialogContext.Provider>
  );
}

// 확인창이에요. 위험한 동작(danger)은 실수로 Enter를 눌러도 실행되지 않게 "취소"에 먼저 포커스를 둬요.
function ConfirmDialog({ options, onSettle }) {
  const { title, message, confirmLabel = "확인", cancelLabel = "취소", danger = false } = options;
  const boxRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement;
    (danger ? cancelRef : confirmRef).current?.focus();

    // 창(window)의 캡처 단계에서 받아서, 이 확인창을 연 다른 모달(가져오기 등)이 같은 Esc/Tab에 같이 반응하지 않게 해요.
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onSettle(false);
        return;
      }
      if (event.key !== "Tab" || !boxRef.current) return;

      const items = Array.from(boxRef.current.querySelectorAll("button"));
      const head = items[0];
      const tail = items[items.length - 1];
      if (event.shiftKey && document.activeElement === head) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [danger, onSettle]);

  return (
    <div
      className="appConfirmOverlay"
      // 다른 모달의 "바깥 클릭으로 닫기"가 이 클릭에 반응하지 않게 문서까지 올라가지 않도록 막아요.
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onSettle(false);
      }}
    >
      <div
        className="appConfirm"
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : message}
      >
        {title && <h2 id={titleId}>{title}</h2>}
        <p>{message}</p>
        <div className="appConfirmActions">
          <button type="button" ref={cancelRef} onClick={() => onSettle(false)}>
            {cancelLabel}
          </button>
          <button type="button" ref={confirmRef} className={danger ? "danger" : "primary"} onClick={() => onSettle(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
