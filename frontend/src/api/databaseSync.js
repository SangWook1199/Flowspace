import * as databaseApi from "./databases";
import { DEFAULT_DATABASE_TITLE, encodeCellValue } from "./mappers/database";

// 에디터의 데이터베이스(block.database)와 서버의 데이터베이스를 맞춰요.
//
// 서버 API는 열·옵션·행·셀 하나하나를 따로 만들고 고치는 방식이라, 에디터가 통째로 바꾼 객체를
// "서버가 알고 있는 마지막 상태(binding)"와 비교해서 달라진 부분만 API로 보내요.
// binding은 서버 id 기준의 상태 + 에디터 id → 서버 id 표(colMap/rowMap/optMap)예요.
// 새로 만든 열·행·옵션은 에디터가 임시 id를 쓰고, 서버가 만들어 주면 표에 이어 붙여요.
// 중간에 실패해도 성공한 만큼은 binding에 반영돼 있어서, 다시 시도하면 이어서 맞춰요.

const OPTION_TYPES = new Set(["SELECT", "MULTI_SELECT", "STATUS"]);
// 제목 열은 행 페이지의 제목을, 생성 일시 열은 페이지 생성 시각을 그대로 보여줘서 셀 값을 저장하지 않아요.
const NO_CELL_TYPES = new Set(["TITLE", "CREATED_TIME"]);
const MIN_WIDTH = 90;
const MAX_WIDTH = 640;

const cellKey = (rowSid, colSid) => `${rowSid}:${colSid}`;
const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const dbTitle = (title) => (title ?? "").trim().slice(0, 100) || DEFAULT_DATABASE_TITLE;
const clampWidth = (w) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(w)));

const toOption = (dto) => ({
  sid: dto.optionId,
  value: dto.value,
  color: dto.color,
  group: dto.statusGroup ?? null,
});

const toColumn = (dto) => ({
  sid: dto.columnId,
  name: dto.name ?? "",
  type: dto.type,
  width: dto.width ?? null,
  options: [...(dto.options ?? [])].sort((a, b) => a.position - b.position).map(toOption),
});

// 서버가 저장한 셀 값 → 비교용 문자열(에디터 값을 encodeCellValue한 것과 같은 모양)
const normalizeServerCell = (type, raw) => {
  if (type === "CHECKBOX") return raw === "true" ? "true" : "";
  if (raw == null || raw === "[]") return "";
  return raw;
};

// 서버 DatabaseDetailResponse → binding. 에디터 id와 서버 id를 이어주는 표는 비어 있어요.
export function bindingFromDetail(dto) {
  const cols = [...(dto.columns ?? [])].sort((a, b) => a.position - b.position).map(toColumn);
  const typeBySid = new Map(cols.map((c) => [c.sid, c.type]));
  const rowsDto = [...(dto.rows ?? [])].sort((a, b) => a.position - b.position);

  const cells = new Map();
  for (const row of rowsDto) {
    for (const cell of row.cells ?? []) {
      cells.set(cellKey(row.rowId, cell.columnId), normalizeServerCell(typeBySid.get(cell.columnId), cell.value));
    }
  }

  return {
    databaseId: dto.databaseId,
    kind: dto.viewType === "TABLE" ? "TABLE" : "DATABASE",
    title: dto.title,
    cols,
    rows: rowsDto.map((r) => ({ sid: r.rowId, pageId: r.pageId ?? null })),
    cells,
    colMap: new Map(),
    rowMap: new Map(),
    optMap: new Map(),
  };
}

// 서버에서 불러온 데이터베이스: 에디터 id가 서버 id와 같아서 표를 그대로 채워요.
export function bindingFromLoaded(dto) {
  const binding = bindingFromDetail(dto);
  for (const col of binding.cols) {
    binding.colMap.set(col.sid, col.sid);
    for (const opt of col.options) binding.optMap.set(opt.sid, opt.sid);
  }
  for (const row of binding.rows) binding.rowMap.set(row.sid, row.sid);
  return binding;
}

