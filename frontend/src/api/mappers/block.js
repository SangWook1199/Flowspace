import { fileUrl } from "../../utils/fileUrl";

// 에디터 블록 ↔ 서버 블록 변환기.
//
// 서버 블록은 type / content(JSON 문자열) / taskId·eventId·sprintId / 부모 블록(parentBlockId) / position 으로 이뤄져 있어요.
// 에디터 블록은 서식 HTML(content)·들여쓰기(indent)·색·체크 여부 같은 필드가 더 많아서,
//   - 들여쓰기는 부모 블록 관계(parentClientId)로,
//   - 나머지 필드는 content JSON 한 덩어리("봉투")로
// 담아서 보내요. 봉투 모양: { text, richText, color, textColor, checked, collapsed, calloutIcon, pageId, language, image }
// pageId는 서버가 페이지를 복제할 때 복제본 페이지로 바꿔주는 필드라 이름을 바꾸면 안 돼요.

const TEXT_TYPES = new Set(["TEXT", "H1", "H2", "H3", "TODO", "BULLET", "NUMBERED", "QUOTE", "TOGGLE", "CALLOUT"]);
const ENVELOPE_FIELDS = ["richText", "color", "textColor", "checked", "collapsed", "calloutIcon", "language"];

const parseEnvelope = (content) => {
  if (!content || !String(content).trim()) return {};
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string") return { text: parsed, richText: false };
  } catch {
    // JSON이 아닌 옛 값이면 글자 그대로 보여줘요.
    return { text: String(content), richText: false };
  }
  return {};
};

const isLocalUrl = (url) => /^(data:|blob:)/i.test(url ?? "");

// ---------- 서버 → 에디터 ----------

// 서버 댓글(답글은 부모 바로 뒤에 이어서) → 에디터의 평평한 댓글 목록
export function toEditorComments(comments) {
  const out = [];
  const push = (c) => {
    out.push({
      id: c.commentId,
      userId: c.userId,
      author: c.userName ?? "알 수 없음",
      text: c.content,
      createdAt: c.createdAt,
      ...(c.updatedAt && c.updatedAt !== c.createdAt ? { editedAt: c.updatedAt } : {}),
    });
    for (const reply of c.replies ?? []) push(reply);
  };
  for (const c of comments ?? []) push(c);
  return out;
}

// 서버 블록 목록을 에디터의 평평한 배열(indent 방식)로 바꿔요.
// options.knownPageIds: 지금 존재하는 페이지 id 집합(없어진 페이지를 가리키는 링크는 풀어요)
// options.databases: databaseId → 에디터 database 객체
export function toEditorBlocks(items, { knownPageIds, databases } = {}) {
  const sorted = [...items].sort((a, b) => Number(a.position) - Number(b.position));
  const ids = new Set(sorted.map((b) => b.blockId));

  const children = new Map();
  for (const item of sorted) {
    const parent = item.parentBlockId != null && ids.has(item.parentBlockId) ? item.parentBlockId : null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(item);
  }

  const out = [];
  const visit = (item, depth) => {
    out.push(toEditorBlock(item, depth, { knownPageIds, databases }));
    for (const child of children.get(item.blockId) ?? []) visit(child, depth + 1);
  };
  for (const root of children.get(null) ?? []) visit(root, 0);

  return out;
}

function toEditorBlock(item, depth, { knownPageIds, databases }) {
  const env = parseEnvelope(item.content);
  const block = { id: item.blockId, type: item.type, ...(depth > 0 ? { indent: depth } : {}) };

  if (TEXT_TYPES.has(item.type)) {
    block.content = typeof env.text === "string" ? env.text : "";
    block.richText = env.richText ?? false;
    for (const key of ENVELOPE_FIELDS) {
      if (key !== "richText" && key !== "language" && env[key] != null) block[key] = env[key];
    }
    if (item.type === "TEXT" && env.pageId != null && (!knownPageIds || knownPageIds.has(env.pageId))) {
      block.pageId = env.pageId;
    }
  } else if (item.type === "CODE") {
    block.content = typeof env.text === "string" ? env.text : "";
    if (env.language) block.language = env.language;
  } else if (item.type === "IMAGE" || item.type === "FILE") {
    if (item.imageUrl) block.image = { ...(env.image ?? {}), url: fileUrl(item.imageUrl) };
    else block.image = env.image?.url ? env.image : null;
  } else if (item.type === "TASK") {
    block.taskId = item.taskId ?? null;
  } else if (item.type === "EVENT") {
    block.eventId = item.eventId ?? null;
  } else if (item.type === "SPRINT") {
    block.sprintId = item.sprintId ?? null;
  } else if (item.type === "DATABASE") {
    block.database = databases?.get(item.databaseId) ?? null;
  }

  const comments = toEditorComments(item.comments);
  if (comments.length > 0) block.comments = comments;

  return block;
}

