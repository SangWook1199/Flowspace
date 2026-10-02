import { useState } from "react";
import ColorPicker from "./ColorPicker";
import DateRangePicker from "./DateRangePicker";
import FormActions from "./FormActions";
import RichTextEditor from "./RichTextEditor";

import { isRangeReversed, parseDateKey, todayKey, toDateKey } from "../../utils/date";
import { htmlToText } from "../../utils/sanitizeHtml";
import { getErrorMessage } from "../../utils/apiError";

// 상세 설명 글자 수 한도(에디터의 "n / 2000" 표시와 같은 값이에요).
const DESCRIPTION_MAX = 2000;
// 새 스프린트의 기본 기간(일). 오늘부터 2주(14일)로 잡아요.
const DEFAULT_SPRINT_DAYS = 14;

// 시작일 기본값은 "오늘", 종료일은 거기서 기본 기간만큼 뒤예요 — 날짜를 코드에 박아두면 시간이
// 지날수록 과거 날짜가 기본값이 돼요.
const makeInitialForm = () => {
  const start = todayKey();
  const end = parseDateKey(start);
  end.setDate(end.getDate() + DEFAULT_SPRINT_DAYS - 1);

  return {
    name: "",
    goal: "",
    description: "",
    color: "#4f5cf6",
    startDate: start,
    endDate: toDateKey(end),
    status: "PLANNING",
  };
};

// 제출을 막아야 하는 이유를 한 문장으로 돌려줘요(문제 없으면 빈 문자열). 버튼 비활성화와 제출 검사가
// 같은 기준을 쓰도록 한곳에 모았어요.
const validate = (form) => {
  if (!form.name.trim() || !form.goal.trim()) return "스프린트 이름과 목표를 입력해주세요.";
  if (!parseDateKey(form.startDate) || !parseDateKey(form.endDate)) return "시작일과 종료일을 모두 입력해주세요.";
  if (isRangeReversed(form.startDate, form.endDate)) return "종료일은 시작일보다 빠를 수 없어요.";
  if (htmlToText(form.description).length > DESCRIPTION_MAX) return `상세 설명은 ${DESCRIPTION_MAX}자까지 쓸 수 있어요.`;
  return "";
};

// onSubmit(값)은 스프린트를 만드는 함수예요(Promise를 돌려줘요). 실패해서 예외를 던지면 그 메시지를 폼 아래에 보여줘요.
export default function SprintForm({ onSubmit }) {
  const [form, setForm] = useState(makeInitialForm);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const problem = validate(form);
    if (problem) return setMessage(problem);

    const payload = { ...form, name: form.name.trim(), goal: form.goal.trim() };
    setSubmitting(true);
    setMessage("");

    try {
      await onSubmit?.(payload);
    } catch (err) {
      setMessage(getErrorMessage(err, "스프린트를 만들지 못했어요."));
    } finally {
      setSubmitting(false);
    }
  };
  const cancel = () => {
    setForm(makeInitialForm());
    setMessage("입력 내용을 초기화했습니다.");
  };
  return (
    <form className="sprintForm" onSubmit={submit}>
      <div className="sprintFormBody">
        <div className="formLeft">
          <Field label="스프린트 이름" required htmlFor="sprintName">
            <input
              id="sprintName"
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
          <Field label="목표" required htmlFor="sprintGoal">
            <textarea
              id="sprintGoal"
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
            maxLength={DESCRIPTION_MAX}
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
        disabled={Boolean(validate(form)) || submitting}
      />
    </form>
  );
}

function Field({ label, required, htmlFor, children }) {
  return (
    <section className="formField">
      <label htmlFor={htmlFor}>
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