// 에디터에서 새로 만든 데이터베이스를 서버에 만들어요. 서버가 기본 열·행을 같이 만들어서(데이터베이스: 이름·생성 일시·사람 +
// 행 1개, 표: 빈 열 3개 + 행 3개) 에디터의 앞쪽 열·행과 차례로 짝지어 두고, 나머지는 이어지는 맞춤에서 처리해요.
// 첫 행의 페이지가 아직 서버에 만드는 중이면 null을 돌려줘요(만들어진 뒤 다시 시도해요).
export async function createBinding(pageId, database, { resolvePageId }) {
  const kind = database.kind === "TABLE" ? "TABLE" : "DATABASE";

  let seedPageId = null;
  const firstRow = database.rows?.[0];
  if (kind === "DATABASE" && firstRow?.pageId != null) {
    seedPageId = resolvePageId(firstRow.pageId);
    if (!(seedPageId > 0)) return null;
  }

  const created = await databaseApi.createDatabase(pageId, {
    title: dbTitle(database.title),
    viewType: kind,
    seedPageId,
  });
  const binding = bindingFromDetail(await databaseApi.getDatabaseDetail(created.databaseId));

  (database.columns ?? []).forEach((col, i) => {
    if (binding.cols[i]) binding.colMap.set(col.id, binding.cols[i].sid);
  });
  (database.rows ?? []).forEach((row, i) => {
    if (binding.rows[i]) binding.rowMap.set(row.id, binding.rows[i].sid);
  });

  return { binding, blockId: created.blockId };
}

async function syncOptions(binding, databaseId, col, editorOptions) {
  const used = new Set();
  let changed = false;

  for (const eo of editorOptions) {
    const value = (eo.value ?? "").slice(0, 100);
    const color = String(eo.color || "gray").toUpperCase();
    const group = col.type === "STATUS" ? (eo.group ?? "TODO") : null;

    let opt = col.options.find((o) => o.sid === binding.optMap.get(eo.id));
    if (!opt) {
      // 새로 만들었거나 유형을 바꾼 열은 서버가 기본 옵션을 채워 둘 수 있어서, 같은 값이면 그걸 써요.
      const mapped = new Set(binding.optMap.values());
      opt = col.options.find((o) => !mapped.has(o.sid) && !used.has(o.sid) && o.value === value);
      if (opt) binding.optMap.set(eo.id, opt.sid);
    }

    if (!opt) {
      const res = await databaseApi.createOption(databaseId, col.sid, { value, color, statusGroup: group });
      opt = toOption(res);
      col.options.push(opt);
      binding.optMap.set(eo.id, opt.sid);
      changed = true;
    } else if (opt.value !== value || opt.color !== color || (opt.group ?? null) !== group) {
      const res = await databaseApi.updateOption(databaseId, col.sid, opt.sid, { value, color, statusGroup: group });
      Object.assign(opt, toOption(res));
    }

    used.add(opt.sid);
  }

  for (const opt of [...col.options]) {
    if (used.has(opt.sid)) continue;
    await databaseApi.deleteOption(databaseId, col.sid, opt.sid);
    col.options = col.options.filter((o) => o.sid !== opt.sid);
    changed = true;
  }

  const desired = editorOptions.map((eo) => binding.optMap.get(eo.id)).filter((sid) => sid != null);
  if (desired.length > 0 && (changed || !sameList(desired, col.options.map((o) => o.sid)))) {
    await databaseApi.reorderOptions(
      databaseId,
      col.sid,
      desired.map((optionId, position) => ({ optionId, position })),
    );
    col.options = desired.map((sid) => col.options.find((o) => o.sid === sid));
  }
}

