import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

import { useWorkspace } from "../context/WorkspaceContext";
import { nextNumericId } from "../utils/id";
import { getErrorMessage } from "../utils/apiError";
import { WORKSPACE_COLORS } from "../utils/color";

import ProgressHeader from "../components/workspace/ProgressHeader";
import WorkspaceNameStep from "../components/workspace/WorkspaceNameStep";
import WorkspaceAppearanceStep from "../components/workspace/WorkspaceAppearanceStep";
import WorkspaceInviteStep from "../components/workspace/WorkspaceInviteStep";
import FlowSpaceLogo from "../components/common/FlowSpaceLogo";

import "../styles/workspace-create.css";
import useDialog from "../context/useDialog";

const DEFAULT_INITIALS = "H";

// 워크스페이스 만들기 화면의 처음 값이에요. 초대 목록(invitedMembers)은 반드시 빈 배열로 시작해요 —
// 아무도 추가하지 않았는데(심지어 "건너뛰기"를 눌러도) 초대가 나가면 안 되니까요.
const INITIAL_WORKSPACE = {
  name: "",
  initials: DEFAULT_INITIALS,
  color: "#4F46E5",
  // 이모지 아이콘(선택). 비어 있으면 이니셜을 보여줘요.
  icon: "",
  invitedMembers: [],
  // 서버 WorkspaceColor 7종과 같아요(utils/color.js).
  colorPalette: WORKSPACE_COLORS.map((c) => c.hex),
};
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
  const { notify } = useDialog();
  const [step, setStep] = useState(1);
  const [workspace, setWorkspace] = useState(INITIAL_WORKSPACE);
  // 2단계에서 사용자가 이니셜을 직접 고쳤는지. 고쳤다면 1단계로 돌아가 이름을
  // 바꿔도 사용자가 정한 이니셜을 자동 값으로 덮어쓰지 않아요.
  const [initialsTouched, setInitialsTouched] = useState(false);
  // 더블클릭으로 생성이 두 번 실행되는 걸 막아요. state는 다음 렌더에야 반영돼서
  // 빠른 연속 클릭을 못 막으니, 즉시 바뀌는 ref를 같이 써요(state는 버튼 비활성화용).
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  const updateIcon = (icon) => setWorkspace((prev) => ({ ...prev, icon }));

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
  const submit = async (invitedMembers) => {
    if (submittingRef.current) return;

    const name = workspace.name.trim();
    if (!name) {
      // 이름 없이 3단계까지 올 수는 없지만(다음 버튼이 비활성화), 안전망으로 1단계로 돌려보내요.
      setStep(1);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      // 워크스페이스 만들기 → 첫 페이지 만들기 → 이메일별 초대 순서로 서버에 보내요.
      const created = await createWorkspace({
        name,
        initials: workspace.initials,
        color: workspace.color,
        icon: workspace.icon,
        invitedMembers,
      });

      if (!created) {
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      // 워크스페이스는 이미 만들어진 뒤라서, 초대가 실패한 이메일만 알려주고 계속 진행해요.
      if (created.failedInvites.length > 0) {
        notify(
          `워크스페이스는 만들었지만 아래 이메일은 초대하지 못했어요.\n${created.failedInvites
            .map((item) => `· ${item.email} — ${item.message}`)
            .join("\n")}`,
        );
      }

      // 만들어진 워크스페이스의 첫 페이지로 이동해요(첫 페이지를 못 만들었으면 홈으로).
      navigate(created.page ? `/pages/${created.page.id}` : "/");
    } catch (err) {
      setError(getErrorMessage(err, "워크스페이스를 만들지 못했어요. 다시 시도해주세요."));
      submittingRef.current = false;
      setSubmitting(false);
    }
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
            onIconChange={updateIcon}
            onPrev={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {error && (
          <p
            role="alert"
            style={{ margin: "0 0 12px", color: "#ef4444", fontSize: 14, textAlign: "center" }}
          >
            {error}
          </p>
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
