import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";

import FloatingPanel from "./FloatingPanel";

const MENU_WIDTH = 190;
const SUBMENU_WIDTH = 190;

// 카드의 "..." 버튼을 눌렀을 때 뜨는 메뉴예요. 마우스로 끌지 않고도 카드를 옮길 수 있어요.
//  - 업무 항목 이동: 이 컬럼 안에서 맨 위 / 위 / 아래 / 맨 아래로
//  - 상태 변경: 다른 컬럼으로(그 컬럼의 맨 아래에 들어가요)
// isFirst/isLast는 화면에 보이는 카드 기준이에요(필터를 걸었으면 보이는 카드끼리의 순서예요).
export default function TaskCardMenu({ anchor, statuses = [], currentStatusId, isFirst, isLast, onMove, onChangeStatus, onClose }) {
  const [sub, setSub] = useState(null); // "move" | "status"

  // 오른쪽에 하위 메뉴가 들어갈 자리가 없으면 왼쪽으로 펼쳐요.
  const rect = anchor?.getBoundingClientRect();
  const openLeft = rect ? Math.min(rect.right, window.innerWidth - MENU_WIDTH - 8) + MENU_WIDTH + SUBMENU_WIDTH + 8 > window.innerWidth : false;

  const run = (fn) => () => {
    fn();
    onClose();
  };

  const moveItems = [
    { kind: "top", label: "맨 위로 이동", disabled: isFirst },
    { kind: "up", label: "위로 이동", disabled: isFirst },
    { kind: "down", label: "아래로 이동", disabled: isLast },
    { kind: "bottom", label: "맨 아래로 이동", disabled: isLast },
  ];

  return (
    <FloatingPanel anchor={anchor} onClose={onClose} width={MENU_WIDTH} className="cardMenuPanel" label="작업 메뉴">
      <div role="menu" className="cardMenuList">
        <div className="cardMenuEntry" onMouseEnter={() => setSub("move")}>
          <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={sub === "move"} onClick={() => setSub("move")}>
            업무 항목 이동
            <ChevronRight size={15} />
          </button>
          {sub === "move" && (
            <div role="menu" className={`cardSubMenu${openLeft ? " is-left" : ""}`} style={{ width: SUBMENU_WIDTH }}>
              {moveItems.map((item) => (
                <button key={item.kind} type="button" role="menuitem" disabled={item.disabled} onClick={run(() => onMove?.(item.kind))}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="cardMenuEntry" onMouseEnter={() => setSub("status")}>
          <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={sub === "status"} onClick={() => setSub("status")}>
            상태 변경
            <ChevronRight size={15} />
          </button>
          {sub === "status" && (
            <div role="menu" className={`cardSubMenu${openLeft ? " is-left" : ""}`} style={{ width: SUBMENU_WIDTH }}>
              {statuses.map((status) => {
                const current = status.id === currentStatusId;
                return (
                  <button
                    key={status.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={current}
                    disabled={current}
                    onClick={run(() => onChangeStatus?.(status.id))}
                  >
                    <i className={`columnDot ${(status.color ?? "").toLowerCase()}`} />
                    <span>{status.name}</span>
                    {current && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </FloatingPanel>
  );
}
