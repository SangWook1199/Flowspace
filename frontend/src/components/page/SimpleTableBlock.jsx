import { useRef, useState } from "react";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";

import ColumnResizeHandle from "./ColumnResizeHandle";
import { cellListHandlers } from "./lib/cellList";
import PopoverPortal from "./PopoverPortal";
import useDialog from "../../context/useDialog";

// 기존 200px의 3/4로 줄였어요.
const DEFAULT_COLUMN_WIDTH = 150;

// 노션 기본 Table 블록과 같은 수준의 "진짜 단순한 표"예요. DatabaseBlock과
// 달리 컬럼에 타입(텍스트/숫자/날짜/체크박스/선택)이 아예 없고, 제목도
// 없고, 모든 칸은 그냥 자유 텍스트예요. "표는 단조로워도 된다"는 방향에
// 맞춰 일부러 기능을 더 안 붙였어요 — 속성·필터·뷰가 필요하면 "데이터베이스"
// 블록을 쓰면 되니까요. block.database.kind === "TABLE"일 때만 이 컴포넌트가
// 쓰이고, 실제 저장되는 block.type은 여전히 'DATABASE'예요.
export default function SimpleTableBlock({ table, onChange }) {
  const { confirm } = useDialog();
  const { columns, rows, cells } = table;

  const nextColumnId = useRef(Math.max(0, ...columns.map((c) => c.id)) + 1);
  const nextRowId = useRef(Math.max(0, ...rows.map((r) => r.id)) + 1);

  // 행 왼쪽의 ⋯ — DatabaseBlock과 같은 자리·같은 이유예요(block-menu와
  // 통일: 지금은 삭제만, 나중에 이동을 추가하기 쉽게).
  const [rowMenuFor, setRowMenuFor] = useState(null); // rowId
  const [rowMenuAnchor, setRowMenuAnchor] = useState(null);
  // 열 헤더의 ⋯ — DatabaseBlock과 같은 이유로, 예전엔 항상 있던 삭제(🗑)
  // 버튼을 호버 전용 더보기 메뉴로 옮겼어요.
  const [colMenuFor, setColMenuFor] = useState(null); // columnId
  const [colMenuAnchor, setColMenuAnchor] = useState(null);

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

  const hasData = (c) => (Array.isArray(c.value) ? c.value.length > 0 : c.value != null && c.value !== "" && c.value !== false);

  const deleteColumn = async (columnId) => {
    if (columns.length <= 1) return;
    // 값이 들어 있는 열만 한 번 물어봐요(빈 열은 바로 지워요).
    if (cells.some((c) => c.columnId === columnId && hasData(c))) {
      const ok = await confirm({ title: "열 삭제", message: "이 열을 삭제할까요?\n열에 입력된 값도 모두 사라져요.", confirmLabel: "삭제", danger: true });
      if (!ok) return;
    }
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

  const deleteRow = async (rowId) => {
    if (rows.length <= 1) return;
    if (cells.some((c) => c.rowId === rowId && hasData(c))) {
      const ok = await confirm({ title: "행 삭제", message: "이 행을 삭제할까요?\n행에 입력된 값도 모두 사라져요.", confirmLabel: "삭제", danger: true });
      if (!ok) return;
    }
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

                    <div className="db-table__head-more-wrap">
                      <button
                        type="button"
                        className={`db-table__head-more${colMenuFor === col.id ? " is-open" : ""}`}
                        onClick={(e) => {
                          if (colMenuFor === col.id) {
                            setColMenuFor(null);
                            setColMenuAnchor(null);
                          } else {
                            setColMenuFor(col.id);
                            setColMenuAnchor(e.currentTarget);
                          }
                        }}
                        title="열 옵션"
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {colMenuFor === col.id && (
                        <PopoverPortal
                          anchorEl={colMenuAnchor}
                          onClose={() => {
                            setColMenuFor(null);
                            setColMenuAnchor(null);
                          }}
                        >
                          <div className="block-menu db-row-menu">
                            <button
                              type="button"
                              className="danger"
                              disabled={columns.length <= 1}
                              onClick={() => {
                                deleteColumn(col.id);
                                setColMenuFor(null);
                                setColMenuAnchor(null);
                              }}
                            >
                              <Trash2 size={14} />
                              <span>삭제</span>
                            </button>
                          </div>
                        </PopoverPortal>
                      )}
                    </div>
                  </div>

                  <ColumnResizeHandle
                    width={col.width || DEFAULT_COLUMN_WIDTH}
                    onResize={(w) => resizeColumn(col.id, w)}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="db-row">
                {columns.map((col, colIndex) => (
                  <td key={col.id} className={colIndex === 0 ? "db-cell--first" : undefined}>
                    {/* 행 왼쪽 ⋯ — DatabaseBlock과 같은 이유로 전용 칸 대신
                        첫 번째 컬럼 칸 위에 겹쳐서 떠요(평소엔 안 보이고
                        그 행에 마우스를 올렸을 때만). */}
                    {colIndex === 0 && (
                      <div className="db-row-handle">
                        <button
                          type="button"
                          ref={(el) => {
                            if (el && rowMenuFor === row.id && !rowMenuAnchor) {
                              setRowMenuAnchor(el);
                            }
                          }}
                          className={`db-row-handle-btn${rowMenuFor === row.id ? " is-open" : ""}`}
                          onClick={(e) => {
                            if (rowMenuFor === row.id) {
                              setRowMenuFor(null);
                              setRowMenuAnchor(null);
                            } else {
                              setRowMenuFor(row.id);
                              setRowMenuAnchor(e.currentTarget);
                            }
                          }}
                          title="행 옵션"
                        >
                          <MoreHorizontal size={14} />
                        </button>

                        {rowMenuFor === row.id && (
                          <PopoverPortal
                            anchorEl={rowMenuAnchor}
                            onClose={() => {
                              setRowMenuFor(null);
                              setRowMenuAnchor(null);
                            }}
                          >
                            <div className="block-menu db-row-menu">
                              <button
                                type="button"
                                className="danger"
                                disabled={rows.length <= 1}
                                onClick={() => {
                                  deleteRow(row.id);
                                  setRowMenuFor(null);
                                  setRowMenuAnchor(null);
                                }}
                              >
                                <Trash2 size={14} />
                                <span>삭제</span>
                              </button>
                            </div>
                          </PopoverPortal>
                        )}
                      </div>
                    )}

                    {/* <input>은 한 줄짜리라 열 너비를 넘는 글자는 줄바꿈 없이
                        옆으로 계속 늘어나기만 했어요(요청: 열 너비를 넘어가면
                        자동으로 줄바꿈). <textarea>로 바꾸고, ref/onInput에서
                        매번 height를 auto로 리셋한 뒤 scrollHeight로 다시
                        맞춰서 줄바꿈된 만큼 셀이 세로로 자동으로 늘어나요. */}
                    <textarea
                      className="db-cell-input"
                      rows={1}
                      value={cellValue(row.id, col.id)}
                      {...cellListHandlers((v) => setCellValue(row.id, col.id, v))}
                      ref={(el) => {
                        if (!el) return;
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                      }}
                      onInput={(e) => {
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                    />
                    {/* 헤더에만 있던 리사이즈 핸들을 각 행의 셀에도 붙여서, 표 중간
                        행에서 드래그해도 너비가 바뀌게 했어요. */}
                    <ColumnResizeHandle
                      width={col.width || DEFAULT_COLUMN_WIDTH}
                      onResize={(w) => resizeColumn(col.id, w)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* DatabaseBlock의 db-add-col-zone과 동일해요 — 헤더에만 있던 작은
            칸 대신, 표 오른쪽 바깥 여백 전체를 호버 영역으로 만들어서
            평소엔 숨어 있다가 호버했을 때만 표 높이만큼 길게 나타나요. */}
        <div className="db-add-col-zone">
          <button type="button" className="db-add-col-trigger" onClick={addColumn} title="열 추가">
            <Plus size={14} />
          </button>
        </div>
        </div>
      </div>

      {/* DatabaseBlock과 같은 이유로 카드(db-block-wrap) 바깥으로 뺐어요 —
          카드 안에 있으면 카드 테두리가 이 버튼까지 감싸서 평소에도
          좌우/아래쪽에 테두리가 있는 것처럼 보였어요. */}
      <button type="button" className="db-add-row" onClick={addRow}>
        <Plus size={10} />
        <span>행 추가</span>
      </button>
    </div>
  );
}
