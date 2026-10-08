// 표/데이터베이스의 텍스트 칸은 한 칸 안에서 여러 줄을 쓸 수 있는 <textarea>라, 블록 에디터처럼
// 글머리·번호 목록을 "글자"로 흉내 내요 — "- "(또는 "* ", "+ ")를 줄 맨 앞에서 치면 "• "로 바뀌고,
// 목록 줄에서 Enter를 치면 다음 줄도 "• "(번호면 다음 번호)로 이어져요. 항목이 빈 줄에서 Enter나
// Backspace를 치면 목록 표시만 지워져서 목록에서 빠져나와요. Shift+Enter는 그냥 줄바꿈이에요.
const BULLET = "• ";
const MARKER = /^(?:• |(\d+)\. )/;

// 커서가 있는 줄에서, 줄 맨 앞부터 커서까지의 글자와 그 줄이 시작하는 위치를 돌려줘요.
function currentLine(value, caret) {
  const start = value.lastIndexOf("\n", caret - 1) + 1;
  return { start, text: value.slice(start, caret) };
}

// textarea 하나에 붙일 onChange/onKeyDown을 만들어요. setValue(새 글자)로 값을 바꾸는데, 그 전에
// 화면의 textarea 값과 커서를 바로 맞춰놔요 — 값만 바꾸면 브라우저가 커서를 맨 끝으로 보내고,
// 나중에 되돌리면 그 사이에 이어 친 글자가 엉뚱한 자리에 들어가요.
export function cellListHandlers(setValue) {
  const apply = (el, value, caret) => {
    el.value = value;
    el.setSelectionRange(caret, caret);
    setValue(value);
  };

  return {
    onChange: (e) => {
      const el = e.target;
      const { value, selectionStart } = el;
      const typedSpace = e.nativeEvent?.inputType === "insertText" && e.nativeEvent?.data === " ";
      if (typedSpace) {
        const { start, text } = currentLine(value, selectionStart);
        if (/^[-*+] $/.test(text)) {
          apply(el, value.slice(0, start) + BULLET + value.slice(selectionStart), start + BULLET.length);
          return;
        }
      }
      setValue(value);
    },

    onKeyDown: (e) => {
      const el = e.target;
      const { value, selectionStart, selectionEnd } = el;
      if (selectionStart !== selectionEnd || e.nativeEvent?.isComposing || e.keyCode === 229) return;
      const isEnter = e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey;
      const isBackspace = e.key === "Backspace" && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (!isEnter && !isBackspace) return;

      const { start, text } = currentLine(value, selectionStart);
      const marker = MARKER.exec(text);
      if (!marker) return;
      const onlyMarker = text === marker[0];

      // 항목이 빈 줄(표시만 있는 줄)에서는 Enter/Backspace 모두 표시를 지워서 목록에서 나와요.
      if (onlyMarker) {
        e.preventDefault();
        apply(el, value.slice(0, start) + value.slice(selectionStart), start);
        return;
      }
      if (isEnter) {
        e.preventDefault();
        const next = marker[1] ? `${Number(marker[1]) + 1}. ` : BULLET;
        apply(el, `${value.slice(0, selectionStart)}\n${next}${value.slice(selectionStart)}`, selectionStart + 1 + next.length);
      }
    },
  };
}
