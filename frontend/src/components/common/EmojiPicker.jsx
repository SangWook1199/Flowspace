import { useState } from "react";

import { ICON_GROUPS, filterIconGroups } from "../../utils/emojiGroups";
import "../../styles/page-detail.css";

// 이모지 선택 팝업 — 검색창 + 카테고리별로 묶인 스크롤 목록이에요(페이지 아이콘, 워크스페이스 아이콘 공용).
// 부모가 position:relative인 요소 안에 두면 그 바로 아래에 떠요. 바깥을 누르면 onClose가 불려요.
// 검색 중엔 일치하는 이모지가 있는 카테고리만 남아요.
export default function EmojiPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const groups = filterIconGroups(ICON_GROUPS, query);

  return (
    <>
      <div className="page-detail__icon-overlay" onClick={onClose} />
      <div className="page-detail__icon-picker">
        <input
          type="text"
          className="page-detail__icon-search"
          placeholder="아이콘 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          autoFocus
        />

        <div className="page-detail__icon-picker-groups">
          {groups.length === 0 ? (
            <p className="page-detail__icon-empty">검색 결과가 없어요.</p>
          ) : (
            groups.map((group) => (
              <div key={group.title} className="page-detail__icon-picker-section">
                <span className="page-detail__icon-picker-label">{group.title}</span>
                <div className="page-detail__icon-picker-grid">
                  {group.icons.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      title={item.keywords?.[0]}
                      onClick={() => onSelect(item.emoji)}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
