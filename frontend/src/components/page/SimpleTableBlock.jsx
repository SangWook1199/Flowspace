import { useRef } from "react";
import { Plus, Trash2 } from "lucide-react";

import ColumnResizeHandle from "./ColumnResizeHandle";

const DEFAULT_COLUMN_WIDTH = 200;

// 노션 기본 Table 블록과 같은 수준의 "진짜 단순한 표"예요. DatabaseBlock과
// 달리 컬럼에 타입(텍스트/숫자/날짜/체크박스/선택)이 아예 없고, 제목도
// 없고, 모든 칸은 그냥 자유 텍스트예요. "표는 단조로워도 된다"는 방향에
// 맞춰 일부러 기능을 더 안 붙였어요 — 속성·필터·뷰가 필요하면 "데이터베이스"
// 블록을 쓰면 되니까요. block.database.kind === "TABLE"일 때만 이 컴포넌트가
// 쓰이고, 실제 저장되는 block.type은 여전히 'DATABASE'예요.
export default function SimpleTableBlock({ table, onChange }) {
  const { columns, rows, cells } = table;

  const nextColumnId = useRef(Math.max(0, ...columns.map((c) => c.id)) + 1);
  const nextRowId = useRef(Math.max(0, ...rows.map((r) => r.id)) + 1);

  const cellValue = (rowId, columnId) =>
    cells.find((c) => c.rowId === rowId && c.columnId === columnId)?.value ?? "";

  const setCellValue = (rowId, columnId, value) => {
    const exists = cells.some((c) => c.rowId === rowId && c.columnId === columnId);
    const nextCells = exists
      ? cells.map((c) => (c.rowId === rowId && c.columnId === columnId ? { ...c, value } : c))
      : [...cells, { rowId, columnId, value }];
    onChange({ ...table, cells: nextCells });
  };

  const renameColumn = (columnId, name) => {
    onChange({ ...table, columns: columns.map((c) => (c.id === columnId ? { ...c, name } : c)) });
  };

  const resizeColumn = (columnId, width) => {
    onChange({ ...table, columns: columns.map((c) => (c.id === columnId ? { ...c, width } : c)) });
  };

  const addColumn = () => {
    const id = nextColumnId.current++;
    onChange({ ...table, columns: [...columns, { id, name: "" }] });
  };

  const deleteColumn = (columnId) => {
    if (columns.length <= 1) return;
    onChange({
      ...table,
      columns: columns.filter((c) => c.id !== columnId),
      cells: cells.filter((c) => c.columnId !== columnId),
    });
  };

  const addRow = () => {
    const id = nextRowId.current++;
    onChange({ ...table, rows: [...rows, { id }] });
  };

  const deleteRow = (rowId) => {
    if (rows.length <= 1) return;
    onChange({
      ...table,
      rows: rows.filter((r) => r.id !== rowId),
      cells: cells.filter((c) => c.rowId !== rowId),
    });
  };

  return (
    <div className="simple-table-block">
      <div className="db-block-wrap">
        <div className="db-table-scroll">
        <table className="db-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} style={{ width: col.width || DEFAULT_COLUMN_WIDTH }}>
                  <div className="db-table__head">
                    <input
                      className="db-table__head-input"
                      value={col.name}
                      placeholder="열"
                      maxLength={100}
                      onChange={(e) => renameColumn(col.id, e.target.value)}
                    />

                    {columns.length > 1 && (
                      <button
                        type="button"
                        className="db-table__head-delete"
                        onClick={() => deleteColumn(col.id)}
                        title="열 삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  <ColumnResizeHandle
                    width={col.width || DEFAULT_COLUMN_WIDTH}
                    onResize={(w) => resizeColumn(col.id, w)}
                  />
                </th>
              ))}

              <th className="db-table__add-col">
                <button type="button" onClick={addColumn} title="열 추가">
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="db-row">
                {columns.map((col) => (
                  <td key={col.id}>
                    <input
                      className="db-cell-input"
                      value={cellValue(row.id, col.id)}
                      onChange={(e) => setCellValue(row.id, col.id, e.target.value)}
                    />
                    {/* 헤더에만 있던 리사이즈 핸들을 각 행의 셀에도 붙여서, 표 중간
                        행에서 드래그해도 너비가 바뀌게 했어요. */}
                    <ColumnResizeHandle
                      width={col.width || DEFAULT_COLUMN_WIDTH}
                      onResize={(w) => resizeColumn(col.id, w)}
                    />
                  </td>
                ))}

                <td className="db-table__row-delete-cell">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className="db-table__row-delete"
                      onClick={() => deleteRow(row.id)}
                      title="행 삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <button type="button" className="db-add-row" onClick={addRow}>
          <Plus size={14} />
          <span>행 추가</span>
        </button>
      </div>
    </div>
  );
}
