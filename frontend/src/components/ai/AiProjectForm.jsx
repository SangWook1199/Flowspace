import { useState } from "react";
import { ChevronDown, Plus, Sparkles, TriangleAlert, X } from "lucide-react";

import DateRangePicker from "../sprint/DateRangePicker";
import FormActions from "../sprint/FormActions";
import UserAvatar from "../sprint/UserAvatar";

import {
  AI_LIMITS,
  SPRINT_WEEK_OPTIONS,
  countSprints,
  findOverlaps,
  newKey,
  validateForm,
} from "../../utils/aiDraft";
import { diffDays } from "../../utils/date";

// 역할 입력칸에서 고르거나 직접 쓸 수 있는 예시예요.
const ROLE_SUGGESTIONS = ["백엔드 개발", "프런트엔드 개발", "UI/UX 디자인", "기획", "데이터베이스", "테스트·QA", "문서화·발표"];

// "AI로 프로젝트 구성" 입력 폼이에요. 값은 부모(AiProject)가 들고 있어서, 초안 만들기에 실패해 돌아와도 그대로 남아요.
//   form/setForm: 폼 값과 바꾸는 함수, members: 워크스페이스 멤버, sprints: 기존 스프린트(기간 겹침 안내용)
//   blocked: AI를 지금 쓸 수 없을 때의 안내 문구(있으면 제출을 막아요)
export default function AiProjectForm({ form, setForm, members, sprints, starting, blocked, message, onSubmit, onCancel }) {
  const [detailOpen, setDetailOpen] = useState(
    () => Boolean(form.features || form.techStack || form.projectType || form.teamExperience || form.exclusions || form.fixedEvents.length),
  );

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const problem = validateForm(form);
  const sprintCount = countSprints(form.startDate, form.endDate, form.sprintWeeks);
  const overlaps = findOverlaps(sprints, form.startDate, form.endDate);
  const outsideEvents = form.fixedEvents.filter(
    (event) => event.date && (diffDays(form.startDate, event.date) < 0 || diffDays(event.date, form.endDate) < 0),
  );

  const setMember = (id, patch) =>
    setForm((current) => ({
      ...current,
      members: { ...current.members, [id]: { on: false, role: "", ...current.members[id], ...patch } },
    }));

  const setEvent = (key, patch) =>
    setForm((current) => ({
      ...current,
      fixedEvents: current.fixedEvents.map((event) => (event.key === key ? { ...event, ...patch } : event)),
    }));

  const submit = (event) => {
    event.preventDefault();
    if (problem || blocked || starting) return;
    onSubmit();
  };

  return (
    <form className="sprintForm aiForm" onSubmit={submit}>
      <div className="aiFormBody">
        {/* ---------- 필수 ---------- */}
        <section className="aiSection">
          <h2>
            기본 정보 <b>필수</b>
          </h2>

          <div className="formField">
            <label htmlFor="aiTopic">
              프로젝트 주제 <b>*</b>
            </label>
            <input
              id="aiTopic"
              maxLength={200}
              value={form.topic}
              placeholder="예) 중고 거래 웹 서비스"
              onChange={(e) => update("topic", e.target.value)}
            />
            <p className="aiHint">무엇을 만드는 프로젝트인지 한 줄로 적어 주세요.</p>
          </div>

          <div className="aiPeriod">
            <DateRangePicker
              startDate={form.startDate}
              endDate={form.endDate}
              onChange={(key, value) => update(key, value)}
            />

            <section className="sprintDateBox aiWeeks">
              <label>
                스프린트 길이 <b>*</b>
              </label>
              <div className="aiSegment" role="radiogroup" aria-label="스프린트 길이">
                {SPRINT_WEEK_OPTIONS.map((weeks) => (
                  <button
                    key={weeks}
                    type="button"
                    role="radio"
                    aria-checked={form.sprintWeeks === weeks}
                    className={form.sprintWeeks === weeks ? "picked" : ""}
                    onClick={() => update("sprintWeeks", weeks)}
                  >
                    {weeks}주
                  </button>
                ))}
              </div>
              <small>
                {sprintCount > 0 ? `스프린트 ${sprintCount}개가 만들어져요.` : "기간을 확인해주세요."}
              </small>
            </section>
          </div>

          {overlaps.length > 0 && (
            <p className="aiNotice" role="status">
              <TriangleAlert size={16} />
              <span>
                이 기간과 겹치는 기존 스프린트가 {overlaps.length}개 있어요({overlaps.map((sprint) => sprint.name).join(", ")}).
                그래도 만들 수 있고, 기존 스프린트는 그대로 두어요.
              </span>
            </p>
          )}
        </section>

        <section className="aiSection">
          <h2>
            멤버와 역할 <b>필수</b>
          </h2>
          <p className="aiHint">AI가 역할에 맞게 작업을 나눠요. 함께할 멤버를 고르고 역할을 적어 주세요.</p>

          <ul className="aiMembers">
            {members.map((member) => {
              const value = form.members[member.id] ?? { on: false, role: "" };

              return (
                <li key={member.id} className={value.on ? "on" : ""}>
                  <label className="aiMemberPick">
                    <input
                      type="checkbox"
                      checked={value.on}
                      onChange={(e) => setMember(member.id, { on: e.target.checked })}
                    />
                    <UserAvatar user={member} />
                    <span>{member.name}</span>
                  </label>
                  <input
                    className="aiRoleInput"
                    list="aiRoleSuggestions"
                    maxLength={100}
                    disabled={!value.on}
                    value={value.role}
                    aria-label={`${member.name}의 역할`}
                    placeholder={value.on ? "역할 (예: 백엔드 개발)" : "체크하면 역할을 적을 수 있어요"}
                    onChange={(e) => setMember(member.id, { role: e.target.value })}
                  />
                </li>
              );
            })}
          </ul>
          <datalist id="aiRoleSuggestions">
            {ROLE_SUGGESTIONS.map((role) => (
              <option key={role} value={role} />
            ))}
          </datalist>
        </section>

        {/* ---------- 선택 ---------- */}
        <section className="aiSection">
          <button
            type="button"
            className="aiDetailToggle"
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((open) => !open)}
          >
            <ChevronDown size={18} className={detailOpen ? "open" : ""} />
            자세히 쓰면 더 좋아져요 <b>선택</b>
          </button>

          {detailOpen && (
            <div className="aiDetail">
              <TextField
                id="aiFeatures"
                label="핵심 기능·목표"
                max={1000}
                rows={3}
                value={form.features}
                placeholder="예) 회원가입과 로그인, 상품 등록과 검색, 채팅, 찜하기"
                hint="여기 적은 기능만 만들어요. 적지 않으면 AI가 주제에서 짐작해요."
                onChange={(value) => update("features", value)}
              />
              <TextField
                id="aiTech"
                label="기술 스택"
                max={300}
                value={form.techStack}
                placeholder="예) Spring Boot, React, MySQL"
                onChange={(value) => update("techStack", value)}
              />
              <TextField
                id="aiType"
                label="프로젝트 유형"
                max={50}
                value={form.projectType}
                placeholder="예) 팀 프로젝트, 졸업 작품, 사이드 프로젝트"
                onChange={(value) => update("projectType", value)}
              />
              <TextField
                id="aiExperience"
                label="팀 경험"
                max={300}
                value={form.teamExperience}
                placeholder="예) 웹 개발은 처음이고 React는 한 번 해 봤어요."
                hint="경험이 적으면 작업을 더 잘게 나눠요."
                onChange={(value) => update("teamExperience", value)}
              />
              <TextField
                id="aiExclusions"
                label="제외할 것"
                max={500}
                rows={2}
                value={form.exclusions}
                placeholder="예) 결제 기능은 만들지 않아요."
                onChange={(value) => update("exclusions", value)}
              />

              <div className="formField">
                <label>이미 정해진 일정</label>
                <p className="aiHint">중간 발표처럼 날짜가 정해진 일정이에요. 그대로 캘린더에 넣고, 준비 작업은 그 전에 끝나게 짜요.</p>

                {form.fixedEvents.map((event) => (
                  <div className="aiEventRow" key={event.key}>
                    <input
                      maxLength={200}
                      value={event.title}
                      aria-label="일정 이름"
                      placeholder="일정 이름 (예: 중간 발표)"
                      onChange={(e) => setEvent(event.key, { title: e.target.value })}
                    />
                    <input
                      type="date"
                      value={event.date}
                      aria-label="일정 날짜"
                      onChange={(e) => setEvent(event.key, { date: e.target.value })}
                    />
                    <button
                      type="button"
                      aria-label="일정 지우기"
                      onClick={() =>
                        update(
                          "fixedEvents",
                          form.fixedEvents.filter((item) => item.key !== event.key),
                        )
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                {form.fixedEvents.length < AI_LIMITS.MAX_FIXED_EVENTS && (
                  <button
                    type="button"
                    className="aiAddButton"
                    onClick={() => update("fixedEvents", [...form.fixedEvents, { key: newKey(), title: "", date: "" }])}
                  >
                    <Plus size={15} /> 일정 추가
                  </button>
                )}

                {outsideEvents.length > 0 && (
                  <p className="aiNotice" role="status">
                    <TriangleAlert size={16} />
                    <span>프로젝트 기간 밖의 일정은 만들지 않아요.</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {blocked && (
        <p className="aiBlocked" role="alert">
          <TriangleAlert size={16} /> {blocked}
        </p>
      )}
      {(message || (problem && !blocked)) && <p className="formMessage">{message || problem}</p>}
      <p className="aiTime">
        <Sparkles size={14} /> 만드는 데 보통 30초~2분 걸려요. 화면을 나가도 계속 만들고, 돌아오면 이어서 볼 수 있어요.
      </p>

      <FormActions
        onCancel={onCancel}
        cancelLabel="취소"
        submitLabel={starting ? "시작하는 중…" : "AI로 초안 만들기"}
        disabled={Boolean(problem) || Boolean(blocked) || starting}
      />
    </form>
  );
}

function TextField({ id, label, value, onChange, max, rows, placeholder, hint }) {
  return (
    <div className="formField">
      <label htmlFor={id}>{label}</label>
      {rows ? (
        <textarea id={id} rows={rows} maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      <div className="fieldFooter">
        <span>{hint ?? ""}</span>
        <b>
          {value.length} / {max}
        </b>
      </div>
    </div>
  );
}
