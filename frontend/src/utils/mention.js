// 댓글의 @멘션 형식이에요.
// 서버에는 멘션을 "@[이름](사용자id)" 모양으로 글 안에 그대로 저장해요(예: "@[민수](12) 확인 부탁해요").
// 별도 테이블 없이도 서버가 글에서 멘션된 사람을 읽어 알림을 보내고, 화면은 이 모양을 강조 표시로 바꿔 보여줘요.
// 입력창에는 사람이 읽기 좋게 "@이름"만 보이고, 저장할 때만 위 모양으로 바꿔요(decode ↔ encode).
const TOKEN = /@\[([^\]\n]+)\]\((\d+)\)/g;

// 토큰 안에 들어갈 수 없는 글자(] 와 줄바꿈)를 공백으로 바꿔요.
export const safeMentionName = (name) => String(name ?? "").replace(/[\]\n]/g, " ").trim();

// 저장된 글 → { text: "@이름"으로 풀어쓴 글, mentions: [{ id, name }] (글에 나온 순서) }
export function decodeMentions(value) {
  const mentions = [];
  const text = String(value ?? "").replace(TOKEN, (_, name, id) => {
    mentions.push({ id: Number(id), name });
    return `@${name}`;
  });
  return { text, mentions };
}

// 입력창의 글 + 고른 멘션들 → 저장할 글. 멘션 목록에 있는 "@이름"만 토큰으로 바꾸고,
// 사용자가 직접 친 "@이름"은 그냥 글자로 둬요(멘션으로 고르지 않았으니 알림도 가지 않아요).
// 이름이 긴 것부터 바꿔서 "@민수연"을 "@민수"로 잘못 자르지 않게 해요.
export function encodeMentions(text, mentions) {
  let out = text;
  const ordered = [...mentions].sort((a, b) => b.name.length - a.name.length);

  for (const mention of ordered) {
    const needle = `@${mention.name}`;
    const at = out.indexOf(needle);
    if (at === -1) continue;
    out = `${out.slice(0, at)}@[${mention.name}](${mention.id})${out.slice(at + needle.length)}`;
  }

  return out;
}

// 보여줄 때: 글을 [{ type: "text", value } | { type: "mention", id, name }] 조각으로 나눠요.
export function splitMentions(value) {
  const parts = [];
  const source = String(value ?? "");
  let last = 0;

  for (const match of source.matchAll(TOKEN)) {
    if (match.index > last) parts.push({ type: "text", value: source.slice(last, match.index) });
    parts.push({ type: "mention", id: Number(match[2]), name: match[1] });
    last = match.index + match[0].length;
  }

  if (last < source.length) parts.push({ type: "text", value: source.slice(last) });
  return parts;
}

// 멘션을 "@이름"으로 풀어 쓴 한 줄 글(미리보기·검색용)
export const mentionsToPlain = (value) => decodeMentions(value).text;

// 입력 중인 "@..." 자리를 찾아요: 커서 바로 앞에 "@질의어"가 있고, @ 앞이 글 처음이거나 공백이면 { start, query }.
export function findMentionTrigger(text, caret) {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null;

  const query = before.slice(at + 1);
  if (/\s/.test(query)) return null;

  return { start: at, query };
}
