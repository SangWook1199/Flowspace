import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// 회고 목록 맨 아래 "회고는 어떻게 생성되나요?"의 "자세히 보기" 창이에요.
// 목록 페이지(.retro-page)는 container-type이 있어서 position: fixed가 페이지 안에 갇히니까 body에 그려요.
const STEPS = [
  {
    title: "스프린트를 완료로 바꾸세요",
    text: "스프린트를 완료 상태로 바꾸면 그 순간 회고가 자동으로 만들어져요. 따로 만들 필요가 없어요.",
  },
  {
    title: "완료한 순간의 모습이 기록돼요",
    text: "완료율, 끝낸 작업과 못 끝낸 작업 수, 참여자, 그리고 칸반 보드의 모습(상태별 작업과 담당자)이 스냅샷으로 남아요. 그래서 이후에 작업이 바뀌어도 회고 기록은 그대로예요.",
  },
  {
    title: "회고 노트에 함께 정리하세요",
    text: "회고 페이지에는 Keep · Problem · Try 표와 자유 메모를 쓰는 회고 노트가 들어 있어요. 팀원들이 같이 쓰고 고칠 수 있어요.",
  },
  {
    title: "Action Item은 체크하지 않은 할 일이에요",
    text: "회고 노트에 만든 할 일(TODO) 블록 중 아직 체크하지 않은 것의 개수가 목록의 Action Item으로 보여요. 다음 스프린트에서 할 일을 적어 두면 편해요.",
  },
];

export default function RetroGuideModal({ onClose }) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="retro-guide-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="retro-guide" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="retro-guide__head">
          <h2 id={titleId}>회고는 어떻게 생성되나요?</h2>
          <button ref={closeRef} type="button" className="retro-guide__close" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </header>

        <ol className="retro-guide__steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="retro-guide__no">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="retro-guide__note">
          진행 중인 스프린트는 목록에 &quot;진행 중&quot;으로, 아직 시작하지 않은 스프린트는 &quot;예정&quot;으로 보이고, 숫자는 스프린트를 완료한 뒤에 채워져요.
        </p>

        <div className="retro-guide__actions">
          <button type="button" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
