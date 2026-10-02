import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignLeft,
  ArrowUpRight,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  CircleDot,
  Clock,
  FileText,
  Hash,
  Link,
  ListChecks,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Settings2,
  Trash2,
  Type,
  User,
  X,
} from "lucide-react";

import ColumnResizeHandle from "./ColumnResizeHandle";
import PopoverPortal from "./PopoverPortal";
import { useWorkspace } from "../../context/WorkspaceContext";
import { getAvatarTone } from "../../utils/avatarColor";

// 컬럼에 width가 없으면(예전 목데이터, 새로 만든 컬럼) 쓰는 기본값이에요.
// block_database_columns DDL엔 너비 컬럼이 없지만, pageId·kind처럼 이것도
// content JSON 쪽 column 객체에 그냥 필드 하나(width) 얹는 거라 스키마
// 변경이 필요 없어요. 기존 200px의 3/4로 줄였어요.
const DEFAULT_COLUMN_WIDTH = 150;

// block_database_columns.type ENUM — 노션 속성 22종 중, 기존 데이터(멤버·
// 페이지 등)만으로 바로 동작하는 7종(다중 선택/상태/사람/URL/이메일/전화번호/
// 생성 일시)을 추가했어요. 관계형·롤업·수식·버튼·ID·파일과 미디어·장소·
// 만든이/최종 편집 관련 속성은 각각 DB 간 연결, 수식 엔진, 자동화, 파일
// 업로드, 지오코딩처럼 이 앱에 아직 없는 인프라가 필요해서 이번엔 뺐어요.
// ENUM('TEXT','NUMBER','DATE','CHECKBOX','SELECT','TITLE','MULTI_SELECT',
// 'STATUS','PERSON','URL','EMAIL','PHONE','CREATED_TIME')
const COLUMN_TYPES = [
  { type: "TEXT", label: "텍스트", icon: AlignLeft },
  { type: "TITLE", label: "제목", icon: Type },
  { type: "NUMBER", label: "숫자", icon: Hash },
  { type: "DATE", label: "날짜", icon: Calendar },
  { type: "CHECKBOX", label: "체크박스", icon: CheckSquare },
  { type: "SELECT", label: "선택", icon: ChevronDown },
  { type: "MULTI_SELECT", label: "다중 선택", icon: ListChecks },
  { type: "STATUS", label: "상태", icon: CircleDot },
  { type: "PERSON", label: "사람", icon: User },
  { type: "URL", label: "URL", icon: Link },
  { type: "EMAIL", label: "이메일", icon: Mail },
  { type: "PHONE", label: "전화번호", icon: Phone },
  { type: "CREATED_TIME", label: "생성 일시", icon: Clock },
];

// 노션처럼 TITLE 타입 열은 데이터베이스마다 정확히 하나, 항상 맨 앞
// (columns[0])에만 있어요 — 그래서 다른 열의 "타입 변경" 팝오버에는
// 제목을 아예 선택지로 안 보여줘요(이미 있는 제목 열과 안 겹치게).
const RETYPEABLE_COLUMN_TYPES = COLUMN_TYPES.filter((t) => t.type !== "TITLE");

// STATUS는 노션에서도 값이 "할 일/진행 중/완료" 3개 그룹으로 묶여요 — 이
// 앱엔 이미 그 의미 그대로인 task_statuses(TODO/IN_PROGRESS/DONE, 회색·
// 파랑·초록) 시드가 있어서, 이름·색·그룹을 그대로 맞춰 기본값으로 써요.
const STATUS_DEFAULT_OPTIONS = [
  { value: "할 일", color: "gray", group: "TODO" },
  { value: "진행 중", color: "blue", group: "IN_PROGRESS" },
  { value: "완료", color: "green", group: "DONE" },
];
const STATUS_GROUPS = [
  { key: "TODO", label: "할 일" },
  { key: "IN_PROGRESS", label: "진행 중" },
  { key: "DONE", label: "완료" },
];

// SELECT 옵션 색 — 예전엔 "POST는 초록, 높음은 빨강"처럼 값 이름을 직접
// 아는 하드코딩 맵으로 색을 정했는데, 그러면 이 표(인증 엔드포인트,
// 회귀 테스트) 말고 다른 이름의 옵션을 쓰는 표에서는 전부 회색으로만
// 나와요. 노션처럼 옵션을 추가한 순서대로 팔레트를 돌아가며 색을
// 배정하고, 그 색을 옵션 자체에 저장해두는(= column.options가
// [{id, value, color}]) 방식으로 바꿨어요 — 값 이름과 무관하게 항상
// 색이 입혀지고, 옵션 이름을 바꿔도 색은 유지돼요.
// block_database_column_options.color ENUM('BLUE','PURPLE','GREEN','RED',
// 'ORANGE','PINK','GRAY')와 순서·구성을 맞춰뒀어요 (여기 값은 프론트 CSS
// 클래스 이름 관례상 소문자예요 — 실제 저장/전송 시 대문자로 매핑하면 돼요).
const OPTION_PALETTE = ["blue", "purple", "green", "red", "orange", "pink", "gray"];

function nextPaletteColor(existingOptions) {
  return OPTION_PALETTE[(existingOptions?.length || 0) % OPTION_PALETTE.length];
}

// 컬럼 이름으로 봐서 뻔한 경우(우선순위, HTTP 메서드)엔 SELECT로 바꾸자마자
// 바로 쓸 수 있게 기본 옵션 + 색을 미리 채워줘요. 그 외엔 빈 채로 시작해서
// 사용자가 셀에서 직접 옵션을 만들면 그때부터 팔레트가 순서대로 배정돼요.
const SELECT_OPTION_PRESETS = [
  {
    pattern: /우선순위|priority/i,
    options: [
      { value: "높음", color: "red" },
      { value: "보통", color: "orange" },
      { value: "낮음", color: "green" },
    ],
  },
  {
    pattern: /method|메서드/i,
    options: [
      { value: "GET", color: "blue" },
      { value: "POST", color: "green" },
      { value: "PUT", color: "orange" },
      { value: "PATCH", color: "orange" },
      { value: "DELETE", color: "red" },
    ],
  },
];

