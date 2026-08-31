import { useState } from "react";
import ColorPicker from "./ColorPicker";
import DateRangePicker from "./DateRangePicker";
import FormActions from "./FormActions";
import RichTextEditor from "./RichTextEditor";

const initialForm = {
  name: "",
  goal: "",
  description: "",
  color: "#4f5cf6",
  startDate: "2026-05-29",
  endDate: "2026-06-11",
  status: "PLANNING",
};

export default function SprintForm() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.goal.trim())
      return setMessage("스프린트 이름과 목표를 입력해주세요.");
    setMessage(`“${form.name}” 스프린트를 생성했습니다. (Mock)`);
  };
  const cancel = () => {
    setForm(initialForm);
    setMessage("입력 내용을 초기화했습니다.");
  };
  return (
    <form className="sprintForm" onSubmit={submit}>
      <div className="sprintFormBody">
        <div className="formLeft">
          <Field label="스프린트 이름" required>
            <input
              maxLength="100"
              value={form.name}
              placeholder="예) Sprint 2"
              onChange={(e) => update("name", e.target.value)}
            />
            <FieldHint
              value={form.name.length}
              limit="100"
              text="스프린트의 이름을 입력하세요."
            />
          </Field>
          <Field label="목표" required>
            <textarea
              maxLength="500"
              value={form.goal}
              placeholder="이번 스프린트의 목표를 간단하게 입력하세요."
              onChange={(e) => update("goal", e.target.value)}
            />
            <FieldHint
              value={form.goal.length}
              limit="500"
              text="한 줄로 핵심 목표를 작성해보세요."
            />
          </Field>
          <RichTextEditor
            value={form.description}
            onChange={(value) => update("description", value)}
          />
        </div>
        <div className="formRight">
          <DateRangePicker
            startDate={form.startDate}
            endDate={form.endDate}
            onChange={update}
          />
          <ColorPicker
            value={form.color}
            onChange={(value) => update("color", value)}
          />
        </div>
      </div>
      {message && <p className="formMessage">{message}</p>}
      <FormActions
        onCancel={cancel}
        disabled={!form.name.trim() || !form.goal.trim()}
      />
    </form>
  );
}

function Field({ label, required, children }) {
  return (
    <section className="formField">
      <label>
        {label} {required && <b>*</b>}
      </label>
      {children}
    </section>
  );
}
function FieldHint({ value, limit, text }) {
  return (
    <div className="fieldFooter">
      <span>{text}</span>
      <b>
        {value} / {limit}
      </b>
    </div>
  );
}
