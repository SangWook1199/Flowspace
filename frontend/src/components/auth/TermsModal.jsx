import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { CONTACT_EMAIL, EFFECTIVE_DATE, LEGAL_DOCS, OPERATOR_NAME } from "./legalText";

// 회원가입 2단계의 "이용약관 / 개인정보 처리방침" 보기 창이에요.
//   initialTab: "terms" | "privacy", onClose(): 닫기, onAgree(): "동의하고 닫기"(체크박스를 체크해요)
export default function TermsModal({ initialTab = "terms", onClose, onAgree }) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const [tab, setTab] = useState(initialTab);
  const closeRef = useRef(null);
  const bodyRef = useRef(null);

  const doc = LEGAL_DOCS.find((item) => item.id === tab) ?? LEGAL_DOCS[0];

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // 탭을 바꾸면 본문을 맨 위로 올려요.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [tab]);

  return createPortal(
    <div
      className="social-link-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="terms-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="terms-modal__head">
          <h2 id={titleId}>{doc.title}</h2>
          <button ref={closeRef} type="button" className="terms-modal__close" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </header>

        <div className="terms-modal__tabs" role="tablist">
          {LEGAL_DOCS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === tab}
              className={item.id === tab ? "active" : ""}
              onClick={() => setTab(item.id)}
            >
              {item.title}
            </button>
          ))}
        </div>

        <div className="terms-modal__body" ref={bodyRef} tabIndex={0}>
          <p className="terms-modal__intro">{doc.intro}</p>

          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h3>{section.heading}</h3>
              {section.paragraphs?.map((text) => (
                <p key={text}>{text}</p>
              ))}
              {section.items && (
                <ul>
                  {section.items.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <footer className="terms-modal__meta">
            {OPERATOR_NAME && <p>운영자: {OPERATOR_NAME}</p>}
            {CONTACT_EMAIL && <p>문의: {CONTACT_EMAIL}</p>}
            <p>시행일: {EFFECTIVE_DATE}</p>
          </footer>
        </div>

        <div className="terms-modal__actions">
          <button type="button" className="social-link-cancel" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="social-link-submit" onClick={onAgree}>
            동의하고 닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
