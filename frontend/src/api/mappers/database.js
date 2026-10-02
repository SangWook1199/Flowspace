// 서버 데이터베이스 상세(DatabaseDetailResponse) → 블록 에디터의 block.database 모양.
// 에디터는 옵션 색을 소문자 CSS 이름("blue")으로, 서버는 대문자 enum("BLUE")으로 써요.
// 셀 값은 서버에선 문자열 하나라서, 여러 값(다중 선택·사람)은 JSON 배열 문자열로 주고받아요.
const ARRAY_TYPES = new Set(["MULTI_SELECT", "PERSON"]);

// 서버가 새 데이터베이스·표에 붙이는 기본 제목. 에디터에서는 "제목 없음" 대신 빈 제목(안내 문구)으로 보여줘요.
export const DEFAULT_DATABASE_TITLE = "제목 없음";

export const decodeCellValue = (type, raw) => {
  if (ARRAY_TYPES.has(type)) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (type === "CHECKBOX") return raw === "true";
  return raw ?? "";
};

// 에디터 셀 값 → 서버에 저장하는 문자열. 비어 있는 값은 항상 ""예요(서버에는 null로 보내요).
export const encodeCellValue = (type, value) => {
  if (ARRAY_TYPES.has(type)) return Array.isArray(value) && value.length > 0 ? JSON.stringify(value) : "";
  if (type === "CHECKBOX") return value === true || value === "true" ? "true" : "";
  return value == null ? "" : String(value);
};

export const toEditorDatabase = (dto) => {
  const isTable = dto.viewType === "TABLE";
  const columns = [...(dto.columns ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((col) => ({
      id: col.columnId,
      name: col.name ?? "",
      ...(isTable ? {} : { type: col.type }),
      ...(col.width ? { width: col.width } : {}),
      ...(!isTable && col.options?.length
        ? {
            options: [...col.options]
              .sort((a, b) => a.position - b.position)
              .map((opt) => ({
                id: opt.optionId,
                value: opt.value,
                color: String(opt.color ?? "GRAY").toLowerCase(),
                ...(opt.statusGroup ? { group: opt.statusGroup } : {}),
              })),
          }
        : {}),
    }));

  const typeByColumn = new Map((dto.columns ?? []).map((c) => [c.columnId, c.type]));
  const rowsSorted = [...(dto.rows ?? [])].sort((a, b) => a.position - b.position);

  return {
    kind: isTable ? "TABLE" : "DATABASE",
    ...(isTable ? {} : { title: dto.title === DEFAULT_DATABASE_TITLE ? "" : (dto.title ?? "") }),
    columns,
    rows: rowsSorted.map((row) => ({ id: row.rowId, ...(row.pageId != null ? { pageId: row.pageId } : {}) })),
    cells: rowsSorted.flatMap((row) =>
      (row.cells ?? []).map((cell) => ({
        rowId: row.rowId,
        columnId: cell.columnId,
        value: decodeCellValue(typeByColumn.get(cell.columnId), cell.value),
      })),
    ),
  };
};
