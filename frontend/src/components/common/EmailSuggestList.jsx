import { useState } from "react";
import { ArrowUpLeft, UserPlus } from "lucide-react";
import { getAvatarTone } from "../../utils/avatarColor";
import "../../styles/email-suggest.css";

// 이메일 입력칸 아래에 뜨는 추천 목록이에요(useEmailSuggest와 같이 써요).
//  - 메일 주소 추천을 누르면 그 주소가 입력칸에 채워지고(onPick), 가입자 카드를 누르면 바로 초대/추가돼요(onPick).
//  - 이미 멤버이거나 이미 초대한 사람, 나 자신은 누를 수 없게 이유만 보여줘요.
// inline: 입력칸 아래에 공간을 차지하며 펼쳐져요(모달처럼 겹쳐 뜨면 잘릴 수 있는 곳에서 써요).
const STATUS_LABEL = {
  AVAILABLE: "초대",
  MEMBER: "이미 멤버예요",
  INVITED: "이미 초대했어요",
  SELF: "나",
};

function UserAvatar({ user }) {
  const [failed, setFailed] = useState(false);
  const showImage = user.profileImageUrl && !failed;

  return (
    <span className={`avatar ${getAvatarTone(user.id)} emailSuggest__avatar`}>
      {showImage ? <img src={user.profileImageUrl} alt="" onError={() => setFailed(true)} /> : user.initial}
    </span>
  );
}

export default function EmailSuggestList({ suggest, onPick, inline = false }) {
  if (!suggest.visible) return null;

  const hasUser = suggest.items.some((item) => item.kind === "user");
  const hasDomain = suggest.items.some((item) => item.kind === "domain");

  const renderItem = (item, index) => {
    const active = index === suggest.activeIndex;

    if (item.kind === "user") {
      const { user } = item;
      const disabled = user.status !== "AVAILABLE";

      return (
        <button
          key={item.key}
          type="button"
          role="option"
          aria-selected={active}
          aria-disabled={disabled || undefined}
          className={`emailSuggest__user${active ? " is-active" : ""}${disabled ? " is-disabled" : ""}`}
          onMouseEnter={() => suggest.setActiveIndex(index)}
          onClick={() => !disabled && onPick(item)}
        >
          <UserAvatar user={user} />
          <span className="emailSuggest__userText">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </span>
          <span className={`emailSuggest__badge${disabled ? "" : " is-available"}`}>{STATUS_LABEL[user.status]}</span>
        </button>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        role="option"
        aria-selected={active}
        className={`emailSuggest__domain${active ? " is-active" : ""}`}
        onMouseEnter={() => suggest.setActiveIndex(index)}
        onClick={() => onPick(item)}
      >
        <UserPlus size={17} />
        <span>{item.email}</span>
        <ArrowUpLeft size={15} />
      </button>
    );
  };

  // items는 사용자 카드가 먼저, 메일 주소 추천이 그 뒤예요(index는 전체 목록 기준이라 키보드 이동과 맞아요).
  const indexed = suggest.items.map((item, index) => ({ item, index }));

  return (
    // 목록을 눌러도 입력칸의 포커스가 빠지지 않게(빠지면 목록이 사라져서 클릭이 안 먹어요) 마우스 눌림을 막아요.
    <div className={`emailSuggest${inline ? " emailSuggest--inline" : ""}`} role="listbox" onMouseDown={(e) => e.preventDefault()}>
      {hasUser && (
        <>
          <p className="emailSuggest__title">가입한 사용자</p>
          {indexed.filter(({ item }) => item.kind === "user").map(({ item, index }) => renderItem(item, index))}
        </>
      )}

      {hasDomain && (
        <>
          <p className="emailSuggest__title">초대하려면 이메일을 입력하세요.</p>
          {indexed.filter(({ item }) => item.kind === "domain").map(({ item, index }) => renderItem(item, index))}
        </>
      )}
    </div>
  );
}
