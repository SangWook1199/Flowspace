import { useEffect, useMemo, useState } from "react";
import { lookupUserByEmail } from "../api/users";

// 이메일 입력 중에 보여줄 추천이에요.
//  1) "@" 앞까지만 쓰면 흔한 메일 주소(gmail.com 등)를 붙여서 추천하고, "@g"처럼 쓰는 중이면 그에 맞는 것만 추려요.
//  2) 이메일을 끝까지 쓰면 그 이메일을 가진 가입자가 있는지 서버에 물어서(입력이 멈춘 뒤) 사용자 카드로 보여줘요.
// 키보드(↑↓ Enter Esc)와 포커스 처리까지 이 훅이 맡고, 입력칸은 부모가 그대로 가지고 있어요.
export const EMAIL_DOMAINS = ["gmail.com", "naver.com", "daum.net", "kakao.com", "outlook.com"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOOKUP_DELAY_MS = 250;

export function useEmailSuggest(value, { workspaceId = null, enabled = true } = {}) {
  const text = value.trim();

  const [found, setFound] = useState({ email: "", user: null });
  const [focused, setFocused] = useState(false);
  const [nav, setNav] = useState({ text: "", index: -1 });
  const [dismissedText, setDismissedText] = useState("");

  const domainOptions = useMemo(() => {
    if (!text || /\s/.test(text)) return [];

    const at = text.indexOf("@");
    if (at === -1) return EMAIL_DOMAINS.map((domain) => `${text}@${domain}`);

    const local = text.slice(0, at);
    const typed = text.slice(at + 1).toLowerCase();
    if (!local) return [];

    return EMAIL_DOMAINS.filter((domain) => domain.startsWith(typed) && domain !== typed).map(
      (domain) => `${local}@${domain}`,
    );
  }, [text]);

  // 이메일을 끝까지 쓴 경우에만 가입자를 찾아봐요.
  const lookupTarget = enabled && EMAIL_PATTERN.test(text) ? text : "";

  useEffect(() => {
    if (!lookupTarget) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      let user = null;
      try {
        user = await lookupUserByEmail(lookupTarget, workspaceId);
      } catch {
        // 못 찾아도(네트워크 오류 등) 입력 자체는 계속할 수 있어요.
      }
      if (!cancelled) setFound({ email: lookupTarget, user });
    }, LOOKUP_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lookupTarget, workspaceId]);

  const user = lookupTarget && found.email === lookupTarget ? found.user : null;

  const items = useMemo(
    () => [
      ...(user ? [{ kind: "user", key: `user-${user.id}`, user }] : []),
      ...domainOptions.map((email) => ({ kind: "domain", key: email, email })),
    ],
    [user, domainOptions],
  );

  const visible = enabled && focused && text !== "" && dismissedText !== text && items.length > 0;
  const activeIndex = nav.text === text ? nav.index : -1;

  // 키 입력을 처리했으면 true. pick(item)은 부모가 정해요(추천을 고르면 무슨 일이 일어날지는 화면마다 달라요).
  const onKeyDown = (e, pick) => {
    if (!visible) return false;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = activeIndex === -1 ? (step === 1 ? 0 : items.length - 1) : (activeIndex + step + items.length) % items.length;
      setNav({ text, index: next });
      return true;
    }

    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(items[activeIndex]);
      return true;
    }

    if (e.key === "Escape") {
      // 설정 모달처럼 Esc로 닫히는 화면 안에서도 추천 목록만 먼저 닫혀요.
      e.nativeEvent.stopPropagation();
      setDismissedText(text);
      return true;
    }

    return false;
  };

  return {
    visible,
    items,
    activeIndex,
    onKeyDown,
    setActiveIndex: (index) => setNav({ text, index }),
    inputProps: {
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
}
