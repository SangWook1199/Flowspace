import { useCallback, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import UserAvatar from "./UserAvatar";
import useDismiss from "./useDismiss";
import styles from "./TaskWorkspace.module.css";

// 담당자를 여러 명 고르는 상자예요. 고른 사람은 칩으로 보이고(× 로 빼요), "추가"를 누르면 멤버 목록이 떠요.
// members: 워크스페이스 멤버 [{id, name, ...}], value: 지금 담당자 목록, onChange(새 담당자 목록)
export default function AssigneePicker({ members = [], value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, wrapRef, close);

  const selectedIds = new Set(value.map((user) => user.id));

  const toggle = (member) => {
    onChange(selectedIds.has(member.id) ? value.filter((user) => user.id !== member.id) : [...value, member]);
  };

  return (
    <div className={styles.assigneeBox} ref={wrapRef}>
      <div className={styles.assigneeChips}>
        {value.map((user) => (
          <span className={styles.assigneeChip} key={user.id}>
            <UserAvatar user={user} />
            {user.name}
            <button type="button" aria-label={`${user.name} 빼기`} onClick={() => toggle(user)}>
              <X size={12} />
            </button>
          </span>
        ))}

        <button
          type="button"
          className={styles.assigneeAdd}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((prev) => !prev)}
        >
          <Plus size={13} /> {value.length === 0 ? "담당자 선택" : "추가"}
        </button>
      </div>

      {open && (
        <ul className={styles.pickerMenu} role="listbox" aria-multiselectable="true" aria-label="담당자 목록">
          {members.length === 0 && <li className={styles.pickerEmpty}>선택할 멤버가 없어요.</li>}
          {members.map((member) => {
            const picked = selectedIds.has(member.id);
            return (
              <li key={member.id} role="option" aria-selected={picked}>
                <button type="button" onClick={() => toggle(member)}>
                  <UserAvatar user={member} />
                  <span className={styles.pickerName}>{member.name}</span>
                  {picked && <Check size={15} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
