import { useLayoutEffect, useRef } from "react";
import {
  Bold,
  CheckSquare,
  Italic,
  Link,
  List,
  ListOrdered,
} from "lucide-react";

import { htmlToText, isSafeUrl, sanitizeHtml, textToHtml } from "../../utils/sanitizeHtml";

// [아이콘, 명령, 라벨]. 체크리스트는 브라우저에 전용 명령이 없어서, 글머리 기호와 똑같이 동작하던 걸
// "☐ " 표시를 커서 자리에 넣는 명령(checklist)으로 분리했어요.
const commands = [
  [Bold, "bold", "굵게"],
  [Italic, "italic", "기울임"],
  [List, "insertUnorderedList", "글머리 기호"],
  [ListOrdered, "insertOrderedList", "번호 목록"],
  [CheckSquare, "checklist", "체크리스트"],
  [Link, "createLink", "링크"],
];

// maxLength는 글자 수 표시용이에요(넘으면 부모(SprintForm)가 제출을 막아요).
export default function RichTextEditor({ value = "", onChange, maxLength = 2000 }) {
  const editorRef = useRef(null);
  // 마지막으로 "우리가" 부모에게 내보낸 값이에요. 입력하는 동안은 DOM이 진짜 값이라서,
  // 부모가 돌려준 value가 이 값과 같으면(=방금 우리가 친 내용) innerHTML을 다시 쓰지 않아요.
  // (예전엔 매 입력마다 innerHTML을 덮어써서 커서가 맨 앞으로 튀고 글자가 거꾸로 써지고
  // 한글 조합(IME)도 끊겼어요.) 다른 값이 들어왔을 때(폼 초기화 등)만 DOM을 새로 그려요.
  const emittedRef = useRef(null);
  // 툴바 버튼(키보드로 누를 때)을 누르면 포커스가 에디터를 떠나서, 마지막 커서 위치를 기억해뒀다가 써요.
  const savedRangeRef = useRef(null);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === emittedRef.current) return;

    const clean = sanitizeHtml(value);
    if (editor.innerHTML !== clean) editor.innerHTML = clean;
    emittedRef.current = value;
  }, [value]);

  const saveRange = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (selection?.rangeCount && editor?.contains(selection.anchorNode)) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  // DOM 내용을 걸러서 부모에게 알려요. DOM 자체는 (비었을 때 말고는) 건드리지 않아서 커서가 그대로예요.
  const emit = () => {
    const editor = editorRef.current;
    if (!editor) return;

    // 다 지웠을 때 브라우저가 남기는 <br>/<div><br></div> 때문에 placeholder가 안 보이니, 비었으면 비워줘요.
    if (!editor.textContent && !editor.querySelector("li, a")) editor.innerHTML = "";

    const clean = sanitizeHtml(editor.innerHTML);
    emittedRef.current = clean;
    onChange?.(clean);
  };

  const focusEditor = () => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;

    editor.focus();
    const saved = savedRangeRef.current;
    if (saved) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(saved);
    }
  };

  const run = (command) => {
    focusEditor();

    if (command === "createLink") {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
      // prompt가 떠 있는 동안 선택이 풀릴 수 있어서, 먼저 범위를 기억했다가 돌려놓아요.
      const url = window.prompt("링크 주소를 입력하세요", "https://")?.trim();
      if (!url || !isSafeUrl(url)) return;

      editorRef.current?.focus();
      if (range) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      document.execCommand("createLink", false, url);
    } else if (command === "checklist") {
      document.execCommand("insertText", false, "☐ ");
    } else {
      document.execCommand(command, false);
    }

    emit();
  };

  // 붙여넣기: 브라우저가 서식째로 넣게 두면 위험한 태그/속성이 같이 들어와서, 직접 걸러서 넣어요.
  const insertSanitized = (dataTransfer) => {
    const html = dataTransfer.getData("text/html");
    const text = dataTransfer.getData("text/plain");
    if (!html && !text) return;

    document.execCommand("insertHTML", false, html ? sanitizeHtml(html) : textToHtml(text));
    emit();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    insertSanitized(e.clipboardData);
  };

  // 드래그해서 끌어놓는 내용도 붙여넣기와 똑같이 걸러서 넣어요(놓은 자리로 커서를 먼저 옮겨요).
  const handleDrop = (e) => {
    e.preventDefault();

    const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (range) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }

    insertSanitized(e.dataTransfer);
  };

  return (
    <section className="richEditor">
      <label>상세 설명</label>
      <div className="editorShell">
        <div className="editorTools" role="toolbar" aria-label="서식 도구">
          {commands.map(([Icon, command, label]) => (
            <button
              type="button"
              title={label}
              aria-label={label}
              // 마우스: mousedown에서 preventDefault로 에디터 포커스(선택 영역)를 지키면서 바로 실행해요.
              onMouseDown={(e) => {
                e.preventDefault();
                run(command);
              }}
              // 키보드: Enter/Space로도 같은 동작을 하게 해요(mousedown은 키보드로는 안 일어나요).
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  run(command);
                }
              }}
              key={label}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
        <div
          ref={editorRef}
          className="editor"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="상세 설명"
          data-placeholder="스프린트에 대한 상세 설명을 작성하세요. (선택)"
          onInput={emit}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onKeyUp={saveRange}
          onMouseUp={saveRange}
          onBlur={saveRange}
        />
      </div>
      <div className="fieldFooter">
        <span>
          스프린트의 배경, 범위, 기대 효과 등을 자유롭게 작성할 수 있습니다.
        </span>
        <b>{htmlToText(value).length} / {maxLength}</b>
      </div>
    </section>
  );
}
