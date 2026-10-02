import { useMemo, useRef, useState } from "react";
import { decodeMentions, encodeMentions, findMentionTrigger, safeMentionName } from "../../utils/mention";
import { getAvatarTone } from "../../utils/avatarColor";
import "../../styles/mention.css";

const MAX_CANDIDATES = 6;

// 댓글 입력칸이에요. "@"를 치면 워크스페이스 멤버 목록이 떠서 골라 넣을 수 있어요.
// value는 저장 형식("@[이름](id)")이고, 입력칸에는 "@이름"으로 풀어서 보여줘요(utils/mention.js).
// 그래서 부모는 평소 문자열 하나만 들고 있으면 되고, 입력칸과 같은 방식(value/onChange)으로 쓰면 돼요.
//  - onKeyDown: 목록이 열려 있을 때 쓰는 키(↑↓ Enter Tab Esc)는 여기서 먼저 처리하고, 나머지만 부모에게 넘겨요.
//  - placement: 목록을 입력칸 위("top")에 띄울지 아래("bottom")에 띄울지.
export default function MentionInput({
  value,
  onChange,
  members = [],
  onKeyDown,
  placement = "bottom",
  maxLength,
  ...inputProps
}) {
  const inputRef = useRef(null);
  const { text: display, mentions } = useMemo(() => decodeMentions(value), [value]);

  const [trigger, setTrigger] = useState(null);
  const [active, setActive] = useState({ query: null, index: 0 });
  // 목록을 Esc로 닫은 자리(같은 자리에선 다시 안 열어요)
  const [closedAt, setClosedAt] = useState(-1);

  const candidates = useMemo(() => {
    if (!trigger || trigger.start === closedAt) return [];

    const query = trigger.query.toLowerCase();
    const matched = members.filter((m) => (m.name ?? "").toLowerCase().includes(query));
    const starts = matched.filter((m) => (m.name ?? "").toLowerCase().startsWith(query));
    const rest = matched.filter((m) => !starts.includes(m));

    return [...starts, ...rest].slice(0, MAX_CANDIDATES);
  }, [trigger, closedAt, members]);

  const open = candidates.length > 0;
  const activeIndex = active.query === trigger?.query ? Math.min(active.index, candidates.length - 1) : 0;

  const syncTrigger = () => {
    const input = inputRef.current;
    if (!input) return;
    setTrigger(findMentionTrigger(input.value, input.selectionStart ?? input.value.length));
  };

  const handleChange = (e) => {
    const next = e.target.value;
    // 이미 고른 멘션 중 아직 글에 남아 있는 것만 토큰으로 유지돼요(지운 건 알아서 빠져요).
    onChange(encodeMentions(next, mentions));
    setTrigger(findMentionTrigger(next, e.target.selectionStart ?? next.length));
  };

  const pick = (member) => {
    if (!trigger) return;

    const input = inputRef.current;
    const caret = input?.selectionStart ?? trigger.start + 1 + trigger.query.length;
    const name = safeMentionName(member.name);
    const inserted = `@${name} `;
    const nextDisplay = `${display.slice(0, trigger.start)}${inserted}${display.slice(caret)}`;
    const position = trigger.start + inserted.length;

    onChange(encodeMentions(nextDisplay, [...mentions, { id: member.id, name }]));
    setTrigger(null);

    // 글이 바뀐 뒤 커서를 방금 넣은 멘션 바로 뒤로 옮겨요.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(position, position);
    });
  };

  const handleKeyDown = (e) => {
    // 한글 조합 중의 Enter·방향키는 글자를 확정하는 키라서 목록을 건드리지 않아요.
    if (open && !e.nativeEvent.isComposing) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive({ query: trigger.query, index: (activeIndex + step + candidates.length) % candidates.length });
        return;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        pick(candidates[activeIndex]);
        return;
      }

      if (e.key === "Escape") {
        // 댓글 창·모달 같은 바깥 Esc 닫기보다 목록 닫기가 먼저예요.
        e.nativeEvent.stopPropagation();
        setClosedAt(trigger.start);
        return;
      }
    }

    onKeyDown?.(e);
  };

  return (
    <span className="mentionInput">
      <input
        {...inputProps}
        ref={inputRef}
        value={display}
        maxLength={maxLength}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") syncTrigger();
        }}
        onClick={syncTrigger}
        onBlur={() => setTrigger(null)}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {open && (
        // 목록을 눌러도 입력칸 포커스가 빠지지 않게(빠지면 목록이 사라져요) 마우스 눌림을 막아요.
        <div
          className={`mentionPopup mentionPopup--${placement}`}
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mentionPopup__title">멤버 멘션</div>
          {candidates.map((member, index) => (
            <div
              key={member.id}
              role="option"
              aria-selected={index === activeIndex}
              className={`mentionPopup__item${index === activeIndex ? " is-active" : ""}`}
              onMouseEnter={() => setActive({ query: trigger.query, index })}
              onClick={() => pick(member)}
            >
              <span className={`avatar ${getAvatarTone(member.id)} mentionPopup__avatar`}>
                {member.profileImageUrl ? <img src={member.profileImageUrl} alt="" /> : member.initial}
              </span>
              <span className="mentionPopup__name">{member.name}</span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}