// 에디터의 데이터베이스를 binding(서버가 아는 상태)과 비교해서 달라진 부분만 서버에 보내요.
// 반환값 deferred: 아직 서버에 만드는 중인 행 페이지 때문에 못 만든 행이 있어요(만들어진 뒤 다시 맞춰요).
export async function syncDatabase(binding, database, { resolvePageId }) {
  const databaseId = binding.databaseId;
  const isTable = binding.kind === "TABLE";
  let deferred = false;

  // 제목 (표에는 제목이 없어요)
  if (!isTable) {
    const title = dbTitle(database.title);
    if (title !== binding.title) {
      await databaseApi.updateDatabaseTitle(databaseId, title);
      binding.title = title;
    }
  }

  /* ---------- 열 ---------- */

  const editorCols = database.columns ?? [];
  const keptCols = new Set();
  let colsChanged = false;

  for (const ec of editorCols) {
    const type = isTable ? "TEXT" : (ec.type ?? "TEXT");
    const name = (ec.name ?? "").slice(0, 50);

    let col = binding.cols.find((c) => c.sid === binding.colMap.get(ec.id));
    if (!col) {
      const res = await databaseApi.createColumn(databaseId, { name, type });
      col = toColumn(res);
      binding.cols.push(col);
      binding.colMap.set(ec.id, col.sid);
      for (const row of binding.rows) binding.cells.set(cellKey(row.sid, col.sid), ""); // 서버가 빈 셀을 만들어 둬요
      colsChanged = true;
    } else if (col.name !== name || col.type !== type) {
      const res = await databaseApi.updateColumn(databaseId, col.sid, { name, type });
      Object.assign(col, toColumn(res));
    }
    keptCols.add(col.sid);

    if (ec.width) {
      const width = clampWidth(ec.width);
      if (width !== col.width) {
        const res = await databaseApi.updateColumnWidth(databaseId, col.sid, width);
        col.width = res.width ?? width;
      }
    }
  }

  for (const col of [...binding.cols]) {
    if (keptCols.has(col.sid)) continue;
    await databaseApi.deleteColumn(databaseId, col.sid);
    binding.cols = binding.cols.filter((c) => c.sid !== col.sid);
    colsChanged = true;
  }

  const desiredCols = editorCols.map((ec) => binding.colMap.get(ec.id));
  if (desiredCols.length > 0 && (colsChanged || !sameList(desiredCols, binding.cols.map((c) => c.sid)))) {
    await databaseApi.reorderColumns(
      databaseId,
      desiredCols.map((columnId, position) => ({ columnId, position })),
    );
    binding.cols = desiredCols.map((sid) => binding.cols.find((c) => c.sid === sid));
  }

  /* ---------- 옵션 ---------- */

  if (!isTable) {
    for (const ec of editorCols) {
      const col = binding.cols.find((c) => c.sid === binding.colMap.get(ec.id));
      if (col && OPTION_TYPES.has(col.type)) await syncOptions(binding, databaseId, col, ec.options ?? []);
    }
  }

  /* ---------- 행 ---------- */

  const editorRows = database.rows ?? [];
  const keptRows = new Set();
  let rowsChanged = false;

  for (const er of editorRows) {
    let row = binding.rows.find((r) => r.sid === binding.rowMap.get(er.id));

    if (!row) {
      let pageId = null;
      if (!isTable && er.pageId != null) {
        pageId = resolvePageId(er.pageId);
        if (!(pageId > 0)) {
          deferred = true; // 행 페이지가 서버에 만들어질 때까지 기다려요.
          continue;
        }
      }

      const res = await databaseApi.createRow(databaseId, pageId);
      row = { sid: res.rowId, pageId: res.pageId ?? null };
      binding.rows.push(row);
      binding.rowMap.set(er.id, row.sid);
      for (const col of binding.cols) binding.cells.set(cellKey(row.sid, col.sid), "");
      rowsChanged = true;
    }
    keptRows.add(row.sid);
  }

  for (const row of [...binding.rows]) {
    if (keptRows.has(row.sid)) continue;
    await databaseApi.deleteRow(databaseId, row.sid);
    binding.rows = binding.rows.filter((r) => r.sid !== row.sid);
    rowsChanged = true;
  }

  const desiredRows = editorRows.map((er) => binding.rowMap.get(er.id)).filter((sid) => keptRows.has(sid));
  if (desiredRows.length > 0 && (rowsChanged || !sameList(desiredRows, binding.rows.map((r) => r.sid)))) {
    await databaseApi.reorderRows(
      databaseId,
      desiredRows.map((rowId, position) => ({ rowId, position })),
    );
    binding.rows = desiredRows.map((sid) => binding.rows.find((r) => r.sid === sid));
  }

  /* ---------- 셀 ---------- */

  const editorCells = new Map((database.cells ?? []).map((c) => [`${c.rowId}:${c.columnId}`, c.value]));

  for (const er of editorRows) {
    const rowSid = binding.rowMap.get(er.id);
    if (!keptRows.has(rowSid)) continue;

    for (const ec of editorCols) {
      const col = binding.cols.find((c) => c.sid === binding.colMap.get(ec.id));
      if (!col || NO_CELL_TYPES.has(col.type)) continue;

      const want = encodeCellValue(col.type, editorCells.get(`${er.id}:${ec.id}`));
      const key = cellKey(rowSid, col.sid);
      if (want === (binding.cells.get(key) ?? "")) continue;

      await databaseApi.updateCell(databaseId, { rowId: rowSid, columnId: col.sid, value: want === "" ? null : want });
      binding.cells.set(key, want);
    }
  }

  return { deferred };
}
