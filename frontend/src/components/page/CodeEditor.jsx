import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { CODE_LANGUAGES, detectLanguage, highlightCode } from "./codeHighlight";

// textarea의 [start, end) 구간을 text로 바꾸고 React가 변경을 알아채도록 input 이벤트를 보내요.
// 가능하면 브라우저의 insertText 명령을 써서 Ctrl+Z(네이티브 되돌리기)에 기록되게 해요 — setRangeText는
// 되돌리기 기록에 안 남아서, Tab으로 여러 줄을 들여쓰거나 Enter로 자동 들여쓰기를 한 뒤 Ctrl+Z가 어긋났어요.
// 결과가 기대와 다르면(브라우저가 공백을 줄이는 경우 등) 값을 직접 넣는 방식으로 되돌려요.
function replaceRange(ta, start, end, text, caret = start + text.length, caretEnd = caret) {
  const before = ta.value;
  const expected = before.slice(0, start) + text + before.slice(end);
  let ok = false;
  try {
    ta.focus();
    ta.setSelectionRange(start, end);
    ok = document.execCommand("insertText", false, text) && ta.value === expected;
  } catch {
    ok = false;
  }
  if (!ok) {
    ta.value = expected;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }
  ta.setSelectionRange(caret, caretEnd);
}

// pos가 속한 줄의 시작 위치(pos가 0이면 0이에요 — lastIndexOf에 -1을 주면 0번째 글자를 찾는 문제가 있어서 따로 처리).
function lineStartOf(value, pos) {
  return pos <= 0 ? 0 : value.lastIndexOf("\n", pos - 1) + 1;
}

// 코드 블록 편집기 — 노션처럼 언어를 고르면 글자마다 색이 달라져요.
//
// 구조: 눈에 보이는 색칠된 글자는 <pre>(정적, 흐름 안에서 높이를 결정)가 그리고, 그 바로
// 위에 완전히 겹쳐서 투명한 글자의 <textarea>가 실제 입력을 받아요(커서·선택·IME·붙여넣기는
// 전부 진짜 textarea 그대로예요). 둘은 글꼴·패딩·줄바꿈 규칙이 똑같아야 글자가 어긋나지 않아서
// CSS(.code-block__pre / .code-block__textarea)에서 같은 값을 써요.
export default function CodeEditor({
  innerRef,
  value,
  language,
  placeholder,
  commented,
  onLanguageChange,
  onChange,
  onKeyDown,
  onPaste,
  onFocus,
  onBlur,
}) {
  const taRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const lang = language || "auto";
  const html = highlightCode(value, lang);
  const detected = lang === "auto" ? detectLanguage(value) : null;
  // 마지막이 줄바꿈으로 끝나면 <pre>가 그 빈 줄의 높이를 안 쳐서, 공백 하나를 붙여 맞춰요.
  const preHtml = value.endsWith("\n") ? `${html} ` : html;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 권한이 없으면 조용히 무시 */
    }
  };

  const handleKeyDown = (e) => {
    const ta = e.currentTarget;
    const composing = e.nativeEvent?.isComposing || e.keyCode === 229;

    if (!composing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Tab은 블록 들여쓰기가 아니라 코드 들여쓰기(공백 2칸)예요. Shift+Tab은 현재 줄 앞 공백을 걷어내요.
      if (e.key === "Tab") {
        e.preventDefault();
        const { selectionStart: selS, selectionEnd: selE, value: v } = ta;
        const spansLines = selS !== selE && v.slice(selS, selE).includes("\n");
        if (!e.shiftKey && !spansLines) {
          replaceRange(ta, selS, selE, "  ");
          return;
        }
        // 여러 줄을 선택했거나 Shift+Tab이면 줄 단위로 들여쓰기/내어쓰기해요(선택한 코드를 지우지 않아요).
        const ls = lineStartOf(v, selS);
        const endAdj = selE > selS && v[selE - 1] === "\n" ? selE - 1 : selE; // 줄 맨 앞까지 선택된 마지막 줄은 제외
        const lines = v.slice(ls, endAdj).split("\n");
        let firstDelta = 0;
        let totalDelta = 0;
        const next = lines.map((line, i) => {
          let out = line;
          if (!e.shiftKey) {
            if (line.trim() !== "") out = `  ${line}`;
          } else {
            const lead = /^( {1,2}|\t)/.exec(line);
            if (lead) out = line.slice(lead[0].length);
          }
          const d = out.length - line.length;
          if (i === 0) firstDelta = d;
          totalDelta += d;
          return out;
        });
        if (totalDelta === 0) return;
        const newS = Math.max(ls, selS + firstDelta);
        const newE = Math.max(newS, selE + totalDelta);
        replaceRange(ta, ls, endAdj, next.join("\n"), newS, newE);
        return;
      }

      // Enter는 지금 줄의 들여쓰기를 그대로 이어받아요(코드 편집기의 기본 동작).
      if (e.key === "Enter" && !e.shiftKey) {
        const pos = ta.selectionStart;
        const lineStart = lineStartOf(ta.value, pos);
        const indent = /^[ \t]*/.exec(ta.value.slice(lineStart, pos))[0];
        // 줄이 여는 괄호({ ( [) 나 파이썬 콜론(:)으로 끝나면 한 단 더 들여써요.
        const extra = /[{([:]\s*$/.test(ta.value.slice(lineStart, pos)) ? "  " : "";
        e.preventDefault();
        replaceRange(ta, ta.selectionStart, ta.selectionEnd, `\n${indent}${extra}`);
        return;
      }
    }

    onKeyDown?.(e);
  };

  return (
    <div className="code-block">
      <div className="code-block__bar">
        <select
          className="code-block__lang"
          value={lang}
          onChange={(e) => onLanguageChange?.(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="코드 언어"
        >
          {CODE_LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.id === "auto" && detected && detected !== "plain"
                ? `자동 감지 (${CODE_LANGUAGES.find((x) => x.id === detected)?.label})`
                : l.label}
            </option>
          ))}
        </select>
        <button type="button" className="code-block__copy" onClick={handleCopy}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "복사됨" : "복사"}</span>
        </button>
      </div>

      <div className="code-block__editor">
        <pre
          className={`code-block__pre${commented ? " code-block__pre--commented" : ""}`}
          aria-hidden="true"
        >
          <code dangerouslySetInnerHTML={{ __html: preHtml }} />
        </pre>
        <textarea
          ref={(el) => {
            taRef.current = el;
            if (innerRef) innerRef(el);
          }}
          className="code-block__textarea"
          aria-label="코드"
          value={value}
          placeholder={placeholder}
          rows={1}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
}
