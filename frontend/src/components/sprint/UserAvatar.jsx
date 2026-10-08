import { useState } from "react";
import { User } from "lucide-react";
import { getInitial } from "../../utils/initial";
import styles from "./TaskWorkspace.module.css";

// 담당자 동그라미 아바타예요. 프로필 사진이 있으면 사진을, 없거나 깨지면 이름 첫 글자를 보여줘요.
export default function UserAvatar({ user, className = "" }) {
  const [failed, setFailed] = useState(false);
  const showImage = user?.profileImageUrl && !failed;

  return (
    <span className={`${styles.avatar} ${className}`} title={user?.name}>
      {showImage ? <img src={user.profileImageUrl} alt="" onError={() => setFailed(true)} /> : (user?.initial ?? getInitial(user?.name))}
    </span>
  );
}

// 담당자가 아직 없을 때 보여주는 빈 아바타예요(점선 동그라미 + 사람 아이콘).
export function UnassignedAvatar({ className = "" }) {
  return (
    <span className={`${styles.avatar} ${styles.avatarEmpty} ${className}`} title="담당자 없음">
      <User size={13} />
    </span>
  );
}
