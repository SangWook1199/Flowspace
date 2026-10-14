// Ctrl/⌘ 단축키에서 "어느 글쇠를 눌렀는지"를 알려줘요.
// 한글 자판 상태에서는 e.key가 영문자가 아니라 한글("ㅠ" 등)로 와서 Ctrl+B 같은 단축키가 안 먹어요.
// 그래서 e.key가 영문자가 아닐 때만 물리 글쇠 위치(e.code: KeyB → "b")를 써요.
// (Dvorak 같은 다른 영문 배열에서는 e.key가 영문자라 그대로 e.key를 따라요.)
export function shortcutKey(e) {
  const key = (e.key ?? "").toLowerCase();
  if (/^[a-z]$/.test(key)) return key;

  const match = /^Key([A-Z])$/.exec(e.code ?? "");
  return match ? match[1].toLowerCase() : key;
}
