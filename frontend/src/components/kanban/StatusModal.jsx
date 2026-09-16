import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

const COLORS = ["GRAY", "BLUE", "PURPLE", "GREEN", "RED", "ORANGE", "PINK"];

const CATEGORIES = [
  { value: "TODO", label: "할 일 (TODO)" },
  { value: "IN_PROGRESS", label: "진행 중 (IN_PROGRESS)" },
  { value: "DONE", label: "완료 (DONE)" },
];

export default function StatusModal({
  mode = "create",
  status = null,
  statuses = [],
  onClose,
  onSave,
  onDelete,
}) {
  const [name, setName] = useState(status?.name ?? "");
  const [category, setCategory] = useState(status?.category ?? "IN_PROGRESS");
  const [color, setColor] = useState(status?.color ?? "PURPLE");

  const [moveTo, setMoveTo] = useState(
    statuses.find((s) => s.id !== status?.id)?.id ?? "",
  );

  const modalRef = useRef(null);

  useEffect(() => {
    const handleMouse = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleMouse);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleMouse);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      ...status,
      name,
      category,
      color,
    });
  };

  const handleDelete = () => {
    onDelete({
      statusId: status.id,
      moveTo,
    });
  };

  return (
    <div className="modalOverlay">
      <div className="statusModal" ref={modalRef}>
        <div className="statusModalHeader">
          <div>
            <h2>
              {mode === "create"
                ? "새 상태 컬럼"
                : mode === "edit"
                  ? "상태 수정"
                  : "상태 삭제"}
            </h2>

            <p>
              {mode === "delete"
                ? "삭제되는 컬럼의 작업을 다른 상태로 이동합니다."
                : "칸반 컬럼 정보를 설정합니다."}
            </p>
          </div>

          <button className="closeBtn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* 삭제 모달 */}
        {mode === "delete" ? (
          <>
            <div className="statusModalBody">
              <div className="deleteNotice">
                <h3>‘{status?.name}’ 상태를 삭제합니다.</h3>

                <p>
                  이 상태에 있는 모든 작업은 아래에서 선택한 상태로 이동됩니다.
                </p>
              </div>

              <div className="field">
                <label>작업을 여기로 이동</label>

                <select
                  value={moveTo}
                  onChange={(e) => setMoveTo(Number(e.target.value))}
                >
                  {statuses
                    .filter((item) => item.id !== status?.id)
                    .map((item) => (
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

              <button className="deleteBtn" onClick={handleDelete}>
                상태 삭제
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 생성 / 수정 */}
            <div className="statusModalBody">
              <div className="field">
                <label>상태 이름</label>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예) QA"
                />
              </div>

              <div className="field">
                <label>카테고리</label>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>컬럼 색상</label>

                <div className="colorPicker">
                  {COLORS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`colorCircle ${item.toLowerCase()} ${
                        color === item ? "active" : ""
                      }`}
                      onClick={() => setColor(item)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="statusModalFooter">
              <button className="cancelBtn" onClick={onClose}>
                취소
              </button>

              <button className="saveBtn" onClick={handleSave}>
                {mode === "edit" ? "저장" : "생성"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
