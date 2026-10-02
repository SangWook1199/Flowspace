import { useId, useRef, useState } from "react";
import { X } from "lucide-react";

import useModalA11y from "./hooks/useModalA11y";

const COLORS = ["WHITE", "GRAY", "BLUE", "PURPLE", "GREEN", "RED", "ORANGE", "PINK"];

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
  const [error, setError] = useState("");

  // 라벨↔입력칸 연결과 dialog 제목 연결에 쓰는 id예요.
  const uid = useId();
  const titleId = `${uid}-title`;
  const nameId = `${uid}-name`;
  const categoryId = `${uid}-category`;
  const moveToId = `${uid}-move`;

  useModalA11y(modalRef, onClose);

  // 이름은 앞뒤 공백을 지우고 저장해요. 비어있거나, (자기 자신 말고) 같은 이름이 이미 있으면
  // 컬럼이 헷갈리니까 저장하지 않고 입력칸 아래에 이유를 보여줘요.
  const handleSave = () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setError("상태 이름을 입력해 주세요.");
      return;
    }

    const duplicated = statuses.some(
      (item) => item.id !== status?.id && item.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );

    if (duplicated) {
      setError("같은 이름의 상태가 이미 있어요.");
      return;
    }

    onSave?.({
      ...status,
      name: trimmed,
      category,
      color,
    });
  };

  // Enter로도 저장할 수 있게 <form>으로 감쌌어요(form은 화면 배치에 영향 없는 block이에요).
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  const handleDelete = () => {
    onDelete?.({
      statusId: status.id,
      moveTo,
    });
  };

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
            <h2 id={titleId}>
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

          <button type="button" className="closeBtn" onClick={onClose} aria-label="닫기">
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
                <label htmlFor={moveToId}>작업을 여기로 이동</label>

                <select
                  id={moveToId}
                  value={moveTo}
                  onChange={(e) => setMoveTo(e.target.value)}
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
              <button type="button" className="cancelBtn" onClick={onClose}>
                취소
              </button>

              <button type="button" className="deleteBtn" onClick={handleDelete}>
                상태 삭제
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* 생성 / 수정 */}
            <div className="statusModalBody">
              <div className="field">
                <label htmlFor={nameId}>상태 이름</label>

                <input
                  id={nameId}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder="예) QA"
                  aria-invalid={error ? "true" : undefined}
                  aria-describedby={error ? `${nameId}-error` : undefined}
                />

                {/* 이 모달엔 에러용 클래스가 따로 없어서, 기존 .field small(작은 안내 글씨)을 빌리고
                    색만 붉게 칠했어요. */}
                {error && (
                  <small id={`${nameId}-error`} role="alert" style={{ color: "#dc2626" }}>
                    {error}
                  </small>
                )}
              </div>

              <div className="field">
                <label htmlFor={categoryId}>카테고리</label>

                <select
                  id={categoryId}
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
                <label id={`${uid}-color`}>컬럼 색상</label>

                <div className="colorPicker" role="group" aria-labelledby={`${uid}-color`}>
                  {COLORS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`colorCircle ${item.toLowerCase()} ${
                        color === item ? "active" : ""
                      }`}
                      onClick={() => setColor(item)}
                      aria-label={`${item} 색상`}
                      aria-pressed={color === item}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="statusModalFooter">
              <button type="button" className="cancelBtn" onClick={onClose}>
                취소
              </button>

              <button type="submit" className="saveBtn">
                {mode === "edit" ? "저장" : "생성"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
