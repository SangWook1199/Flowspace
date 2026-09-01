import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

import workspaceCreateMock from "../mock/workspaceCreateMock";

import ProgressHeader from "../components/workspace/ProgressHeader";
import WorkspaceNameStep from "../components/workspace/WorkspaceNameStep";
import WorkspaceAppearanceStep from "../components/workspace/WorkspaceAppearanceStep";
import WorkspaceInviteStep from "../components/workspace/WorkspaceInviteStep";
import FlowSpaceLogo from "../components/common/FlowSpaceLogo";

import "../styles/workspace-create.css";

export default function WorkspaceCreatePage() {
  const [step, setStep] = useState(1);
  const [workspace, setWorkspace] = useState(workspaceCreateMock);
  const navigate = useNavigate();

  const updateName = (name) => {
    const initials = name
      .trim()
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    setWorkspace((prev) => ({
      ...prev,
      name,
      initials: initials || "H",
    }));
  };

  const updateInitials = (value) =>
    setWorkspace((prev) => ({
      ...prev,
      initials: value.toUpperCase().slice(0, 2),
    }));

  const updateColor = (color) =>
    setWorkspace((prev) => ({
      ...prev,
      color,
    }));

  const addMember = (email) => {
    if (!email) return;

    setWorkspace((prev) => ({
      ...prev,
      invitedMembers: [
        ...prev.invitedMembers,
        {
          id: Date.now(),
          email,
          name: email.split("@")[0],
        },
      ],
    }));
  };

  const removeMember = (id) =>
    setWorkspace((prev) => ({
      ...prev,
      invitedMembers: prev.invitedMembers.filter((m) => m.id !== id),
    }));

  const handleCreate = () => {
    const payload = {
      name: workspace.name,
      initials: workspace.initials,
      color: workspace.color,
      invitedEmails: workspace.invitedMembers.map((m) => m.email),
    };

    console.log(payload);

    // TODO : Spring API
  };

  return (
    <main className="workspace-create-page">
      <header className="workspace-create-header">
        <FlowSpaceLogo />

        <button
          className="workspace-close-btn"
          onClick={() => navigate(-1)}
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
            onCreate={handleCreate}
          />
        )}
      </section>
    </main>
  );
}