// 서버가 이미지 파일을 가지고 있는 블록들: 블록 id → 에디터가 보여주는 url (다시 올리지 않게 기억해요)
export const collectServerImages = (items) =>
  new Map(items.filter((b) => b.imageUrl).map((b) => [String(b.blockId), fileUrl(b.imageUrl)]));

// ---------- 에디터 → 서버 ----------

// 에디터 블록이 서버에 저장할 수 있는 상태인지. 아직 연결이 안 된 TASK/EVENT/SPRINT(고르기 전)와
// 서버에 안 만들어진 데이터베이스는 이번 동기화에서 빼요(서버가 연결 없는 블록은 받지 않아요).
// 데이터베이스 블록은 별도 API(databaseSync)로 만들어져야 서버 블록 id가 생겨요.
const isSavable = (block, ctx) => {
  if (block.type === "TASK") return block.taskId != null;
  if (block.type === "EVENT") return block.eventId != null;
  if (block.type === "SPRINT") return block.sprintId != null;
  if (block.type === "DATABASE") return ctx.dbBlockIds.has(ctx.idMap.get(String(block.id)));
  return true;
};

const buildEnvelope = (block, ctx) => {
  const env = {};

  if (TEXT_TYPES.has(block.type) || block.type === "CODE") {
    env.text = typeof block.content === "string" ? block.content : "";
  }

  if (TEXT_TYPES.has(block.type)) {
    for (const key of ENVELOPE_FIELDS) {
      if (block[key] != null && block[key] !== false && block[key] !== "") env[key] = block[key];
    }
    if (block.type === "TEXT" && block.pageId != null) {
      const pageId = ctx.resolvePageId(block.pageId);
      // 아직 서버에 만드는 중인 임시 페이지(음수 id)는 이번엔 빼고, 만들어지면 다시 저장해요.
      if (pageId > 0) env.pageId = pageId;
    }
  } else if (block.type === "CODE") {
    if (block.language) env.language = block.language;
  } else if (block.type === "IMAGE" || block.type === "FILE") {
    const image = block.image;
    if (image) {
      const { url, ...meta } = image;
      env.image = { ...meta };
      // 외부 주소 이미지는 주소를 그대로 저장하고, 올린 파일(data:/blob:/서버 파일)은 파일로 따로 올려요.
      if (url && !isLocalUrl(url) && url !== ctx.synced.get(String(block.id))) env.image.url = url;
    }
  }

  return env;
};

// 에디터 블록 배열 → PUT /pages/{id}/blocks 요청의 blocks.
// ctx: { idMap(clientId → 서버 blockId), dbBlockIds(서버 데이터베이스 블록 id 집합), synced, resolvePageId }
export function toSyncItems(blocks, ctx) {
  const items = [];
  // stack[d] = 들여쓰기 d 단의 가장 최근 "저장되는" 블록의 clientId. 빠진 블록의 자식은 그 블록의 부모를 따라가요.
  const stack = [];

  for (const block of blocks) {
    const depth = block.indent || 0;
    stack.length = Math.min(stack.length, depth);

    let parentClientId = null;
    for (let d = depth - 1; d >= 0; d -= 1) {
      if (stack[d]) {
        parentClientId = stack[d];
        break;
      }
    }

    if (!isSavable(block, ctx)) {
      stack[depth] = parentClientId;
      continue;
    }

    const clientId = String(block.id);
    stack[depth] = clientId;

    let blockId = ctx.idMap.get(clientId) ?? null;
    // 데이터베이스였던 블록이 다른 타입이 되면 서버는 같은 블록의 타입 변경을 안 받아서, 새 블록으로 만들어요.
    if (blockId != null && ctx.dbBlockIds.has(blockId) && block.type !== "DATABASE") blockId = null;

    const item = { clientId, blockId, parentClientId, type: block.type };

    if (block.type === "DATABASE") {
      // 데이터베이스는 별도 API로 관리되고, 동기화에서는 위치·부모만 바뀌어요.
    } else {
      item.content = JSON.stringify(buildEnvelope(block, ctx));
      if (block.type === "TASK") item.taskId = block.taskId;
      if (block.type === "EVENT") item.eventId = block.eventId;
      if (block.type === "SPRINT") item.sprintId = block.sprintId;
    }

    items.push(item);
  }

  return items;
}

// 변경 여부 비교용 키: 서버가 정해주는 blockId는 빼고 비교해요.
export const syncKey = (items) => JSON.stringify(items.map(({ blockId, ...rest }) => rest)); // eslint-disable-line no-unused-vars
