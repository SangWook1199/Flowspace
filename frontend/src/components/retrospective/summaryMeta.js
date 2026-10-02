import { MessageSquare, CheckCircle2, ListTodo, Users } from "lucide-react";

// 회고 목록 위쪽 요약 카드의 모양(제목/단위/색/아이콘/보조 문구)이에요. 숫자는 목록 페이지가 서버 회고 목록에서 계산해요.
// (값을 직접 적어두면 회고가 늘거나 줄어도 "전체 회고 3개"가 그대로 남아서 목록과 어긋나요.)
export const retrospectiveSummary = [
  { key: "count", title: "전체 회고", unit: "개", color: "blue", icon: MessageSquare },
  { key: "avgCompletion", title: "평균 완료율", unit: "%", color: "green", icon: CheckCircle2, descTemplate: "지난 {count}개 Sprint 기준" },
  { key: "actionItems", title: "Action Item", unit: "개", color: "orange", icon: ListTodo, desc: "다음 Sprint로 이관 전" },
  { key: "participants", title: "참여자", unit: "명", color: "sky", icon: Users, desc: "활동 참여 인원" },
];
