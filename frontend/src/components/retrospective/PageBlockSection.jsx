import { useEffect, useRef, useState } from "react";
import {
  Plus,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  Type,
  Trash2,
  FileText,
  Heading1,
  Heading2,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Minus,
  Code2,
  Image as ImageIcon,
  Table,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Circle,
} from "lucide-react";

const BLOCK_TYPES = [
  { type: "TEXT", label: "텍스트", icon: FileText, desc: "일반 텍스트로 작성" },
  { type: "H1", label: "제목 1", icon: Heading1, desc: "큰 섹션 제목" },
  { type: "H2", label: "제목 2", icon: Heading2, desc: "보통 섹션 제목" },
  { type: "TODO", label: "할 일", icon: CheckSquare, desc: "체크박스가 있는 할 일" },
  { type: "BULLET", label: "글머리 기호", icon: List, desc: "글머리 기호 목록 만들기" },
  { type: "NUMBERED", label: "번호 매기기", icon: ListOrdered, desc: "번호가 매겨진 목록" },
  { type: "QUOTE", label: "인용", icon: Quote, desc: "인용구 만들기" },
  { type: "TABLE", label: "표", icon: Table, desc: "여러 열로 이루어진 표 만들기" },
  { type: "DIVIDER", label: "구분선", icon: Minus, desc: "시각적으로 섹션 구분" },
  { type: "CODE", label: "코드", icon: Code2, desc: "코드 스니펫 작성" },
  { type: "IMAGE", label: "이미지", icon: ImageIcon, desc: "이미지 업로드" },
];

const MULTILINE_TYPES = ["TEXT", "CODE", "QUOTE"];
const LIST_TYPES = ["BULLET", "NUMBERED", "TODO"];

// 표 블록(예: Keep/Problem/Try) 컬럼 이름별 아이콘/색상. 백엔드의
// block_database_columns 이름을 그대로 받는 걸 가정해서, 매칭 안 되는
// 이름이 와도 DEFAULT_META로 자연스럽게 떨어지게 했어요.
const COLUMN_META = {
  Keep: { icon: CheckCircle2, color: "keep", desc: "잘했던 점, 유지하고 싶은 경험" },
  Problem: { icon: AlertTriangle, color: "problem", desc: "아쉬웠던 점과 개선이 필요한 부분" },
  Try: { icon: Lightbulb, color: "try", desc: "다음 스프린트에서 시도할 개선안" },
};
const DEFAULT_COLUMN_META = { icon: Circle, color: "default", desc: "" };

function metaFor(name) {
  return COLUMN_META[name] || DEFAULT_COLUMN_META;
}

