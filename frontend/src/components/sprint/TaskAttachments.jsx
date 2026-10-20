import { useContext, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Paperclip, Search, X } from "lucide-react";
import styles from "./TaskWorkspace.module.css";
import useDismiss from "./useDismiss";
import useDialog from "../../context/useDialog";
import WorkspaceContext from "../../context/WorkspaceContext";
import { useTaskAttachments } from "../../hooks/useTaskAttachments";

// 서버(FileService.DOCUMENT_EXTENSIONS)와 같은 목록이에요. 여기서 먼저 걸러 주면 큰 파일을 헛되이 올리지 않아요.
const ALLOWED_EXTENSIONS = [
  "doc", "docx", "xls", "xlsx", "xlsm", "ppt", "pptx", "hwp", "hwpx", "pdf", "txt", "csv", "md", "rtf",
  "odt", "ods", "odp", "zip", "7z", "png", "jpg", "jpeg", "gif", "webp", "bmp",
];
const ACCEPT = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",");
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const extensionOf = (name) => {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
};

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};

// 확장자를 색깔 있는 작은 이름표로 보여줘요(엑셀은 초록, 워드·한글은 파랑 등).
const EXT_COLORS = {
  xls: "#1d7f4d", xlsx: "#1d7f4d", xlsm: "#1d7f4d", csv: "#1d7f4d", ods: "#1d7f4d",
  doc: "#2a5db0", docx: "#2a5db0", hwp: "#2a5db0", hwpx: "#2a5db0", odt: "#2a5db0", rtf: "#2a5db0",
  ppt: "#c2501b", pptx: "#c2501b", odp: "#c2501b",
  pdf: "#d03a3a",
  zip: "#7a5a1c", "7z": "#7a5a1c",
};

function FileTypeIcon({ name }) {
  const ext = extensionOf(name);
  if (!ext) return <FileText size={18} />;
  const color = EXT_COLORS[ext] ?? "#60708b";
  return (
    <span className={styles.attachmentExt} style={{ color, borderColor: color }}>
      {ext.slice(0, 4)}
    </span>
  );
}

// 작업 상세의 "관련 문서": 워크스페이스 페이지를 연결하거나 엑셀·워드·한글 같은 문서 파일을 올려 둬요.
export default function TaskAttachments({ taskId }) {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const pages = useContext(WorkspaceContext)?.pagesInWorkspace;
  const { attachments, loading, busy, error, setError, addPage, addFiles, remove } = useTaskAttachments(taskId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const pickerRef = useRef(null);
  const inputRef = useRef(null);

  useDismiss(pickerOpen, pickerRef, () => setPickerOpen(false));

  const linkedPageIds = useMemo(() => new Set(attachments.filter((a) => a.type === "PAGE").map((a) => a.pageId)), [attachments]);

  // 아직 연결 안 된, 휴지통에 없는 실제 페이지만 후보로 보여줘요.
  const candidates = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (pages ?? [])
      .filter((page) => typeof page.id === "number" && page.id > 0 && !page.trashedAt && !linkedPageIds.has(page.id))
      .filter((page) => !keyword || (page.title ?? "").toLowerCase().includes(keyword))
      .slice(0, 50);
  }, [pages, query, linkedPageIds]);

  const upload = (fileList) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const accepted = [];
    let message = "";
    for (const file of files) {
      if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
        message = `${file.name}: 올릴 수 없는 파일 형식이에요. (문서·압축·이미지 파일만 가능해요)`;
      } else if (file.size > MAX_FILE_SIZE) {
        message = `${file.name}: 파일이 너무 커요. 20MB 이하만 올릴 수 있어요.`;
      } else if (file.size === 0) {
        message = `${file.name}: 비어 있는 파일이에요.`;
      } else {
        accepted.push(file);
      }
    }
    setError(message);
    if (accepted.length > 0) addFiles(accepted);
  };

  const choosePage = async (page) => {
    if (await addPage(page.id)) {
      setPickerOpen(false);
      setQuery("");
    }
  };

  const removeItem = async (item) => {
    const name = item.type === "PAGE" ? item.pageTitle || "제목 없음" : item.fileName;
    const ok = await confirm({
      title: "관련 문서 삭제",
      message:
        item.type === "PAGE"
          ? `"${name}" 연결을 해제할까요? 페이지 자체는 삭제되지 않아요.`
          : `"${name}" 파일을 삭제할까요? 올린 파일이 완전히 지워져요.`,
      confirmLabel: item.type === "PAGE" ? "해제" : "삭제",
      danger: true,
    });
    if (ok) remove(item.id);
  };

  return (
    <section
      className={`${styles.attachments} ${dragging ? styles.attachmentsDrag : ""}`}
      onDragOver={(e) => {
        if (!e.dataTransfer?.types?.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer?.files?.length) return;
        e.preventDefault();
        setDragging(false);
        upload(e.dataTransfer.files);
      }}
    >
      <h3>
        관련 문서 <small>{attachments.length}</small>
      </h3>

      {!loading && attachments.length === 0 && <small className={styles.emptyHint}>페이지를 연결하거나 문서 파일을 올려 보세요. 파일을 여기로 끌어다 놓아도 돼요.</small>}

      {attachments.length > 0 && (
        <ul className={styles.attachmentList}>
          {attachments.map((item) => {
            const isPage = item.type === "PAGE";
            const title = isPage ? item.pageTitle || "제목 없음" : item.fileName;
            const meta = isPage ? "페이지" : [formatSize(item.fileSize), item.createdByName].filter(Boolean).join(" · ");
            const body = (
              <>
                <span className={styles.attachmentIcon}>{isPage ? <span aria-hidden="true">{item.pageIcon}</span> : <FileTypeIcon name={item.fileName} />}</span>
                <span className={styles.attachmentText}>
                  <b title={title}>{title}</b>
                  {meta && <small>{meta}</small>}
                </span>
              </>
            );
            return (
              <li key={item.id} className={styles.attachmentRow}>
                {isPage ? (
                  <button type="button" className={styles.attachmentMain} onClick={() => navigate(`/pages/${item.pageId}`)}>
                    {body}
                  </button>
                ) : (
                  <a className={styles.attachmentMain} href={item.fileUrl} target="_blank" rel="noreferrer" download={item.fileName}>
                    {body}
                  </a>
                )}
                <button type="button" className={styles.attachmentDelete} aria-label={`${title} 삭제`} onClick={() => removeItem(item)}>
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.attachmentActions} ref={pickerRef}>
        <button type="button" disabled={busy} onClick={() => setPickerOpen((open) => !open)}>
          <FileText size={14} /> 페이지 연결
        </button>
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Paperclip size={14} /> {busy ? "처리 중…" : "파일 추가"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = "";
          }}
        />

        {pickerOpen && (
          <div className={styles.attachmentPicker}>
            <label>
              <Search size={14} />
              <input autoFocus placeholder="페이지 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <ul>
              {candidates.length === 0 && <li className={styles.attachmentPickerEmpty}>연결할 수 있는 페이지가 없어요.</li>}
              {candidates.map((page) => (
                <li key={page.id}>
                  <button type="button" disabled={busy} onClick={() => choosePage(page)}>
                    <span aria-hidden="true">{page.icon ?? "📄"}</span>
                    <span>{page.title || "제목 없음"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && (
        <small role="alert" className={styles.attachmentError}>
          {error}
        </small>
      )}
    </section>
  );
}
