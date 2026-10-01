// 칸반 드래그(카드/컬럼)가 dataTransfer에 담는 전용 MIME이에요. Firefox는 데이터가 하나도 없으면
// 드래그를 시작하지 않아서 dragstart에서 꼭 setData를 불러줘야 해요.
export const KANBAN_DRAG_MIME = "application/x-flowspace-kanban";
