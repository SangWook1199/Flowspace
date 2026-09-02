import { useState } from "react";
import { ArrowLeft, Mail, Plus, X } from "lucide-react";

export default function WorkspaceInviteStep({
  members,
  onAdd,
  onRemove,
  onPrev,
  onCreate,
}) {
  const [email, setEmail] = useState("");

  const handleAdd = () => {
    const value = email.trim();

    if (!value) return;

    onAdd(value);
    setEmail("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <section className="workspace-step">
      <span className="step-label">STEP 3 / 3</span>

      <h1>팀원을 초대하세요</h1>

      <p className="step-description">
        이메일을 입력하면 워크스페이스 초대가 전송됩니다.
        <br />
        지금 하지 않아도 나중에 초대할 수 있습니다.
      </p>

      {/* 이메일 입력 */}
      <div className="workspace-field">
        <label>팀원 이메일</label>

        <div className="workspace-email-input">
          <Mail size={18} />

          <input
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button type="button" onClick={handleAdd}>
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* 초대 목록 */}
      <div className="workspace-member-list">
        {members.length === 0 ? (
          <div className="workspace-empty">아직 초대한 팀원이 없습니다.</div>
        ) : (
          members.map((member) => (
            <div className="workspace-member-chip" key={member.id}>
              <div className="member-avatar">
                {member.name.charAt(0).toUpperCase()}
              </div>

              <div className="member-info">
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>

              <button onClick={() => onRemove(member.id)}>
                <X size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 버튼 */}
      <div className="workspace-actions between">
        <button className="workspace-prev" onClick={onPrev}>
          <ArrowLeft size={18} />
          이전
        </button>

        <div className="workspace-action-group">
          <button className="workspace-skip" onClick={onCreate}>
            건너뛰기
          </button>

          <button className="workspace-create" onClick={onCreate}>
            워크스페이스 생성
          </button>
        </div>
      </div>
    </section>
  );
}
