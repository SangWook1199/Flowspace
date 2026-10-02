import { Fragment, useMemo } from "react";
import { splitMentions } from "../../utils/mention";
import "../../styles/mention.css";

// 댓글 본문을 보여줘요: "@[이름](id)"는 강조 표시(@이름)로, 나머지는 그대로예요.
// members를 주면 멤버 목록의 최신 이름으로 보여주고(이름을 바꿨어도 맞게), 나를 멘션한 건 더 진하게 표시해요.
export default function MentionText({ text, members = [], meId = null }) {
  const parts = useMemo(() => splitMentions(text), [text]);

  return parts.map((part, index) => {
    if (part.type === "text") return <Fragment key={index}>{part.value}</Fragment>;

    const live = members.find((m) => m.id === part.id)?.name;

    return (
      <span key={index} className={`mention${part.id === meId ? " mention--me" : ""}`}>
        @{live ?? part.name}
      </span>
    );
  });
}
