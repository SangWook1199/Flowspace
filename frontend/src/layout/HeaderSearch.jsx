import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { searchWorkspace } from "../api/search";
import "../styles/search.css";

// 결과 묶음 순서와 이름
const GROUPS = [
  { key: "pages", label: "페이지", Icon: Icons.FileText },
  { key: "tasks", label: "작업", Icon: Icons.CheckSquare },
  { key: "sprints", label: "스프린트", Icon: Icons.Zap },
  { key: "comments", label: "댓글", Icon: Icons.MessageSquare },
  { key: "events", label: "일정", Icon: Icons.CalendarDays },
];

const DEBOUNCE_MS = 250;

// 검색어와 같은 부분을 <mark>로 감싸요(대소문자 무시, 정규식 특수문자는 이스케이프).
function Highlight({ text, keyword }) {
  if (!text || !keyword) return text ?? null;

  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));

  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? <mark key={i}>{part}</mark> : part,
  );
}

// 헤더 검색창 — 입력하면 잠깐 기다렸다가(디바운스) 서버에 묻고, 종류별로 묶어서 보여줘요.
// ↑↓로 고르고 Enter로 이동, Esc로 닫아요. Ctrl/⌘+K로 어디서든 검색창에 포커스해요.
export default function HeaderSearch({ workspaceId }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const keyword = value.trim();

  // 키보드로 고를 수 있게 결과를 한 줄짜리 목록으로 펼쳐요.
  const flat = useMemo(() => {
    if (!result) return [];
    return GROUPS.flatMap(({ key }) => result[key] ?? []);
  }, [result]);

  // 입력이 멈추면(250ms) 검색해요. 먼저 보낸 요청은 취소해서 늦게 도착한 옛 결과가 덮어쓰지 않게 해요.
  useEffect(() => {
    if (!workspaceId || keyword.length === 0) {
      setResult(null);
      setLoading(false);
      setError(false);
      return undefined;
    }

    setLoading(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const data = await searchWorkspace(workspaceId, keyword, { signal: controller.signal });
        setResult(data);
        setError(false);
        setActive(0);
        setLoading(false);
      } catch (e) {
        if (controller.signal.aborted || e?.code === "ERR_CANCELED") return;
        setResult(null);
        setError(true);
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [keyword, workspaceId]);

  // 바깥을 누르면 닫아요.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Ctrl/⌘ + K
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (item) => {
    if (!item?.link) return;
    setOpen(false);
    setValue("");
    inputRef.current?.blur();
    navigate(item.link);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown" && flat.length > 0) {
      e.preventDefault();
      setActive((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp" && flat.length > 0) {
      e.preventDefault();
      setActive((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter" && flat.length > 0) {
      e.preventDefault();
      go(flat[active]);
    }
  };

  const showPanel = open && keyword.length > 0;
  let offset = 0;

  return (
    <div className="headerSearch" ref={wrapRef}>
      <div className="headerSearch__box">
        <Icons.Search size={18} />
        <input
          ref={inputRef}
          type="search"
          value={value}
          placeholder="검색 (Ctrl K)"
          maxLength={50}
          aria-label="워크스페이스 검색"
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {value && (
          <button
            type="button"
            className="headerSearch__clear"
            aria-label="검색어 지우기"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
          >
            <Icons.X size={14} />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="headerSearch__panel" role="listbox">
          {loading && !result && <p className="headerSearch__state">검색 중…</p>}
          {error && <p className="headerSearch__state">검색하지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
          {!loading && !error && result && flat.length === 0 && (
            <p className="headerSearch__state">‘{keyword}’에 대한 결과가 없어요.</p>
          )}

          {!error &&
            result &&
            GROUPS.map(({ key, label, Icon }) => {
              const items = result[key] ?? [];
              if (items.length === 0) return null;
              const start = offset;
              offset += items.length;

              return (
                <section key={key} className="headerSearch__group">
                  <h4>{label}</h4>
                  {items.map((item, i) => {
                    const index = start + i;
                    return (
                      <button
                        type="button"
                        key={`${item.type}-${item.id}`}
                        role="option"
                        aria-selected={index === active}
                        className={`headerSearch__item${index === active ? " is-active" : ""}`}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(item)}
                      >
                        <span className="headerSearch__icon">
                          {item.icon ? item.icon : <Icon size={16} />}
                        </span>
                        <span className="headerSearch__text">
                          <span className="headerSearch__title">
                            <Highlight text={item.title} keyword={keyword} />
                          </span>
                          {item.snippet && (
                            <span className="headerSearch__snippet">
                              <Highlight text={item.snippet} keyword={keyword} />
                            </span>
                          )}
                        </span>
                        {item.meta && <small className="headerSearch__meta">{item.meta}</small>}
                      </button>
                    );
                  })}
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}