function presetOptionsFor(columnName) {
  const preset = SELECT_OPTION_PRESETS.find((p) => p.pattern.test(columnName || ""));
  return preset ? preset.options.map((o) => ({ ...o })) : [];
}

// PopoverPortal은 ./PopoverPortal.jsx로 뽑아냈어요 — SimpleTableBlock의
// 행 메뉴(⋯)도 똑같은 overflow 문제를 겪어서 두 컴포넌트가 같이 써요.

export default function DatabaseBlock({
  database,
  onChange,
  pages = [],
  onCreateRowPage,
  onRenameRowPage,
  onDeleteRowPage,
}) {
  const { columns, rows, cells, title } = database;
  const navigate = useNavigate();

  const nextColumnId = useRef(Math.max(0, ...columns.map((c) => c.id)) + 1);
  const nextRowId = useRef(Math.max(0, ...rows.map((r) => r.id)) + 1);
  const nextOptionId = useRef(
    Math.max(0, ...columns.flatMap((c) => (c.options || []).map((o) => o.id))) + 1,
  );

  const [optionsMenuFor, setOptionsMenuFor] = useState(null); // columnId
  const [optionsMenuAnchor, setOptionsMenuAnchor] = useState(null); // 옵션 관리 팝오버를 띄울 기준 버튼(DOM)
  const [newOptionDraft, setNewOptionDraft] = useState("");
  const [typeMenuFor, setTypeMenuFor] = useState(null); // columnId — 속성 유형 선택 팝오버
  const [typeMenuAnchor, setTypeMenuAnchor] = useState(null); // 속성 유형 팝오버를 띄울 기준 버튼(DOM)
  // 행 왼쪽의 "⋯" — 블록 에디터의 block-actions/block-menu와 같은 자리예요.
  // 지금은 "삭제"만 있지만, 나중에 "위로 이동"/"아래로 이동" 같은 재정렬
  // 메뉴를 추가하기 쉽게 block-menu와 같은 구조(버튼 목록 + danger 삭제)로
  // 만들어뒀어요.
  const [rowMenuFor, setRowMenuFor] = useState(null); // rowId
  const [rowMenuAnchor, setRowMenuAnchor] = useState(null);
  // 열 헤더의 "⋯" — 예전엔 옵션 관리(⚙)·삭제(🗑) 버튼이 따로 있었는데,
  // 행과 똑같이 하나의 더보기 메뉴로 합쳤어요. "옵션 관리"를 고르면 이
  // 메뉴는 닫고 기존 옵션 관리 팝오버(optionsMenuFor)를 그대로 열어요.
  const [colMenuFor, setColMenuFor] = useState(null); // columnId
  const [colMenuAnchor, setColMenuAnchor] = useState(null);

  // 노션 데이터베이스처럼, 행 하나하나가 곧 "페이지"예요 — 행을 만드는
  // 순간 이미 페이지라서(addRow 참고) "아직 페이지가 없는 행"이라는
  // 상태가 없어요. DDL엔 block_database_rows→pages를 잇는 컬럼이 없어서
  // (스키마 변경 없이 가려고) 하위 페이지 블록(pageId)과 같은 방식으로
  // row 자체에 pageId를 얹어요 — 실제 DB라면 block_database_rows의
  // content류 JSON 칸에 들어갈 값이에요.
  const pagesById = Object.fromEntries(pages.map((p) => [p.id, p]));

  const cellValue = (rowId, columnId) =>
    cells.find((c) => c.rowId === rowId && c.columnId === columnId)?.value ?? "";

  const setCellValue = (rowId, columnId, value) => {
    const exists = cells.some((c) => c.rowId === rowId && c.columnId === columnId);
    const nextCells = exists
      ? cells.map((c) => (c.rowId === rowId && c.columnId === columnId ? { ...c, value } : c))
      : [...cells, { rowId, columnId, value }];
    onChange({ ...database, cells: nextCells });
  };

  // SELECT 셀에서 "기존 옵션 고르기"와 "새 옵션 만들고 바로 그 값 쓰기"를
  // 한 함수로 합쳤어요. 옵션 추가(columns 변경)와 셀 값 지정(cells 변경)을
  // onChange 두 번으로 나눠 부르면, 두 번째 호출이 여전히 이전 렌더의
  // database를 기준으로 계산되기 때문에 첫 번째 변경(새 옵션)이 씹혀요 —
  // 그래서 반드시 한 번의 onChange로 columns/cells를 같이 갱신해요.
  const chooseSelectValue = (rowId, columnId, rawValue) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      // 빈 값을 고르면 "선택 해제"예요(노션처럼 셀을 비워요). 예전엔 아무 일도 안 일어났어요.
      if (cells.some((c) => c.rowId === rowId && c.columnId === columnId && c.value !== "")) {
        onChange({
          ...database,
          cells: cells.map((c) => (c.rowId === rowId && c.columnId === columnId ? { ...c, value: "" } : c)),
        });
      }
      return;
    }

    const column = columns.find((c) => c.id === columnId);
    const existingOptions = column?.options || [];
    const already = existingOptions.some((o) => o.value === trimmed);
    // STATUS 열에서 셀에서 바로 새 옵션을 만들면(관리 팝오버를 거치지 않고),
    // 일단 "할 일" 그룹에 넣어둬요 — 그룹은 헤더의 옵션 관리에서 바꿀 수 있어요.
    const isStatus = column?.type === "STATUS";

    const nextColumns = already
      ? columns
      : columns.map((c) =>
          c.id === columnId
            ? {
                ...c,
                options: [
                  ...existingOptions,
                  {
                    id: nextOptionId.current++,
                    value: trimmed,
                    color: nextPaletteColor(existingOptions),
                    ...(isStatus ? { group: "TODO" } : {}),
                  },
                ],
              }
            : c,
        );

    const cellExists = cells.some((c) => c.rowId === rowId && c.columnId === columnId);
    const nextCells = cellExists
      ? cells.map((c) => (c.rowId === rowId && c.columnId === columnId ? { ...c, value: trimmed } : c))
      : [...cells, { rowId, columnId, value: trimmed }];

    onChange({ ...database, columns: nextColumns, cells: nextCells });
  };

  // MULTI_SELECT는 SELECT와 달리 셀 값이 배열이에요(여러 개 동시 선택).
  // 옵션이 없으면 새로 만들면서 바로 토글하고, 있으면 그냥 토글만 해요 —
  // 옵션 추가(columns)와 셀 값 변경(cells)을 같이 하는 경우엔 chooseSelectValue와
  // 똑같은 이유로 반드시 한 번의 onChange로 묶어요.
  const toggleMultiSelectValue = (rowId, columnId, rawValue) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;

    const column = columns.find((c) => c.id === columnId);
    const existingOptions = column?.options || [];
    const already = existingOptions.some((o) => o.value === trimmed);

    const nextColumns = already
      ? columns
      : columns.map((c) =>
          c.id === columnId
            ? {
                ...c,
                options: [
                  ...existingOptions,
                  { id: nextOptionId.current++, value: trimmed, color: nextPaletteColor(existingOptions) },
                ],
              }
            : c,
        );

    const current = Array.isArray(cellValue(rowId, columnId)) ? cellValue(rowId, columnId) : [];
    const nextValues = current.includes(trimmed)
      ? current.filter((v) => v !== trimmed)
      : [...current, trimmed];

    const cellExists = cells.some((c) => c.rowId === rowId && c.columnId === columnId);
    const nextCells = cellExists
      ? cells.map((c) => (c.rowId === rowId && c.columnId === columnId ? { ...c, value: nextValues } : c))
      : [...cells, { rowId, columnId, value: nextValues }];

    onChange({ ...database, columns: nextColumns, cells: nextCells });
  };

  // PERSON 셀 값도 배열이에요(담당자 여러 명 가능) — 옵션 관리가 따로
  // 없고 members 목록 자체가 선택지라서 MULTI_SELECT보다 훨씬 단순해요.
  const togglePersonValue = (rowId, columnId, memberName) => {
    const current = Array.isArray(cellValue(rowId, columnId)) ? cellValue(rowId, columnId) : [];
    const nextValues = current.includes(memberName)
      ? current.filter((n) => n !== memberName)
      : [...current, memberName];
    setCellValue(rowId, columnId, nextValues);
  };

  // 노션은 행을 추가하는 순간 그 행이 이미 페이지라, "만들기" 버튼 같은
  // 별도 단계 없이 addRow에서 바로 페이지까지 만들어서 pageId를 같이
  // 저장해요 — 제목 열은 그 페이지의 title을 그대로 보여주고 편집해요.
  const addRow = () => {
    const id = nextRowId.current++;
    const newPage = onCreateRowPage?.();
    onChange({ ...database, rows: [...rows, { id, pageId: newPage?.id ?? null }] });
  };

  // 행 = 페이지라서, 행을 지우면 그 페이지(안의 내용까지 전부)도 같이
  // 휴지통으로 이동해요 — deletePage가 이제 소프트 삭제라 필요하면
  // 휴지통에서 복원할 수 있어요.
  const deleteRow = (rowId) => {
    const row = rows.find((r) => r.id === rowId);
    if (row?.pageId) {
      const confirmed = window.confirm(
        "이 행을 지우면 연결된 페이지도 함께 휴지통으로 이동해요. 계속할까요?",
      );
      if (!confirmed) return;
      onDeleteRowPage?.(row.pageId);
    }
    onChange({
      ...database,
      rows: rows.filter((r) => r.id !== rowId),
      cells: cells.filter((c) => c.rowId !== rowId),
    });
  };

  const addColumn = () => {
    const id = nextColumnId.current++;
    // "새 열" 같은 임시 이름 대신, 처음부터 속성 유형(기본값 텍스트)과
    // 같은 이름으로 만들어요 — 바로 다음에 열리는 유형 팝오버에서 다른
    // 유형을 고르면 retypeColumn이 이 이름을 그 유형 이름으로 다시
    // 맞춰줘요.
    const defaultLabel = COLUMN_TYPES.find((t) => t.type === "TEXT")?.label ?? "텍스트";
    onChange({
      ...database,
      columns: [...columns, { id, name: defaultLabel, type: "TEXT" }],
    });
    // 새 열을 만들자마자 노션처럼 바로 유형을 고를 수 있게 팝오버를 열어줘요.
    setTypeMenuFor(id);
  };

  const deleteColumn = (columnId) => {
    const target = columns.find((c) => c.id === columnId);
    // 제목(TITLE) 열은 노션처럼 삭제할 수 없어요 — 행 = 페이지 구조를
    // 지탱하는 자리라서요.
    if (target?.type === "TITLE") return;
    if (columns.length <= 1) return;
    onChange({
      ...database,
      columns: columns.filter((c) => c.id !== columnId),
      cells: cells.filter((c) => c.columnId !== columnId),
    });
  };

  const renameColumn = (columnId, name) => {
    onChange({
      ...database,
      columns: columns.map((c) => (c.id === columnId ? { ...c, name } : c)),
    });
  };

  const resizeColumn = (columnId, width) => {
    onChange({
      ...database,
      columns: columns.map((c) => (c.id === columnId ? { ...c, width } : c)),
    });
  };

  const retypeColumn = (columnId, type) => {
    const target = columns.find((c) => c.id === columnId);
    // 제목 열은 타입을 못 바꾸고("항상 TITLE"), 반대로 다른 열을 TITLE로
    // 바꾸는 것도 막아요 — 데이터베이스마다 TITLE은 정확히 하나예요.
    if (target?.type === "TITLE" || type === "TITLE") return;

    // 열 이름이 아직 이전 유형 이름 그대로거나 비어 있으면(= 사용자가
    // 직접 고쳐 부르지 않았으면) 새로 고른 유형 이름으로 같이 맞춰줘요.
    // 사용자가 이미 "담당자"처럼 직접 이름을 지었다면 그 이름은 건드리지
    // 않아요.
    const currentLabel = COLUMN_TYPES.find((t) => t.type === target?.type)?.label;
    const newLabel = COLUMN_TYPES.find((t) => t.type === type)?.label;
    const shouldRenameToLabel =
      newLabel && (!target?.name?.trim() || target.name === currentLabel);

    onChange({
      ...database,
      columns: columns.map((c) => {
        if (c.id !== columnId) return c;
        const base = shouldRenameToLabel ? { ...c, name: newLabel } : c;
        if ((type === "SELECT" || type === "MULTI_SELECT") && !(c.options && c.options.length)) {
          const seeded = presetOptionsFor(c.name).map((o) => ({ ...o, id: nextOptionId.current++ }));
          return { ...base, type, options: seeded };
        }
        if (type === "STATUS" && !(c.options && c.options.length)) {
          const seeded = STATUS_DEFAULT_OPTIONS.map((o) => ({ ...o, id: nextOptionId.current++ }));
          return { ...base, type, options: seeded };
        }
        return { ...base, type };
      }),
    });
  };

  const addOption = (columnId, value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onChange({
      ...database,
      columns: columns.map((c) => {
        if (c.id !== columnId) return c;
        const options = c.options || [];
        if (options.some((o) => o.value === trimmed)) return c;
        return {
          ...c,
          options: [
            ...options,
            {
              id: nextOptionId.current++,
              value: trimmed,
              color: nextPaletteColor(options),
              ...(c.type === "STATUS" ? { group: "TODO" } : {}),
            },
          ],
        };
      }),
    });
  };

  // STATUS 옵션의 그룹(할 일/진행 중/완료)을 순서대로 순환시켜요 — 색
  // 순환(cycleOptionColor)과 같은 패턴이에요.
  const cycleOptionGroup = (columnId, optionId) => {
    onChange({
      ...database,
      columns: columns.map((c) => {
        if (c.id !== columnId) return c;
        return {
          ...c,
          options: c.options.map((o) => {
            if (o.id !== optionId) return o;
            const idx = STATUS_GROUPS.findIndex((g) => g.key === o.group);
            const next = STATUS_GROUPS[(idx + 1) % STATUS_GROUPS.length];
            return { ...o, group: next.key };
          }),
        };
      }),
    });
  };

  const renameOption = (columnId, optionId, newValue) => {
    const trimmed = newValue.trim();
    if (!trimmed) return;

    const column = columns.find((c) => c.id === columnId);
    const target = column?.options?.find((o) => o.id === optionId);
    if (!target || target.value === trimmed) return;

    const nextColumns = columns.map((c) =>
      c.id === columnId
        ? { ...c, options: c.options.map((o) => (o.id === optionId ? { ...o, value: trimmed } : o)) }
        : c,
    );
    // 이 옵션을 이미 쓰고 있던 셀들도 이름을 따라가게 해요 — 안 그러면
    // 옵션 목록엔 새 이름, 셀엔 옛날 이름이 남아서 드롭다운에 없는
    // "미아 값"이 돼버려요.
    // 다중 선택 셀은 값이 배열이라 그 안의 이름도 바꿔줘요.
    const nextCells = cells.map((cell) => {
      if (cell.columnId !== columnId) return cell;
      if (Array.isArray(cell.value)) {
        return cell.value.includes(target.value)
          ? { ...cell, value: cell.value.map((v) => (v === target.value ? trimmed : v)) }
          : cell;
      }
      return cell.value === target.value ? { ...cell, value: trimmed } : cell;
    });

    onChange({ ...database, columns: nextColumns, cells: nextCells });
  };

  const cycleOptionColor = (columnId, optionId) => {
    onChange({
      ...database,
      columns: columns.map((c) => {
        if (c.id !== columnId) return c;
        return {
          ...c,
          options: c.options.map((o) => {
            if (o.id !== optionId) return o;
            const idx = OPTION_PALETTE.indexOf(o.color);
            return { ...o, color: OPTION_PALETTE[(idx + 1) % OPTION_PALETTE.length] };
          }),
        };
      }),
    });
  };

  const removeOption = (columnId, optionId) => {
    const removed = columns.find((c) => c.id === columnId)?.options?.find((o) => o.id === optionId);
    // 지운 옵션을 쓰던 셀은 비워요(노션처럼). 안 비우면 옵션 목록엔 없는 "미아 값"이 회색 태그로 남아요.
    const nextCells = removed
      ? cells.map((cell) => {
          if (cell.columnId !== columnId) return cell;
          if (Array.isArray(cell.value)) {
            return cell.value.includes(removed.value) ? { ...cell, value: cell.value.filter((v) => v !== removed.value) } : cell;
          }
          return cell.value === removed.value ? { ...cell, value: "" } : cell;
        })
      : cells;
    onChange({
      ...database,
      columns: columns.map((c) =>
        c.id === columnId ? { ...c, options: (c.options || []).filter((o) => o.id !== optionId) } : c,
      ),
      cells: nextCells,
    });
  };

  return (
    <div className="db-block">
      <input
        className="db-block__title"
        value={title || ""}
        placeholder="표 제목 없음"
        maxLength={100}
        onChange={(e) => onChange({ ...database, title: e.target.value })}
      />

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
                      maxLength={100}
                      onChange={(e) => renameColumn(col.id, e.target.value)}
                    />

                    {/* 제목(TITLE) 열은 타입 변경·옵션·삭제가 전부 없어요 —
                        노션의 제목 열처럼 이름만 바꿀 수 있어요. */}
                    {col.type !== "TITLE" && (
                      <div className="db-table__head-type-wrap">
                        <button
                          type="button"
                          // 열을 추가하자마자(addColumn) 자동으로 이 팝오버를 열 때는
                          // 클릭 이벤트가 없어서 anchor(DOM)를 못 받아요 — 그래서 버튼이
                          // 처음 마운트되는 시점에 ref로 한 번 더 anchor를 잡아줘요.
                          ref={(el) => {
                            if (el && typeMenuFor === col.id && !typeMenuAnchor) {
                              setTypeMenuAnchor(el);
                            }
                          }}
                          className="db-table__head-type"
                          onClick={(e) => {
                            if (typeMenuFor === col.id) {
                              setTypeMenuFor(null);
                              setTypeMenuAnchor(null);
                            } else {
                              setTypeMenuFor(col.id);
                              setTypeMenuAnchor(e.currentTarget);
                            }
                          }}
                        >
                          {(() => {
                            const meta = COLUMN_TYPES.find((t) => t.type === col.type);
                            const Icon = meta?.icon || AlignLeft;
                            return (
                              <>
                                <Icon size={12} />
                                <span>{meta?.label || col.type}</span>
                              </>
                            );
                          })()}
                        </button>

                        {typeMenuFor === col.id && (
                          <PopoverPortal
                            anchorEl={typeMenuAnchor}
                            onClose={() => {
                              setTypeMenuFor(null);
                              setTypeMenuAnchor(null);
                            }}
                          >
                            <ColumnTypePicker
                              options={RETYPEABLE_COLUMN_TYPES}
                              value={col.type}
                              onSelect={(type) => {
                                retypeColumn(col.id, type);
                                setTypeMenuFor(null);
                                setTypeMenuAnchor(null);
                              }}
                              onClose={() => {
                                setTypeMenuFor(null);
                                setTypeMenuAnchor(null);
                              }}
                            />
                          </PopoverPortal>
                        )}
                      </div>
                    )}

                    {col.type !== "TITLE" && (
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
                              {(col.type === "SELECT" || col.type === "STATUS" || col.type === "MULTI_SELECT") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // "..." 트리거 버튼(colMenuAnchor)은 이 메뉴를 닫아도
                                    // DOM에 그대로 남아 있어서, 옵션 관리 팝오버의 anchor로
                                    // 그대로 재사용할 수 있어요.
                                    const anchor = colMenuAnchor;
                                    setColMenuFor(null);
                                    setColMenuAnchor(null);
                                    setOptionsMenuFor(col.id);
                                    setOptionsMenuAnchor(anchor);
                                  }}
                                >
                                  <Settings2 size={14} />
                                  <span>옵션 관리</span>
                                </button>
                              )}

                              {(col.type === "SELECT" || col.type === "STATUS" || col.type === "MULTI_SELECT") && (
                                <hr className="block-menu__divider" />
                              )}

                              <button
                                type="button"
                                className="danger"
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
                    )}
                  </div>

                  {(col.type === "SELECT" || col.type === "STATUS" || col.type === "MULTI_SELECT") &&
                    optionsMenuFor === col.id && (
                    <PopoverPortal
                      anchorEl={optionsMenuAnchor}
                      onClose={() => {
                        setOptionsMenuFor(null);
                        setNewOptionDraft("");
                        setOptionsMenuAnchor(null);
                      }}
                    >
                      <div className="db-select-options">
                        <p className="db-select-options__label">옵션 관리</p>

                        <div className="db-select-options__list">
                          {(col.options || []).map((opt) => (
                            <div key={opt.id} className="db-select-options__row">
                              <button
                                type="button"
                                className={`db-select-options__dot db-dot--${opt.color}`}
                                onClick={() => cycleOptionColor(col.id, opt.id)}
                                title="클릭해서 색 바꾸기"
                              />
                              <input
                                className="db-select-options__input"
                                defaultValue={opt.value}
                                maxLength={100}
                                onBlur={(e) => renameOption(col.id, opt.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                }}
                              />
                              {col.type === "STATUS" && (
                                <button
                                  type="button"
                                  className="db-select-options__group"
                                  onClick={() => cycleOptionGroup(col.id, opt.id)}
                                  title="클릭해서 그룹 바꾸기"
                                >
                                  {STATUS_GROUPS.find((g) => g.key === opt.group)?.label || "할 일"}
                                </button>
                              )}
                              <button
                                type="button"
                                className="db-select-options__remove"
                                onClick={() => removeOption(col.id, opt.id)}
                                title="옵션 삭제"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                          {(col.options || []).length === 0 && (
                            <p className="db-select-options__empty">등록된 옵션이 없어요.</p>
                          )}
                        </div>

                        <form
                          className="db-select-options__add"
                          onSubmit={(e) => {
                            e.preventDefault();
                            addOption(col.id, newOptionDraft);
                            setNewOptionDraft("");
                          }}
                        >
                          <input
                            value={newOptionDraft}
                            placeholder="새 옵션 이름"
                            maxLength={100}
                            onChange={(e) => setNewOptionDraft(e.target.value)}
                          />
                          <button type="submit">
                            <Plus size={13} />
                          </button>
                        </form>
                      </div>
                    </PopoverPortal>
                  )}

                  <ColumnResizeHandle
                    width={col.width || DEFAULT_COLUMN_WIDTH}
                    onResize={(w) => resizeColumn(col.id, w)}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const linkedPage = row.pageId ? pagesById[row.pageId] : null;

              return (
              <tr key={row.id} className="db-row">
                {columns.map((col, colIndex) => (
                  <td key={col.id} className={colIndex === 0 ? "db-cell--first" : undefined}>
                    {/* 행 왼쪽 ⋯ — 예전엔 전용 칸(db-row-handle-cell)을 하나
                        더 뒀는데, 그러면 호버 안 해도 그 칸만큼 빈 여백이
                        항상 남아서 "칸이 보인다"는 문제가 그대로였어요.
                        그래서 별도 칸 없이, 첫 번째 컬럼 칸 위에 살짝
                        겹쳐서(position:absolute) 뜨게 했어요 — 평소엔
                        opacity:0라 완전히 안 보이고, 그 행에 마우스를
                        올렸을 때만 나타나요. */}
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

                    {col.type === "TITLE" ? (
                      <TitleCell
                        page={linkedPage}
                        hasPageId={!!row.pageId}
                        onRename={(v) => onRenameRowPage?.(row.pageId, v)}
                        onOpen={() => navigate(`/pages/${row.pageId}`)}
                      />
                    ) : (
                      <DatabaseCell
                        type={col.type}
                        value={cellValue(row.id, col.id)}
                        options={col.options}
                        linkedPage={linkedPage}
                        onChange={(v) => setCellValue(row.id, col.id, v)}
                        onChooseSelect={(v) => chooseSelectValue(row.id, col.id, v)}
                        onToggleMultiSelect={(v) => toggleMultiSelectValue(row.id, col.id, v)}
                        onTogglePerson={(v) => togglePersonValue(row.id, col.id, v)}
                      />
                    )}
                    {/* 헤더에만 있던 리사이즈 핸들을 각 행의 셀에도 똑같이 붙여요.
                        th 하나만으로는 그 짧은 헤더 높이 안에서만 드래그가 되니까,
                        표 중간 행에서 드래그해도 너비가 안 바뀌는 것처럼 느껴져요.
                        같은 컬럼의 모든 셀이 같은 resizeColumn을 호출하게 해서
                        세로로 이어진 하나의 드래그 가능한 경계선처럼 동작하게 했어요. */}
                    <ColumnResizeHandle
                      width={col.width || DEFAULT_COLUMN_WIDTH}
                      onResize={(w) => resizeColumn(col.id, w)}
                    />
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>

        {/* 예전엔 헤더에만 있는 34px짜리 칸이라 위쪽에만 작은 탭처럼 튀어나와
            보였어요. 노션처럼 표 오른쪽 바깥 여백 전체(헤더~마지막 행 높이)를
            하나의 호버 영역으로 만들어서, 평소엔 완전히 숨어 있다가 그 영역에
            마우스를 올렸을 때만 표 전체 높이만큼 길게 하이라이트되며 가운데에
            +가 뜨게 했어요. */}
        <div className="db-add-col-zone">
          <button type="button" className="db-add-col-trigger" onClick={addColumn} title="열 추가">
            <Plus size={14} />
          </button>
        </div>
        </div>
      </div>

      {/* db-block-wrap(카드) 안에 있으면 카드의 border/overflow가 이
          버튼까지 감싸서, 호버 전에도 카드 테두리가 "행 추가를 위한
          칸이 있다"는 흔적으로 남았어요(요청: 표 마지막 행 밑 경계선은
          카드 테두리로 그대로 보이되, 행 추가 부분엔 좌우/아래쪽 테두리가
          전혀 없어야 함). 그래서 카드 바깥으로 뺐어요 — 이제 카드는
          표에서 정확히 끝나고, 이 버튼은 페이지의 빈 여백 위에 떠 있는
          거라 자기 테두리도, 감싸는 카드 테두리도 없어요. */}
      <button type="button" className="db-add-row" onClick={addRow}>
        <Plus size={10} />
        <span>행 추가</span>
      </button>
    </div>
  );
}

function DatabaseCell({
  type,
  value,
  options,
  linkedPage,
  onChange,
  onChooseSelect,
  onToggleMultiSelect,
  onTogglePerson,
}) {
  if (type === "CHECKBOX") {
    return (
      <input
        type="checkbox"
        className="db-cell-checkbox"
        checked={value === true || value === "true"}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }

  if (type === "SELECT") {
    return <SelectCell value={value} options={options || []} onChoose={onChooseSelect} />;
  }

  if (type === "MULTI_SELECT") {
    return (
      <MultiSelectCell
        values={Array.isArray(value) ? value : []}
        options={options || []}
        onToggle={onToggleMultiSelect}
      />
    );
  }

  if (type === "STATUS") {
    return <StatusCell value={value} options={options || []} onChoose={onChooseSelect} />;
  }

  if (type === "PERSON") {
    return (
      <PersonCell values={Array.isArray(value) ? value : []} onToggle={onTogglePerson} />
    );
  }

  if (type === "NUMBER") {
    return (
      <input
        type="number"
        className="db-cell-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (type === "DATE") {
    return (
      <input
        type="date"
        className="db-cell-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (type === "URL") {
    return <LinkCell kind="URL" value={value} onChange={onChange} />;
  }

  if (type === "EMAIL") {
    return <LinkCell kind="EMAIL" value={value} onChange={onChange} />;
  }

  if (type === "PHONE") {
    return <LinkCell kind="PHONE" value={value} onChange={onChange} />;
  }

  if (type === "CREATED_TIME") {
    return <CreatedTimeCell iso={linkedPage?.createdAt} />;
  }

  // 기본(TEXT) 셀 — <input>은 한 줄이라 열 너비를 넘는 글자는 줄바꿈 없이
  // 옆으로 계속 늘어나기만 했어요(요청: 열 너비를 넘어가면 자동으로
  // 줄바꿈). <textarea>로 바꾸고, ref/onInput에서 매번 height를 auto로
  // 리셋한 뒤 scrollHeight로 다시 맞춰서 줄바꿈된 만큼 셀이 세로로
  // 자동으로 늘어나요.
  return (
    <textarea
      className="db-cell-input"
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
  );
}

/* ================= ColumnTypePicker =================
   헤더의 네이티브 <select>를 대신하는, 검색 가능한 속성 유형 팝오버예요.
   브라우저 기본 드롭다운은 옵션에 아이콘을 넣을 수 없어서(SelectCell과
   같은 이유) 직접 만들었어요. */

function ColumnTypePicker({ options, value, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;

  return (
    <div className="db-type-picker">
      <div className="db-type-picker__search">
        <Search size={13} />
        <input
          ref={inputRef}
          value={query}
          placeholder="속성 유형 검색"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        />
      </div>

      <div className="db-type-picker__list">
        {filtered.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.type}
              type="button"
              className={`db-type-picker__option ${
                opt.type === value ? "db-type-picker__option--active" : ""
              }`}
              onClick={() => onSelect(opt.type)}
            >
              <Icon size={14} />
              <span>{opt.label}</span>
              {opt.type === value && <Check size={13} className="db-type-picker__check" />}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="db-type-picker__empty">일치하는 유형이 없어요.</p>
        )}
      </div>
    </div>
  );
}

/* ================= TitleCell =================
   TITLE 열은 "속성 칸"이 아니라 그 행(=페이지)의 진짜 제목이에요. 그래서
   따로 cells에 값을 저장하지 않고, row.pageId가 가리키는 페이지의
   title/icon을 그대로 읽고 편집해요(페이지에서 제목을 바꿔도, 여기서
   바꿔도 항상 같은 값). 노션처럼 아이콘 + 제목 입력 + (행에 마우스를
   올리면 나타나는) 열기 버튼을 한 칸에 담았어요 — 예전처럼 "페이지 연결
   전용 열"을 따로 두지 않아요. */

function TitleCell({ page, hasPageId, onRename, onOpen }) {
  if (hasPageId && !page) {
    // pageId는 있는데 pages 배열에서 못 찾은 경우 — 페이지가 다른 곳에서
    // 삭제된 상태예요.
    return (
      <div className="db-title-cell db-title-cell--missing">
        <FileText size={13} />
        <span>삭제된 페이지</span>
      </div>
    );
  }

  return (
    <div className="db-title-cell">
      <span className="db-title-cell__icon">{page?.icon || <FileText size={13} />}</span>
      <input
        className="db-title-cell__input"
        value={page?.title || ""}
        placeholder="제목 없음"
        maxLength={200}
        onChange={(e) => onRename(e.target.value)}
      />
      <button type="button" className="db-title-cell__open" onClick={onOpen} title="페이지 열기">
        <ArrowUpRight size={13} />
      </button>
    </div>
  );
}

/* ================= SelectCell =================
   노션의 select 셀처럼, 값이 있으면 색이 입혀진 태그로 보여주고, 클릭하면
   검색 + 기존 옵션 목록 + "새로 만들기"가 뜨는 팝오버로 골라요. 네이티브
   <select>는 옵션에 색을 입힐 수 없어서(브라우저가 그리는 드롭다운이라
   CSS가 거의 안 먹혀요) 이렇게 직접 만든 팝오버로 바꿨어요. */

function SelectCell({ value, options, onChoose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const current = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.value.toLowerCase().includes(q)) : options;
  const exactMatch = options.some((o) => o.value.toLowerCase() === q);

  const choose = (v) => {
    onChoose(v);
    setIsOpen(false);
  };

  return (
    <div className="db-select-cell">
      <button
        ref={triggerRef}
        type="button"
        className={`db-select-cell__trigger ${!current ? "db-select-cell__trigger--empty" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
      >
        {current ? (
          <span className={`db-tag db-tag--${current.color}`}>{current.value}</span>
        ) : (
          <span className="db-select-cell__placeholder">비어 있음</span>
        )}
      </button>

      {isOpen && (
        <PopoverPortal anchorEl={triggerRef.current} onClose={() => setIsOpen(false)}>
          <div className="db-select-cell-popover">
            <div className="db-select-cell-popover__search">
              <Search size={13} />
              <input
                ref={inputRef}
                value={query}
                placeholder="검색 또는 새 옵션 추가"
                maxLength={100}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filtered.length > 0) choose(filtered[0].value);
                    else if (query.trim()) choose(query);
                  }
                  if (e.key === "Escape") setIsOpen(false);
                }}
              />
            </div>

            <div className="db-select-cell-popover__list">
              {current && (
                <button
                  type="button"
                  className="db-select-cell-popover__clear"
                  onClick={() => choose("")}
                >
                  <X size={12} />
                  <span>선택 해제</span>
                </button>
              )}

              {filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="db-select-cell-popover__option"
                  onClick={() => choose(opt.value)}
                >
                  <span className={`db-tag db-tag--${opt.color}`}>{opt.value}</span>
                  {opt.value === value && <Check size={13} className="db-select-cell-popover__check" />}
                </button>
              ))}

              {query.trim() && !exactMatch && (
                <button
                  type="button"
                  className="db-select-cell-popover__create"
                  onClick={() => choose(query)}
                >
                  <Plus size={12} />
                  <span>"{query.trim()}" 만들기</span>
                </button>
              )}

              {filtered.length === 0 && !query.trim() && (
                <p className="db-select-cell-popover__empty">옵션이 없어요. 입력해서 새로 만들어보세요.</p>
              )}
            </div>
          </div>
        </PopoverPortal>
      )}
    </div>
  );
}

/* ================= MultiSelectCell =================
   SELECT와 거의 같은 팝오버지만, 항목을 고를 때마다 팝오버가 닫히지
   않고 여러 개를 연달아 토글할 수 있어요(노션의 다중 선택처럼). 값은
   태그 여러 개를 나란히 보여줘요. */

function MultiSelectCell({ values, options, onToggle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.value.toLowerCase().includes(q)) : options;
  const exactMatch = options.some((o) => o.value.toLowerCase() === q);

  return (
    <div className="db-select-cell">
      <button
        ref={triggerRef}
        type="button"
        className={`db-select-cell__trigger ${values.length === 0 ? "db-select-cell__trigger--empty" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
      >
        {values.length > 0 ? (
          <span className="db-multi-tags">
            {values.map((v) => {
              const opt = options.find((o) => o.value === v);
              return (
                <span key={v} className={`db-tag db-tag--${opt?.color || "gray"}`}>
                  {v}
                </span>
              );
            })}
          </span>
        ) : (
          <span className="db-select-cell__placeholder">비어 있음</span>
        )}
      </button>

      {isOpen && (
        <PopoverPortal anchorEl={triggerRef.current} onClose={() => setIsOpen(false)}>
          <div className="db-select-cell-popover">
            <div className="db-select-cell-popover__search">
              <Search size={13} />
              <input
                ref={inputRef}
                value={query}
                placeholder="검색 또는 새 옵션 추가"
                maxLength={100}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filtered.length > 0) onToggle(filtered[0].value);
                    else if (query.trim()) onToggle(query);
                  }
                  if (e.key === "Escape") setIsOpen(false);
                }}
              />
            </div>

            <div className="db-select-cell-popover__list">
              {filtered.map((opt) => {
                const checked = values.includes(opt.value);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className="db-select-cell-popover__option"
                    onClick={() => onToggle(opt.value)}
                  >
                    <span className={`db-tag db-tag--${opt.color}`}>{opt.value}</span>
                    {checked && <Check size={13} className="db-select-cell-popover__check" />}
                  </button>
                );
              })}

              {query.trim() && !exactMatch && (
                <button
                  type="button"
                  className="db-select-cell-popover__create"
                  onClick={() => {
                    onToggle(query);
                    setQuery("");
                  }}
                >
                  <Plus size={12} />
                  <span>"{query.trim()}" 만들기</span>
                </button>
              )}

              {filtered.length === 0 && !query.trim() && (
                <p className="db-select-cell-popover__empty">옵션이 없어요. 입력해서 새로 만들어보세요.</p>
              )}
            </div>
          </div>
        </PopoverPortal>
      )}
    </div>
  );
}

/* ================= StatusCell =================
   값 하나만 고를 수 있다는 점은 SELECT와 같지만(SelectCell 재사용 안 함),
   태그 배경색 대신 컬러 점 + 일반 텍스트로 보여주고, 팝오버 안에서 옵션이
   할 일/진행 중/완료 3그룹으로 나뉘어요 — 노션 STATUS의 특징이에요.
   그룹·옵션 구성은 헤더의 "옵션 관리"에서만 바꿀 수 있고, 이 셀에서는
   새 옵션을 만들지 않아요(상태값은 목록에서 고르기만 하는 게 자연스러워요). */

function StatusCell({ value, options, onChoose }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const current = options.find((o) => o.value === value);

  const choose = (v) => {
    onChoose(v);
    setIsOpen(false);
  };

  return (
    <div className="db-select-cell">
      <button
        ref={triggerRef}
        type="button"
        className={`db-select-cell__trigger ${!current ? "db-select-cell__trigger--empty" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
      >
        {current ? (
          <span className="db-status-value">
            <span className={`db-status-dot db-dot--${current.color}`} />
            <span>{current.value}</span>
          </span>
        ) : (
          <span className="db-select-cell__placeholder">비어 있음</span>
        )}
      </button>

      {isOpen && (
        <PopoverPortal anchorEl={triggerRef.current} onClose={() => setIsOpen(false)}>
          <div className="db-status-popover">
            {current && (
              <button type="button" className="db-select-cell-popover__clear" onClick={() => choose("")}>
                <X size={12} />
                <span>선택 해제</span>
              </button>
            )}

            {STATUS_GROUPS.map((group) => {
              // 다른 타입(SELECT 등)에서 STATUS로 바꿨을 때처럼 옵션에
              // group이 아예 없을 수도 있어요 — 그런 옵션은 "할 일"로 봐요.
              const groupOptions = options.filter((o) => (o.group || "TODO") === group.key);
              if (groupOptions.length === 0) return null;
              return (
                <div key={group.key} className="db-status-popover__group">
                  <p className="db-status-popover__group-label">{group.label}</p>
                  {groupOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="db-select-cell-popover__option"
                      onClick={() => choose(opt.value)}
                    >
                      <span className="db-status-value">
                        <span className={`db-status-dot db-dot--${opt.color}`} />
                        <span>{opt.value}</span>
                      </span>
                      {opt.value === value && <Check size={13} className="db-select-cell-popover__check" />}
                    </button>
                  ))}
                </div>
              );
            })}

            {options.length === 0 && (
              <p className="db-select-cell-popover__empty">등록된 상태가 없어요. 헤더의 옵션 관리에서 추가해보세요.</p>
            )}
          </div>
        </PopoverPortal>
      )}
    </div>
  );
}

/* ================= PersonCell =================
   담당자 지정 — 옵션을 직접 관리하지 않고, 지금 워크스페이스의 팀원
   목록(WorkspaceProvider의 members)을 그대로 선택지로 써요. 값은 이름 배열(여러 명 지정 가능)이에요. 아바타 색은 member.tone
   같은 값을 직접 두지 않고 getAvatarTone(member.id)로 계산해요(id가
   없는 경우, 즉 목록에 없는 이름이면 중립색인 gray로 빠져요). */

function PersonCell({ values, onToggle }) {
  const { members } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);

  return (
    <div className="db-select-cell">
      <button
        ref={triggerRef}
        type="button"
        className={`db-select-cell__trigger ${values.length === 0 ? "db-select-cell__trigger--empty" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
      >
        {values.length > 0 ? (
          <span className="db-person-chips">
            {values.map((name) => {
              const member = members.find((m) => m.name === name);
              return (
                <span key={name} className="db-person-chip">
                  <span className={`db-avatar db-avatar--${getAvatarTone(member?.id)}`}>
                    {member?.initial || name.slice(0, 1)}
                  </span>
                  <span>{name}</span>
                </span>
              );
            })}
          </span>
        ) : (
          <span className="db-select-cell__placeholder">비어 있음</span>
        )}
      </button>

      {isOpen && (
        <PopoverPortal anchorEl={triggerRef.current} onClose={() => setIsOpen(false)}>
          <div className="db-select-cell-popover">
            <div className="db-select-cell-popover__list">
              {members.map((m) => {
                const checked = values.includes(m.name);
                return (
                  <button
                    key={m.name}
                    type="button"
                    className="db-select-cell-popover__option"
                    onClick={() => onToggle(m.name)}
                  >
                    <span className="db-person-chip">
                      <span className={`db-avatar db-avatar--${getAvatarTone(m.id)}`}>{m.initial}</span>
                      <span>{m.name}</span>
                    </span>
                    {checked && <Check size={13} className="db-select-cell-popover__check" />}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverPortal>
      )}
    </div>
  );
}

/* ================= LinkCell =================
   URL·이메일·전화번호는 저장 방식(TEXT)은 같지만, 값이 있을 때 각각
   https://·mailto:·tel: 링크로 바로 열 수 있는 아이콘 버튼을 같이
   보여준다는 점이 공통이라 하나로 묶었어요. */

function LinkCell({ kind, value, onChange }) {
  const trimmed = (value || "").trim();

  const href = (() => {
    if (!trimmed) return null;
    if (kind === "EMAIL") return `mailto:${trimmed}`;
    if (kind === "PHONE") return `tel:${trimmed}`;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  })();

  const Icon = kind === "EMAIL" ? Mail : kind === "PHONE" ? Phone : Link;
  const placeholder = kind === "EMAIL" ? "이메일 주소" : kind === "PHONE" ? "전화번호" : "URL";
  const inputType = kind === "EMAIL" ? "email" : kind === "PHONE" ? "tel" : "url";

  return (
    <div className="db-link-cell">
      <input
        type={inputType}
        className="db-cell-input"
        value={value || ""}
        placeholder={placeholder}
        maxLength={200}
        onChange={(e) => onChange(e.target.value)}
      />
      {href && (
        <a
          className="db-link-cell__open"
          href={href}
          target={kind === "URL" ? "_blank" : undefined}
          rel={kind === "URL" ? "noreferrer" : undefined}
          title="열기"
        >
          <Icon size={12} />
        </a>
      )}
    </div>
  );
}

/* ================= CreatedTimeCell =================
   "생성 일시"는 사람이 직접 입력하지 않고, 이 행(=페이지)이 만들어진
   시점(page.createdAt)을 그대로 읽기만 하는 값이에요 — 노션의 생성
   일시 속성도 항상 읽기 전용이에요. */

function CreatedTimeCell({ iso }) {
  if (!iso) {
    return <span className="db-created-time-cell db-created-time-cell--empty">—</span>;
  }
  const formatted = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

  return <span className="db-created-time-cell">{formatted}</span>;
}
