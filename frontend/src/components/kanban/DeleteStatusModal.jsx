import { useState, useRef, useEffect } from "react";
import { X, TriangleAlert } from "lucide-react";

export default function DeleteStatusModal({
  status,
  statuses,
  onClose,
  onDelete,
}) {
  const modalRef = useRef(null);

  const moveTargets = statuses.filter((item) => item.id !== status.id);

  const [moveTo, setMoveTo] = useState(moveTargets[0]?.id ?? "");

  useEffect(() => {
    const handleOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  return (
    <div className="modalOverlay">
      <div className="statusModal" ref={modalRef}>
        <div className="statusModalHeader">
          <div>
            <h2>상태 삭제</h2>
            <p>삭제하기 전에 작업 이동 상태를 선택하세요.</p>
          </div>

          <button className="closeBtn" onClick={onClose}>
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
            <label>작업을 여기로 이동합니다</label>

            <select
              value={moveTo}
              onChange={(e) => setMoveTo(Number(e.target.value))}
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
          <button className="cancelBtn" onClick={onClose}>
            취소
          </button>

          <button
            className="deleteBtn"
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
