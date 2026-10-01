import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

import workspaceCreateMock from "../mock/workspaceCreateMock";
import { useWorkspace } from "../context/WorkspaceContext";
import { nextNumericId } from "../utils/id";

import ProgressHeader from "../components/workspace/ProgressHeader";
import WorkspaceNameStep from "../components/workspace/WorkspaceNameStep";
import WorkspaceAppearanceStep from "../components/workspace/WorkspaceAppearanceStep";
import WorkspaceInviteStep from "../components/workspace/WorkspaceInviteStep";
import FlowSpaceLogo from "../components/common/FlowSpaceLogo";

import "../styles/workspace-create.css";

const DEFAULT_INITIALS = "H";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 이름에서 이니셜을 뽑아요 — 단어마다 첫 글자를 모아 최대 2글자.
// "Human EXE" → "HE", "디자인 랩" → "디랩". 슬라이스(w[0])로 자르면 이모지 같은
// 서로게이트 쌍이 반으로 쪼개져 깨진 글자가 되니까, Array.from으로 "보이는 글자"
// 단위로 잘라요. toUpperCase는 라틴 문자에만 효과가 있고 한글·이모지는 그대로예요.
function deriveInitials(name) {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((word) => Array.from(word)[0] ?? "");
  return Array.from(letters.join("")).slice(0, 2).join("").toUpperCase();
}

export default function WorkspaceCreatePage() {
  const [step, setStep] = useState(1);
  const [workspace, setWorkspace] = useState(workspaceCreateMock);
  // 2단계에서 사용자가 이니셜을 직접 고쳤는지. 고쳤다면 1단계로 돌아가 이름을
  // 바꿔도 사용자가 정한 이니셜을 자동 값으로 덮어쓰지 않아요.
  const [initialsTouched, setInitialsTouched] = useState(false);
  // 더블클릭으로 생성이 두 번 실행되는 걸 막아요. state는 다음 렌더에야 반영돼서
  // 빠른 연속 클릭을 못 막으니, 즉시 바뀌는 ref를 같이 써요(state는 버튼 비활성화용).
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { createWorkspace } = useWorkspace();

  const updateName = (name) => {
    setWorkspace((prev) => ({
      ...prev,
      name,
      initials: initialsTouched ? prev.initials : deriveInitials(name) || DEFAULT_INITIALS,
    }));
  };

  const updateInitials = (value) => {
    const initials = Array.from(value).slice(0, 2).join("").toUpperCase();
    // 전부 지웠다면 "직접 정함"이 아니라 비운 거라, 다시 이름에서 자동으로 따라가게 둬요.
    setInitialsTouched(initials.length > 0);
    setWorkspace((prev) => ({ ...prev, initials }));
  };

  const updateColor = (color) =>
    setWorkspace((prev) => ({
      ...prev,
      color,
    }));

  // 성공하면 null, 실패하면 화면에 보여줄 안내 문구를 돌려줘요.
  const addMember = (rawEmail) => {
    const email = rawEmail.trim();
    if (!email) return "이메일을 입력해 주세요.";
    if (!EMAIL_PATTERN.test(email)) return "올바른 이메일 형식이 아니에요.";

    const duplicated = workspace.invitedMembers.some(
      (m) => m.email.toLowerCase() === email.toLowerCase(),
    );
    if (duplicated) return "이미 추가한 이메일이에요.";

    setWorkspace((prev) => ({
      ...prev,
      invitedMembers: [
        ...prev.invitedMembers,
        {
          // Date.now()는 빠르게 두 번 추가하면 같은 값이 나올 수 있어요.
          id: nextNumericId(prev.invitedMembers),
          email,
          name: email.split("@")[0],
        },
      ],
    }));
    return null;
  };

  const removeMember = (id) =>
    setWorkspace((prev) => ({
      ...prev,
      invitedMembers: prev.invitedMembers.filter((m) => m.id !== id),
    }));

  // "워크스페이스 생성"과 "건너뛰기"가 같이 쓰는 생성 로직이에요. 초대할 사람을
  // 인자로 받아서 건너뛰기는 항상 빈 배열을 넘겨요(예전엔 둘 다 같은 핸들러라
  // 건너뛰어도 목록에 있던 사람이 초대됐어요).
  const submit = (invitedMembers) => {
    if (submittingRef.current) return;

    const name = workspace.name.trim();
    if (!name) {
      // 이름 없이 3단계까지 올 수는 없지만(다음 버튼이 비활성화), 안전망으로 1단계로 돌려보내요.
      setStep(1);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    // API를 붙이면 이 호출이 비동기가 되고, 실패 시 submittingRef/submitting을 풀어줘야 해요.
    // TODO : Spring API
    const created = createWorkspace({
      name,
      initials: workspace.initials,
      color: workspace.color,
      invitedMembers,
    });

    if (!created) {
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    // 만들어진 워크스페이스의 첫 페이지로 이동해요.
    navigate(`/pages/${created.page.id}`);
  };

  // 직접 주소로 들어와서 돌아갈 기록이 없으면 navigate(-1)이 아무 일도 안 해서
  // 닫기 버튼이 먹통처럼 보여요 — 그땐 홈으로 보내요.
  const handleClose = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <main className="workspace-create-page">
      <header className="workspace-create-header">
        <FlowSpaceLogo />

        <button
          className="workspace-close-btn"
          onClick={handleClose}
          type="button"
          aria-label="닫기"
        >
          <X size={24} />
        </button>
      </header>

      <section className="workspace-create-card">
        <ProgressHeader currentStep={step} />

        {step === 1 && (
          <WorkspaceNameStep
            value={workspace.name}
            onChange={updateName}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <WorkspaceAppearanceStep
            workspace={workspace}
            colors={workspace.colorPalette}
            onInitialsChange={updateInitials}
            onColorChange={updateColor}
            onPrev={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <WorkspaceInviteStep
            members={workspace.invitedMembers}
            onAdd={addMember}
            onRemove={removeMember}
            onPrev={() => setStep(2)}
            onCreate={() => submit(workspace.invitedMembers)}
            onSkip={() => submit([])}
            submitting={submitting}
          />
        )}
      </section>
    </main>
  );
}
