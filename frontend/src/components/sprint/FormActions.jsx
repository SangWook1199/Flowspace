export default function FormActions({ onCancel, disabled, cancelLabel = "취소", submitLabel = "스프린트 생성" }) {
  return (
    <div className="formActions">
      <button type="button" onClick={onCancel}>
        {cancelLabel}
      </button>
      <button type="submit" disabled={disabled}>
        {submitLabel}
      </button>
    </div>
  );
}
