import { useId } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import previewImage from "../../assets/workspace-preview.png";

export default function WorkspaceNameStep({ value, onChange, onNext }) {
  const isValid = value.trim().length >= 2;
  // label을 input과 연결해서(htmlFor/id) 라벨을 눌러도 입력칸에 포커스가 가고, 스크린
  // 리더가 입력칸 이름을 읽어요. 같은 컴포넌트가 여러 번 쓰여도 id가 안 겹치게 useId를 써요.
  const inputId = useId();

  return (
    <section className="workspace-step">
      <span className="step-label">STEP 1 / 3</span>

      <h1>워크스페이스 이름을 지어주세요</h1>

      <p className="step-description">
        팀의 정체성을 담은 이름을 입력해주세요.
        <br />
        언제든 나중에 변경할 수 있습니다.
      </p>

      {/* 미리보기 이미지 */}
      <div className="workspace-preview-card">
        <img
          src={previewImage}
          alt="Workspace Preview"
          className="workspace-preview-image"
        />
      </div>

      {/* 입력 */}
      <div className="workspace-field">
        <label htmlFor={inputId}>워크스페이스 이름</label>

        <div className="workspace-input">
          <input
            id={inputId}
            type="text"
            maxLength={50}
            value={value}
            placeholder="예) Human EXE"
            onChange={(e) => onChange(e.target.value)}
          />

          <small>{value.length}/50</small>
        </div>
      </div>

      {/* 안내 */}
      <div className="workspace-tip">
        <Sparkles size={16} />
        <div>
          <strong>좋은 이름은 팀의 목표를 담습니다.</strong>
          <span>예) Human EXE · 37.5 · Team Alpha</span>
        </div>
      </div>

      {/* 버튼 */}
      <div className="workspace-actions">
        <button type="button" className="workspace-next" disabled={!isValid} onClick={onNext}>
          다음
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}
