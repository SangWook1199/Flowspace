import { useId, useRef, useState } from "react";
import { X, TriangleAlert } from "lucide-react";

import useModalA11y from "./hooks/useModalA11y";

// statuses는 "지금 보드에 있는" 상태 목록이에요(부모가 현재 state를 내려줘요). 삭제되는 상태의
// 작업이 사라지지 않도록 옮겨갈 상태를 꼭 하나 고르게 하고, 실제 이동은 onDelete를 받은 쪽이 해요.
export default function DeleteStatusModal({
  status,
  statuses,
  onClose,
  onDelete,
}) {
  const modalRef = useRef(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const selectId = `${uid}-move`;

  const moveTargets = statuses.filter((item) => item.id !== status.id);

  const [moveTo, setMoveTo] = useState(moveTargets[0]?.id ?? "");

  useModalA11y(modalRef, onClose);

  return (
    <div className="modalOverlay">
      <div
        className="statusModal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="statusModalHeader">
          <div>
            <h2 id={titleId}>상태 삭제</h2>
            <p>삭제하기 전에 작업 이동 상태를 선택하세요.</p>
          </div>

          <button type="button" className="closeBtn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="statusModalBody">
          <div className="deleteAlert">
            <TriangleAlert size={20} />
            <div>
              <strong>이 상태를 삭제합니다.</strong>
              <p>
                <b>{status.name}</b> 컬럼의 모든 작업은 아래 선택한 상태로
                이동됩니다.
              </p>
            </div>
          </div>

          <div className="field">
            <label htmlFor={selectId}>작업을 여기로 이동합니다</label>

            <select
              id={selectId}
              value={moveTo}
              onChange={(e) => {
                // id가 숫자든 문자열이든(API가 바뀌어도) 원래 값 그대로 돌려받으려고 목록에서 다시 찾아요.
                const picked = moveTargets.find((item) => String(item.id) === e.target.value);
                setMoveTo(picked ? picked.id : "");
              }}
            >
              {moveTargets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="statusModalFooter">
          <button type="button" className="cancelBtn" onClick={onClose}>
            취소
          </button>

          <button
            type="button"
            className="deleteBtn"
            disabled={moveTo === ""}
            onClick={() =>
              onDelete({
                deleteStatusId: status.id,
                moveToStatusId: moveTo,
              })
            }
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
