import { useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Camera, ChevronRight, ImagePlus, Smile, Trash2, X } from "lucide-react";

import BlockEditor from "../components/page/BlockEditor";
import "../styles/page-detail.css";

const ICON_CHOICES = [
  "📄", "📘", "📗", "📙", "📕", "📝", "🎨", "🧩",
  "✅", "📊", "🗂️", "🔐", "🚀", "🐛", "💡", "📌",
  "🧪", "🛠️", "📎", "📚", "🗓️", "🎯", "🔧", "📁",
];

export default function PageDetailPage() {
  // 실제로는 pages/{pageId} + pages/{pageId}/blocks API로 교체.
  // 지금은 MainLayout에서 끌어올린 세션 상태(pages/setPages)를
  // Outlet context로 받아서 씁니다 — 여러 페이지를 오가도, 새 페이지를
  // 만들어도 사이드바와 바로 동기화돼요.
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { pages, setPages, createPage, deletePage, renamePage } = useOutletContext();

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const coverInputRef = useRef(null);

  const page = pages.find((p) => String(p.id) === pageId);

  if (!page) {
    return (
      <div className="page-detail-page">
        <p className="page-detail__missing">페이지를 찾을 수 없어요.</p>
      </div>
    );
  }

  const updatePage = (patch) => {
    setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, ...patch } : p)));
  };

  // breadcrumb: 바로 위 부모만이 아니라 최상위까지 전체 경로를 보여줘요.
  const ancestors = [];
  let cursor = page.parentPageId ? pages.find((p) => p.id === page.parentPageId) : null;
  while (cursor) {
    ancestors.unshift(cursor);
    cursor = cursor.parentPageId ? pages.find((p) => p.id === cursor.parentPageId) : null;
  }
  const parent = ancestors[ancestors.length - 1] || null;

  const handleCoverSelect = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updatePage({ cover: reader.result });
    reader.readAsDataURL(file);
  };

  const handleDeletePage = () => {
    const hasChildren = pages.some((p) => p.parentPageId === page.id);
    const confirmed = window.confirm(
      hasChildren
        ? "이 페이지를 삭제하면 하위 페이지도 모두 함께 삭제돼요. 계속할까요?"
        : "이 페이지를 삭제할까요?",
    );
    if (!confirmed) return;

    deletePage(page.id);
    navigate(parent ? `/pages/${parent.id}` : "/");
  };

  return (
    <div className="page-detail-page">
      <div className="page-detail__topbar">
        {ancestors.length > 0 ? (
          <div className="page-detail__breadcrumb">
            {ancestors.map((a) => (
              <span key={a.id} className="page-detail__breadcrumb-seg">
                <button type="button" onClick={() => navigate(`/pages/${a.id}`)}>
                  <span>{a.icon}</span>
                  <span>{a.title || "제목 없음"}</span>
                </button>
                <ChevronRight size={12} />
              </span>
            ))}
          </div>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="page-detail__delete-btn"
          onClick={handleDeletePage}
          title="페이지 삭제"
        >
          <Trash2 size={14} />
          <span>삭제</span>
        </button>
      </div>

      {page.cover ? (
        <div className="page-detail__cover">
          <img src={page.cover} alt="" />
          <div className="page-detail__cover-actions">
            <button type="button" onClick={() => coverInputRef.current?.click()}>
              <Camera size={13} />
              변경
            </button>
            <button type="button" onClick={() => updatePage({ cover: null })}>
              <X size={13} />
              삭제
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="page-detail__add-cover"
          onClick={() => coverInputRef.current?.click()}
        >
          <ImagePlus size={14} />
          커버 추가
        </button>
      )}

      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleCoverSelect(e.target.files?.[0])}
      />

      <div className="page-detail__head">
        <div className="page-detail__icon-wrap">
          <button
            type="button"
            className="page-detail__icon"
            onClick={() => setIconPickerOpen((v) => !v)}
          >
            {page.icon || <Smile size={26} />}
          </button>

          {iconPickerOpen && (
            <>
              <div className="page-detail__icon-overlay" onClick={() => setIconPickerOpen(false)} />
              <div className="page-detail__icon-picker">
                {ICON_CHOICES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      updatePage({ icon: emoji });
                      setIconPickerOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <input
          className="page-detail__title"
          value={page.title}
          placeholder="제목 없음"
          onChange={(e) => updatePage({ title: e.target.value })}
        />
      </div>

      <BlockEditor
        key={page.id}
        blocks={page.blocks}
        onChange={(blocks) => updatePage({ blocks })}
        pages={pages}
        onCreateChildPage={() => createPage(page.id)}
        onRenameRowPage={renamePage}
        onDeleteRowPage={deletePage}
      />
    </div>
  );
}
