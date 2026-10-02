import { Bell, ClipboardCheck, Clock3, Flag, ListChecks, LogOut, Mail, MessageSquare, Target, UserPlus, Users, X } from "lucide-react";

// 알림 종류마다 아이콘과 색 톤을 달리해서 한눈에 구분되게 해요.
const TYPE_STYLE = {
  WORKSPACE_INVITE: { Icon: Mail, tone: "blue" },
  INVITE_ACCEPTED: { Icon: UserPlus, tone: "green" },
  INVITE_DECLINED: { Icon: X, tone: "gray" },
  MEMBER_LEFT: { Icon: LogOut, tone: "gray" },
  MEMBER_REMOVED: { Icon: LogOut, tone: "red" },
  OWNERSHIP_TRANSFERRED: { Icon: Users, tone: "purple" },
  TASK_ASSIGNED: { Icon: ClipboardCheck, tone: "blue" },
  TASK_STATUS_CHANGED: { Icon: ListChecks, tone: "green" },
  TASK_DUE_SOON: { Icon: Clock3, tone: "orange" },
  COMMENT_CREATED: { Icon: MessageSquare, tone: "purple" },
  COMMENT_MENTION: { Icon: MessageSquare, tone: "purple" },
  SPRINT_STARTED: { Icon: Target, tone: "blue" },
  SPRINT_COMPLETED: { Icon: Flag, tone: "green" },
};

export default function NotificationIcon({ type }) {
  const { Icon, tone } = TYPE_STYLE[type] ?? { Icon: Bell, tone: "gray" };

  return (
    <span className={`notiIcon notiIcon--${tone}`} aria-hidden="true">
      <Icon size={16} />
    </span>
  );
}