export default function PageBlockSection({ blocks: initialBlocks }) {
  // Mock → 나중에 pages/{pageId}/blocks API로 교체.
  // 회고의 Keep/Problem/Try 표도 이 blocks 배열 안의 TABLE 타입 블록 하나예요.
  // 노션에서 표도 결국 블록인 것과 같은 구조라, 별도 섹션으로 안 두고
  // 자유 서술 블록들과 같은 리스트로 관리합니다.
  const [blocks, setBlocks] = useState(initialBlocks);
  const [slashMenu, setSlashMenu] = useState(null); // { blockId, query }
  const [blockMenu, setBlockMenu] = useState(null); // { blockId, mode: "main" | "convert" }

  const inputRefs = useRef({});
  const idCounter = useRef(
    Math.max(0, ...initialBlocks.map((b) => b.id)) + 1,
  );

  const nextId = () => idCounter.current++;

  const focusBlock = (id) => {
    requestAnimationFrame(() => {
      const el = inputRefs.current[id];
      if (!el) return;
      el.focus();
      if (typeof el.setSelectionRange === "function") {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    });
  };

  const updateBlock = (id, patch) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    );
  };

  const insertBlockAfter = (id, type = "TEXT") => {
    const newId = nextId();

    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const next = [...prev];
      next.splice(index + 1, 0, createEmptyBlock(newId, type));
      return next;
    });

    focusBlock(newId);
  };

  const addBlockAtEnd = (type = "TEXT") => {
    const newId = nextId();
    setBlocks((prev) => [...prev, createEmptyBlock(newId, type)]);
    focusBlock(newId);
  };

  const deleteBlock = (id) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1 || prev.length === 1) return prev;

      const next = prev.filter((b) => b.id !== id);
      const target = next[Math.max(0, index - 1)];
      if (target) focusBlock(target.id);

      return next;
    });
    setBlockMenu(null);
  };

  const moveBlock = (id, direction) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setBlockMenu(null);
  };

  const convertBlock = (id, type) => {
    updateBlock(id, {
      type,
      content: "",
      ...(type === "TODO" ? { checked: false } : {}),
      ...(type === "IMAGE" ? { image: null } : {}),
      ...(type === "TABLE" ? { table: createDefaultTable() } : {}),
    });
    setSlashMenu(null);
    setBlockMenu(null);
    focusBlock(id);
  };

  const handleChange = (block, value) => {
    const wasEmpty = block.content === "";

    if (wasEmpty && value.startsWith("/")) {
      setSlashMenu({ blockId: block.id, query: value.slice(1) });
    } else if (slashMenu?.blockId === block.id) {
      setSlashMenu(null);
    }

    updateBlock(block.id, { content: value });
  };

  const handleKeyDown = (e, block) => {
    if (e.key === "Enter" && !e.shiftKey && block.type !== "CODE") {
      e.preventDefault();

      if (LIST_TYPES.includes(block.type) && block.content.trim() === "") {
        updateBlock(block.id, { type: "TEXT" });
        return;
      }

      const continueType = LIST_TYPES.includes(block.type)
        ? block.type
        : "TEXT";

      insertBlockAfter(block.id, continueType);
      return;
    }

    if (e.key === "Backspace" && block.content === "" && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(block.id);
      return;
    }

    if (e.key === "Escape" && slashMenu?.blockId === block.id) {
      setSlashMenu(null);
    }
  };

  const handleBlur = (block) => {
    // 슬래시 메뉴 버튼 클릭이 먼저 처리되도록 약간 지연 후 닫는다
    setTimeout(() => {
      setSlashMenu((m) => (m?.blockId === block.id ? null : m));
    }, 150);
  };

  const handleImageSelect = (block, file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(block.id, {
        image: {
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          url: reader.result,
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const numbers = computeNumbers(blocks);

  return (
    <section className="page-block-section">
      <div className="retro-section__header">
        <h2>회고 노트</h2>
        <p>
          Keep · Problem · Try 표와 자유롭게 쓰는 메모를 하나의 페이지로
          관리해요. "/"로 블록 종류를 바꾸고, 블록 오른쪽의 "⋯"에서
          이동·삭제할 수 있어요.
        </p>
      </div>

      <div className="block-editor">
        {blockMenu && (
          <div
            className="block-menu-overlay"
            onClick={() => setBlockMenu(null)}
          />
        )}

        {blocks.map((block, index) => (
          <BlockRow
            key={block.id}
            block={block}
            number={numbers[index]}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
            isSlashOpen={slashMenu?.blockId === block.id}
            slashQuery={slashMenu?.blockId === block.id ? slashMenu.query : ""}
            isMoreOpen={blockMenu?.blockId === block.id}
            moreMode={blockMenu?.blockId === block.id ? blockMenu.mode : "main"}
            onChange={(value) => handleChange(block, value)}
            onKeyDown={(e) => handleKeyDown(e, block)}
            onBlur={() => handleBlur(block)}
            onToggleCheck={() =>
              updateBlock(block.id, { checked: !block.checked })
            }
            onImageSelect={(file) => handleImageSelect(block, file)}
            onTableChange={(table) => updateBlock(block.id, { table })}
            onConvert={(type) => convertBlock(block.id, type)}
            onAddBelow={() => {
              insertBlockAfter(block.id);
              setBlockMenu(null);
            }}
            onDelete={() => deleteBlock(block.id)}
            onMoveUp={() => moveBlock(block.id, "up")}
            onMoveDown={() => moveBlock(block.id, "down")}
            onToggleMore={() =>
              setBlockMenu((prev) =>
                prev?.blockId === block.id
                  ? null
                  : { blockId: block.id, mode: "main" },
              )
            }
            onOpenConvertView={() =>
              setBlockMenu({ blockId: block.id, mode: "convert" })
            }
            onOpenMainView={() =>
              setBlockMenu({ blockId: block.id, mode: "main" })
            }
            registerRef={(el) => {
              inputRefs.current[block.id] = el;
            }}
          />
        ))}

        <button
          type="button"
          className="block-add-row"
          onClick={() => addBlockAtEnd("TEXT")}
        >
          <Plus size={16} />
          블록 추가
        </button>
      </div>
    </section>
  );
}

/* ================= BlockRow ================= */

function BlockRow({
  block,
  number,
  isFirst,
  isLast,
  isSlashOpen,
  slashQuery,
  isMoreOpen,
  moreMode,
  onChange,
  onKeyDown,
  onBlur,
  onToggleCheck,
  onImageSelect,
  onTableChange,
  onConvert,
  onAddBelow,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleMore,
  onOpenConvertView,
  onOpenMainView,
  registerRef,
}) {
  const isMultiline = MULTILINE_TYPES.includes(block.type);
  const checkedClass =
    block.type === "TODO" && block.checked ? "checked" : "";

  return (
    <div
      className={`block-row block-${block.type.toLowerCase()} ${
        isMoreOpen ? "menu-open" : ""
      }`}
    >
      <div className="block-body">
        {block.type === "DIVIDER" ? (
          <hr className="block-divider-line" />
        ) : block.type === "IMAGE" ? (
          <BlockImage block={block} onImageSelect={onImageSelect} />
        ) : block.type === "TABLE" ? (
          <TableBlockBody table={block.table} onChange={onTableChange} />
        ) : (
          <>
            {block.type === "TODO" && (
              <input
                type="checkbox"
                className="block-checkbox"
                checked={!!block.checked}
                onChange={onToggleCheck}
              />
            )}

            {block.type === "BULLET" && <span className="block-bullet">•</span>}

            {block.type === "NUMBERED" && (
              <span className="block-number">{number}.</span>
            )}

            {block.type === "QUOTE" && <span className="block-quote-bar" />}

            {isMultiline ? (
              <AutoTextarea
                innerRef={registerRef}
                className={`block-input block-input--${block.type.toLowerCase()} ${checkedClass}`}
                value={block.content}
                placeholder={placeholderFor(block.type)}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
              />
            ) : (
              <input
                ref={registerRef}
                type="text"
                className={`block-input block-input--${block.type.toLowerCase()} ${checkedClass}`}
                value={block.content}
                placeholder={placeholderFor(block.type)}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
              />
            )}
          </>
        )}

        {isSlashOpen && <SlashMenu query={slashQuery} onSelect={onConvert} />}
      </div>

      <div className="block-actions">
        <button
          type="button"
          className="block-more-btn"
          onClick={onToggleMore}
          title="블록 옵션"
        >
          <MoreHorizontal size={15} />
        </button>

        {isMoreOpen && (
          <div className="block-menu">
            {moreMode === "main" ? (
              <>
                <button type="button" onClick={onOpenConvertView}>
                  <Type size={14} />
                  <span>타입 변경</span>
                  <ChevronRight size={12} className="block-menu__chevron" />
                </button>

                <button type="button" onClick={onMoveUp} disabled={isFirst}>
                  <ArrowUp size={14} />
                  <span>위로 이동</span>
                </button>

                <button type="button" onClick={onMoveDown} disabled={isLast}>
                  <ArrowDown size={14} />
                  <span>아래로 이동</span>
                </button>

                <button type="button" onClick={onAddBelow}>
                  <Plus size={14} />
                  <span>아래에 블록 추가</span>
                </button>

                <hr className="block-menu__divider" />

                <button type="button" className="danger" onClick={onDelete}>
                  <Trash2 size={14} />
                  <span>삭제</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="block-menu__back"
                  onClick={onOpenMainView}
                >
                  <ChevronLeft size={12} />
                  <span>뒤로</span>
                </button>

                {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onConvert(type)}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= TableBlockBody (Keep/Problem/Try 같은 표 블록) ================= */

function TableBlockBody({ table, onChange }) {
  const { columns, cells } = table;
  const [focusRowId, setFocusRowId] = useState(null);

  const nextRowId = useRef(Math.max(0, ...cells.map((c) => c.rowId), 0) + 1);
  const inputRefs = useRef({});

  useEffect(() => {
    if (focusRowId == null) return;
    const el = inputRefs.current[focusRowId];
    if (el) {
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }
    setFocusRowId(null);
  }, [focusRowId, cells]);

  const itemsByColumn = (columnId) => cells.filter((c) => c.columnId === columnId);

  const updateCell = (rowId, value) => {
    onChange({
      ...table,
      cells: cells.map((c) => (c.rowId === rowId ? { ...c, value } : c)),
    });
  };

  // 현재 줄(afterRowId) 바로 다음, 같은 컬럼 안에 새 글머리 줄을 삽입
  const insertLineAfter = (columnId, afterRowId) => {
    const newId = nextRowId.current++;
    const index = cells.findIndex((c) => c.rowId === afterRowId);
    const next = [...cells];
    next.splice(index + 1, 0, { rowId: newId, columnId, value: "" });
    onChange({ ...table, cells: next });
    setFocusRowId(newId);
  };

  // 빈 줄에서 Backspace → 그 줄을 지우고 이전 줄 끝으로 포커스.
  // 컬럼에 남는 줄이 없으면 빈 줄 하나는 항상 유지.
  const deleteLine = (columnId, rowId) => {
    const columnItems = itemsByColumn(columnId);
    if (columnItems.length <= 1) return;

    const index = columnItems.findIndex((c) => c.rowId === rowId);
    const prevItem = columnItems[index - 1];

    onChange({ ...table, cells: cells.filter((c) => c.rowId !== rowId) });
    if (prevItem) setFocusRowId(prevItem.rowId);
  };

  const handleLineKeyDown = (e, columnId, rowId) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      insertLineAfter(columnId, rowId);
      return;
    }

    if (e.key === "Backspace") {
      const el = e.target;
      const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
      if (atStart && el.value === "") {
        e.preventDefault();
        deleteLine(columnId, rowId);
      }
    }
  };

  return (
    <div className="review-table-wrap">
      <table className="review-table">
        <thead>
          <tr>
            {columns.map((col) => {
              const { icon: Icon, color, desc } = metaFor(col.name);
              return (
                <th key={col.id} className={color}>
                  <div className="review-table__head">
                    <Icon size={15} />
                    <span>{col.name}</span>
                  </div>
                  {desc && <p>{desc}</p>}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          <tr>
            {columns.map((col) => {
              const { color } = metaFor(col.name);
              const columnItems = itemsByColumn(col.id);

              return (
                <td key={col.id} className={color}>
                  <div className="review-column">
                    {columnItems.map((item) => (
                      <div className="review-line" key={item.rowId}>
                        <span className="review-line__bullet">*</span>

                        <AutoTextarea
                          innerRef={(el) => {
                            if (el) inputRefs.current[item.rowId] = el;
                            else delete inputRefs.current[item.rowId];
                          }}
                          className="review-line__input"
                          value={item.value}
                          placeholder={columnItems.length === 1 ? "+ 항목 추가" : ""}
                          onChange={(e) => updateCell(item.rowId, e.target.value)}
                          onKeyDown={(e) => handleLineKeyDown(e, col.id, item.rowId)}
                        />

                        {columnItems.length > 1 && (
                          <button
                            type="button"
                            className="review-line__delete"
                            onClick={() => deleteLine(col.id, item.rowId)}
                            title="항목 삭제"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ================= AutoTextarea ================= */

function AutoTextarea({ innerRef, className, value, placeholder, onChange, onKeyDown, onBlur }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        if (innerRef) innerRef(el);
      }}
      className={className}
      value={value}
      placeholder={placeholder}
      rows={1}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    />
  );
}

/* ================= BlockImage ================= */

function BlockImage({ block, onImageSelect }) {
  const fileRef = useRef(null);
  const image = block.image;

  if (image) {
    return (
      <div className="page-image-box">
        {image.url ? (
          <img
            src={image.url}
            alt={image.fileName}
            className="block-image-preview"
          />
        ) : (
          <div className="block-image-placeholder">
            <ImageIcon size={22} />
          </div>
        )}

        <div className="block-image-meta">
          <strong>{image.fileName}</strong>
          <span>{image.fileSize}</span>
        </div>

        <button
          type="button"
          className="block-image-replace"
          onClick={() => fileRef.current?.click()}
        >
          변경
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onImageSelect(e.target.files?.[0])}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="block-image-empty"
      onClick={() => fileRef.current?.click()}
    >
      <ImageIcon size={22} />
      <span>클릭해서 이미지 업로드</span>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onImageSelect(e.target.files?.[0])}
      />
    </button>
  );
}

/* ================= SlashMenu ================= */

function SlashMenu({ query, onSelect }) {
  const filtered = BLOCK_TYPES.filter((item) => {
    const q = (query || "").toLowerCase();
    return (
      item.label.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="block-slash-menu">
        <p className="block-slash-empty">일치하는 블록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="block-slash-menu">
      {filtered.map(({ type, label, icon: Icon, desc }) => (
        <button
          key={type}
          type="button"
          // onMouseDown으로 blur보다 먼저 처리되게 한다
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(type);
          }}
        >
          <Icon size={16} />
          <div>
            <strong>{label}</strong>
            <span>{desc}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ================= Util ================= */

function createEmptyBlock(id, type) {
  if (type === "TODO") return { id, type, content: "", checked: false };
  if (type === "IMAGE") return { id, type, image: null };
  if (type === "TABLE") return { id, type, table: createDefaultTable() };
  return { id, type, content: "" };
}

// 새로 만드는 표 블록의 기본값. 컬럼마다 빈 글머리 줄을 하나씩 깔아둬서
// 바로 타이핑할 수 있게 해요. rowId는 음수로 시작해 이후 삽입되는
// 실제 줄들의 id(1부터 증가)와 겹치지 않게 합니다.
function createDefaultTable() {
  const columns = [
    { id: 1, name: "Column 1" },
    { id: 2, name: "Column 2" },
    { id: 3, name: "Column 3" },
  ];
  return {
    columns,
    cells: columns.map((col) => ({ rowId: -col.id, columnId: col.id, value: "" })),
  };
}

function placeholderFor(type) {
  switch (type) {
    case "H1":
      return "제목 1";
    case "H2":
      return "제목 2";
    case "TODO":
      return "할 일을 입력하세요";
    case "BULLET":
    case "NUMBERED":
      return "목록 항목";
    case "QUOTE":
      return "인용구를 입력하세요";
    case "CODE":
      return "코드를 입력하세요";
    default:
      return "내용을 입력하거나 '/'로 블록 추가...";
  }
}

function computeNumbers(blocks) {
  const numbers = [];
  let counter = 0;

  blocks.forEach((block) => {
    if (block.type === "NUMBERED") {
      counter += 1;
    } else {
      counter = 0;
    }
    numbers.push(counter);
  });

  return numbers;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
