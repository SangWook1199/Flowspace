export default function FormActions({ onCancel, disabled }) {
  return (
    <div className="formActions">
      <button type="button" onClick={onCancel}>
        취소
      </button>
      <button type="submit" disabled={disabled}>
        스프린트 생성
      </button>
    </div>
  );
}
