import { memo, useContext, useRef, useState } from "react";
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  Type,
  Trash2,
  Image as ImageIcon,
  Paperclip,
  Pause,
  RefreshCw,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Palette,
  Baseline,
  Check,
  Copy,
} from "lucide-react";
import DatabaseBlock from "./DatabaseBlock";
import SimpleTableBlock from "./SimpleTableBlock";
import PopoverPortal from "./PopoverPortal";
import CodeEditor from "./CodeEditor";
import RichTextInput from "./RichTextInput";
import SlashMenu from "./blocks/SlashMenu";
import { TaskEmbed, EventEmbed, SprintEmbed, PageLinkBlock } from "./blocks/EmbedBlocks";
import { BlockImage, BlockFile } from "./blocks/MediaBlocks";
import { BLOCK_COLORS, BLOCK_TEXT_COLORS, CALLOUT_ICON_PRESETS, placeholderFor } from "./lib/blockTypes.js";
import { formatListNumber } from "./lib/blockTree.js";
import { CURRENT_USER_NAME, formatCommentTime } from "./lib/comments.js";
import { useAuth } from "../../context/useAuth";
import WorkspaceContext from "../../context/WorkspaceContext";
import MentionInput from "../common/MentionInput";
import MentionText from "../common/MentionText";
import { useMemberProfile } from "../../context/MemberProfileContext";
import { getAvatarTone } from "../../utils/avatarColor.js";

/* ================= BlockRow ================= */

function BlockRowImpl({
  block,
  indentBase = 0,
  number,
  isFirst,
  isLast,
  isFocused,
  remoteEditors = null,
  isDragging = false,
  isSelected = false,
  isGroupHighlighted = false,
  blendTop = false,
  blendBottom = false,
  pageLink,
  pages,
  onCreateChildPage,
  blockTypeOptions,
  isSlashOpen,
  slashQuery,
  slashIndex,
  onSlashHover,
  isMoreOpen,
  moreMode,
  onChange,
  onKeyDown,
  onPasteImage,
  onFocus,
  onBlur,
  onToggleCheck,
  onToggleCollapse,
  onSetCalloutIcon,
  onSetLanguage,
  onImageSelect,
  onImageUrlEmbed,
  onImageResize,
  onDatabaseChange,
  onRenameRowPage,
  onDeleteRowPage,
  sprintTasks,
  onToggleSubtask,
  onTaskChange,
  onEventChange,
  onSprintChange,
  onResetEmbed,
  onConvert,
  onSwapFileType,
  onSetColor,
  onSetTextColor,
  onAddBelow,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onToggleMore,
  isBulkMenuAnchor = false,
  bulkMenuMode = "main",
  bulkSelectedCount = 0,
  onBulkOpenColorView,
  onBulkOpenTextColorView,
  onBulkOpenConvertView,
  onBulkOpenMainView,
  onBulkCloseMenu,
  onBulkSetColor,
  onBulkSetTextColor,
  onBulkConvert,
  onBulkDuplicate,
  onBulkDelete,
  onOpenConvertView,
  onOpenColorView,
  onOpenTextColorView,
  onOpenMainView,
  onCloseMore,
  isCommentsOpen,
  onToggleComments,
  onOpenComments,
  onCloseComments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onDragHandleStart,
  onRowDragOver,
  onDragHandleEnd,
  registerRef,
}) {
  // 요청: "블록 종류가 노션보다 적어요"(콜아웃) — 콜아웃 왼쪽의 이모지
  // 아이콘을 누르면 뜨는 작은 프리셋 피커의 열림 상태예요. 댓글 패널의
  // ⋯ 메뉴처럼 이 블록 하나에만 속한 UI 상태라 BlockRow 로컬에 둬요.
  const [calloutPickerOpen, setCalloutPickerOpen] = useState(false);
  const calloutIconRef = useRef(null);

  // 댓글에 "본인" 표시(수정·삭제 메뉴)를 하려고 로그인한 사람을 알아야 해요.
  const me = useAuth()?.user ?? null;
  const openMemberProfile = useMemberProfile();
  const myName = me?.nickname || CURRENT_USER_NAME;
  // 댓글에서 @로 멘션할 수 있는 워크스페이스 멤버들(알림은 서버가 보내요)
  const workspaceMembers = useContext(WorkspaceContext)?.members ?? [];

  const [commentDraft, setCommentDraft] = useState("");
  // 댓글별 ⋯ 메뉴(수정/삭제)가 열려있는 댓글 id, 지금 수정 중인 댓글
  // id(있으면 목록 대신 입력창을 보여줘요)와 그 입력값을 따로 들고
  // 있어요. commentMenuTriggerRefs는 댓글마다 ⋯ 트리거가 따로 있어서
  // PopoverPortal의 anchorEl로 쓸 DOM 노드를 댓글 id별로 기억해둬야
  // 해요 — 이 메뉴도 댓글 패널(PopoverPortal) 안에서 또 PopoverPortal로
  // 띄우는 중첩 팝오버인데, PopoverPortal.jsx에 중첩 지원(위 주석
  // 참고)을 추가해서 노션처럼 카드 밖으로 자연스럽게 넘쳐 뜰 수 있어요.
  const [openCommentMenuId, setOpenCommentMenuId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const commentMenuTriggerRefs = useRef({});

  // 하위 페이지 링크 블록(block.pageId가 있는 TEXT 블록 — 위 BLOCK_TYPES
  // 주석 참고)은 그냥 다른 페이지로 가는 링크일 뿐 실제 "내용"이 아니라서
  // 댓글을 달 수 있는 게 어색해요(요청: 페이지에는 댓글이 달리면 안 될
  // 것 같다). 그래서 이 블록에서만 댓글 기능(메뉴 항목·배지·밑줄·패널)을
  // 통째로 꺼요.
  const isPageLink = !!block.pageId;
  // 요청: 댓글이 달린 블록에 노션처럼 밑줄을 줘서 "여기 댓글 있음"을
  // 표시하되, 브라우저 기본 맞춤법 검사 밑줄(빨간 물결선)과는 다른
  // 색으로 — 빨간 물결선은 오타처럼 보인다는 피드백이 있었어요. 아예
  // 헷갈릴 일이 없게 이 입력들은 spellCheck도 꺼요(위 input/textarea).
  const hasComments = !isPageLink && (block.comments?.length ?? 0) > 0;
  const checkedClass = block.type === "TODO" && block.checked ? "checked" : "";
  // IMAGE도 표/태스크·이벤트·스프린트 카드처럼 키가 큰 블록이라
  // 여기 넣었어요 — 안 넣으면 핸들이 이미지 세로 중앙에서 열려서
  // (.block-left-actions 기본값) 그 아래 ⋯ 메뉴가 이미지 밑의
  // 파일명/변경 버튼 위에 겹쳐 보이던 문제가 있었어요.
  const isEmbed =
    block.type === "DATABASE" ||
    block.type === "TASK" ||
    block.type === "EVENT" ||
    block.type === "SPRINT" ||
    block.type === "IMAGE";
  // 요청: 배경색이 핸들 자리(.block-row의 -52px 왼쪽 확장 영역, 위
  // .block-row 주석의 hit-box 설명 참고)까지 침범하면 안 되고 실제
  // 블록 내용에만 칠해져야 해요. 처음엔 .block-row에 직접 칠했는데,
  // .block-row 자체가 호버 판정을 넓히려고 이미 왼쪽으로 52px 더
  // 파고들어 있는 박스라서, 거기에 배경을 칠하면 핸들이 뜨는 자리까지
  // 같이 색칠됐어요. 그래서 인라인 style을 .block-row가 아니라
  // .block-body(패딩 안쪽의 실제 내용 영역)에 줘요 — 인라인 스타일은
  // 항상 클래스 기반 규칙보다 우선이라, 색이 있는 블록은 호버
  // 하이라이트보다 자기 색이 계속 보여요(핸들 아이콘이 보라색으로
  // 바뀌는 건 배경이 아니라 아이콘 자체 색만 바뀌는 별개 규칙
  // (.block-drag-handle.active)이라 메뉴가 열려 있다는 신호는 그대로
  // 남아요). 메뉴가 열렸을 때의 라일락 강조도 원래 .block-row.menu-open
  // 에 직접 칠해서 똑같이 핸들까지 침범했는데, 바로 아래에서 이
  // colorInfo와 같은 파이프라인(bodyStyle)에 합쳐서 똑같이 고쳤어요.
  const colorInfo = block.color ? BLOCK_COLORS.find((c) => c.key === block.color) : null;
  // 요청: "모든 블럭들이 핸들 버튼을 누르면 핸들버튼까지 색이 변해 —
  // 블록 내용 부분만 색이 변하게 해줘" — 메뉴가 열렸을 때
  // (.block-row.menu-open)의 라일락 강조(#f0efff)도 예전엔 .block-row에
  // 직접 칠해서, 커스텀 배경색과 똑같은 이유(-52px 핸들 자리까지 넓힌
  // hit-box)로 핸들까지 물들었어요. 그래서 이 강조도 커스텀 배경색과
  // 완전히 같은 파이프라인(아래 bodyStyle)을 타게 해서 .block-body/카드
  // 쪽에만 칠해요. 커스텀 배경색이 있으면 항상 그 색이 우선이고(메뉴를
  // 열어도 자기 색 유지), 없을 때만 메뉴가 열린 동안 이 강조색을 대신
  // 써요 — 아래에서 이 둘을 하나로 합쳐요.
  // 요청: "덩어리가 되면 핸들 버튼을 누를 때 덩어리 전체가 색이 변하면
  // 좋을 듯" — 자식이 있는 블록의 핸들(⋯)을 눌러 메뉴를 열면, 그 메뉴가
  // 실제로 적용되는 범위(이동/삭제/색이 자식까지 같이 바뀌는 것과 같은
  // 범위)를 눈으로도 알 수 있게 자식들까지 같이 강조돼요 —
  // isGroupHighlighted는 BlockEditor가 blockMenu.blockId의 자식
  // 범위(getSubtreeRange)에 든 블록에 내려줘요(자기 자신은 isMoreOpen이
  // 이미 처리).
  const menuOpenHighlight = isMoreOpen || isGroupHighlighted ? "#f0efff" : null;
  // block.type === 'DATABASE'는 두 가지 다른 화면을 가리켜요 — 표(단순
  // 그리드, block.database.kind === 'TABLE', SimpleTableBlock) vs
  // 데이터베이스(보드/카드형, kind가 그 외 값, DatabaseBlock). 색 기능은
  // 이 둘을 다르게 취급해야 해서 미리 나눠둬요.
  const isTable = block.type === "DATABASE" && block.database?.kind === "TABLE";
  const isBoardDatabase = block.type === "DATABASE" && block.database?.kind !== "TABLE";
  // 요청: "태스크나 스프린트나 표나 데이터베이스는 배경색을 바꿔도 겉에
  // 블럭의 색이 바뀌는데, 실제 안에 블럭의 배경색이 바뀌어야지" — 이
  // 타입들은 자기 자신이 이미 흰 배경 카드예요(.embed-task-card,
  // .embed-event-card, .embed-sprint-card, .db-block-wrap 전부
  // background:#fff + border-radius:10 고정). .block-body에 배경을
  // 칠하면 카드 바깥의 얇은 padding(6px/2px) 여백만 물들고, 정작 눈에
  // 보이는 카드 몸통은 계속 하얗게 남아서 "겉만 색이 바뀐" 것처럼
  // 보였어요. 그래서 이 타입들은 .block-body에 직접 칠하는 대신 CSS
  // 변수(--block-bg)로 색만 내려보내고, 카드 쪽 CSS에서
  // background: var(--block-bg, #fff)로 받아쓰게 해서 카드 자체의
  // 배경이 바뀌게 했어요(표는 .db-table thead th/.db-row:hover도 같은
  // 변수를 읽어서 헤더·호버 행까지 같이 물들어요). 이미지(IMAGE)는
  // 카드가 아니라 이미지/업로드 영역 자체라 기존처럼 .block-body에
  // 바로 칠해요.
  const isCardEmbed =
    block.type === "DATABASE" ||
    block.type === "TASK" ||
    block.type === "EVENT" ||
    block.type === "SPRINT";
  // 요청: "데이터베이스는 배경색과 font색 둘 다 없어야 해" — 보드형
  // 데이터베이스(표가 아닌 kind)는 색 기능 자체를 꺼요. 메뉴에서도
  // 숨기고(아래 canColorBackground), 혹시 예전에 저장된 block.color가
  // 남아 있어도 여기서 걸러서 실제로 칠해지지 않게 해요.
  const canColorBackground = !isBoardDatabase && block.type !== "CODE";
  // 글자색은 실제로 글자(.block-input)가 있는 블록에서만 의미가 있어요
  // — 태스크/이벤트/스프린트/이미지·파일·하위 페이지 링크·보드형
  // 데이터베이스는 전부 자기만의 커스텀 렌더링이라 "글자"라 부를 만한
  // 입력창이 없어요(눌러도 눈에 보이는 변화가 없는 죽은 옵션이 되니
  // 메뉴에서부터 숨겨요). 표(isTable)는 예외 — 열 제목(.db-table__head
  // -input)·셀(.db-cell-input) 둘 다 실제 텍스트라 글자색이 의미
  // 있어서 여기만 따로 허용해요.
  const canColorText = (!isPageLink && !isEmbed && block.type !== "FILE" && block.type !== "CODE") || isTable;
  const textColorInfo = block.textColor
    ? BLOCK_TEXT_COLORS.find((c) => c.key === block.textColor)
    : null;
  // 요청: "블록 중첩/들여쓰기" — 들여쓰기 단수. bodyStyle(배경색 들여쓰기
  // 상쇄)과 아래 rowStyle(줄 자체를 밀기) 둘 다 이 값이 필요해서 위로
  // 옮겨왔어요.
  // indentBase: 이 줄이 콜아웃/인용 박스 안에 있으면 그 박스 기준의 들여쓰기를
  // 상대값으로 계산해요(박스 밖에선 0이라 예전과 같아요).
  const indentLevel = Math.max(0, (block.indent || 0) - indentBase);
  // 실제로 칠할 배경색 — 커스텀 배경색(colorInfo)이 있으면 그게
  // 우선이고, 없을 때만 메뉴가 열려있는 동안 위 menuOpenHighlight로
  // 대체돼요. canColorBackground가 false인 보드형 데이터베이스는
  // 커스텀 색은 절대 못 쓰지만, "메뉴 열림" 강조 자체는 다른 블록과
  // 동일하게 계속 보여야 해서(그냥 UI 신호일 뿐 저장되는 값이
  // 아니에요) 별도로 menuOpenHighlight만 남겨둬요.
  // 콜아웃은 박스(.block-container--callout, BlockEditor의 renderRange)가 자식들과
  // 함께 배경을 칠하니, 제목 줄(.block-body)에는 배경을 따로 안 칠해요.
  const effectiveBg =
    block.type === "CALLOUT" ? null : (canColorBackground && colorInfo?.bg) || menuOpenHighlight;
  // 배경색(--block-bg 또는 직접 backgroundColor)과, 표에 한해서만
  // 글자색(--block-text)까지 하나의 style 객체로 합쳐서 .block-body에
  // 줘요 — 표는 .db-table__head-input/.db-cell-input 쪽 CSS가
  // var(--block-text, ...)로 이 값을 읽어서 적용해요(배경과 같은
  // 패턴). 일반 텍스트 블록은 아래 block-input에 style로 직접 색을
  // 줘서 이 변수가 따로 필요 없어요.
  // 요청: "첫번째(노션)처럼 블록 전체가 색이 변하면 좋을듯" — 스크린샷
  // 비교: 노션은 같은 색으로 칠해진 인접한 블록들이 하나로 이어진
  // 덩어리처럼 보이는데, 예전엔 블록마다 독립적으로 둥근 모서리를 줘서
  // 줄마다 떨어진 카드처럼 보였어요. 바로 위/아래 블록도 (같은 색이든,
  // 나처럼 메뉴 열림 강조든) 같은 이유로 칠해져 있으면(blendTop/
  // blendBottom, BlockEditor의 rowPaintKeys가 계산해서 내려줘요) 그
  // 경계 쪽 모서리를 각지게 만들어서 이어붙여요 — 카드형 임베드
  // (isCardEmbed)는 색을 .block-body가 아니라 카드 자체에 --block-bg로
  // 칠해서 이 처리 대상이 아니에요.
  const borderRadiusValue = `${blendTop ? 0 : 6}px ${blendTop ? 0 : 6}px ${blendBottom ? 0 : 6}px ${blendBottom ? 0 : 6}px`;
  // 요청: "우리는 블록블록 따로인거 같잖아... 덩어리처럼 색이 변하고
  // 싶어" — 노션을 다시 살펴보니, 들여쓰기된 블록이라도 "배경색이
  // 칠해지는 영역"은 들여쓰기를 안 따라가고 항상 페이지 왼쪽(=맨 위
  // 단 블록의 시작 위치)부터 시작해요. 오직 "글자"만 그 영역 안에서
  // 들여쓰기만큼 더 들어가 있을 뿐이에요 — 그래서 서로 다른 깊이의
  // 형제·자식 블록이 같은 색이면 왼쪽 끝이 다 같은 자리에서 시작해서
  // 하나의 네모난 덩어리로 보여요.
  //
  // 지금까지는 들여쓰기를 .block-row 전체(핸들+본문)를 오른쪽으로
  // margin-left로 미는 방식으로 구현해서(위 rowStyle/indentLevel 주석
  // 참고), 색을 .block-body에 칠하면 그 색칠 영역까지 같이 밀려서
  // 계단처럼 끊겨 보였어요(줄마다 왼쪽 시작점이 달라짐). 그래서 색이
  // 실제로 칠해질 때만(effectiveBg가 있을 때만) .block-body에
  // marginLeft: -(들여쓰기만큼)을 줘서 그 민 만큼을 다시 상쇄하고,
  // 대신 그만큼을 paddingLeft에 얹어서 안쪽 글자는 원래 있던 자리에
  // 그대로 보이게 해요(박스만 왼쪽으로 늘어나 맨 위 단과 시작점이
  // 같아지고, 글자 위치는 안 변함). flex:1인 .block-body가 이 줄에서
  // 사실상 유일한 flex 항목이라, 음수 margin-left는 flexbox 규칙상
  // 박스의 실제 너비도 그만큼 늘려줘서(왼쪽 끝만 당겨지고 오른쪽 끝은
  // 그대로) 오른쪽 경계는 안 흔들려요. 색이 없을 땐(effectiveBg가
  // 없을 땐) 전혀 손대지 않아서 평소 들여쓰기 자리는 그대로예요.
  const colorIndentOffset =
    effectiveBg && !isCardEmbed && indentLevel > 0 ? indentLevel * 24 : 0;
  const bodyStyle = {
    ...(effectiveBg
      ? isCardEmbed
        ? { "--block-bg": effectiveBg }
        : {
            backgroundColor: effectiveBg,
            borderRadius: borderRadiusValue,
            ...(colorIndentOffset
              ? {
                  marginLeft: `${-colorIndentOffset}px`,
                  paddingLeft: `calc(2px + ${colorIndentOffset}px)`,
                }
              : {}),
          }
      : {}),
    ...(canColorText && isTable && textColorInfo ? { "--block-text": textColorInfo.color } : {}),
  };
  const hasBodyStyle = Object.keys(bodyStyle).length > 0;
  const rowRef = useRef(null);
  // TASK/EVENT/SPRINT 블록이 실제 데이터에 연결돼 있으면(아직 선택 전인
  // 빈 피커 상태가 아니면) 핸들에 작은 초록 점을 같이 보여줘요 — "살아있는
  // 블록"이라는 FlowSpace만의 개념을 핸들 자리에서부터 드러내는 신호예요.
  const isLive =
    (block.type === "TASK" && !!block.taskId) ||
    (block.type === "EVENT" && !!block.eventId) ||
    (block.type === "SPRINT" && !!block.sprintId);
  // 핸들을 클릭해서 메뉴로 수정 중이거나(isMoreOpen), 잡고 끌어서
  // 위치를 옮기는 중이면(isDragging) 핸들 색을 꽉 채워서 "지금 이
  // 핸들이 뭔가를 하고 있다"는 게 호버 여부와 상관없이 계속 보이게
  // 해요.
  const isHandleActive = isMoreOpen || isDragging;
  // ⋯ 메뉴(block-menu)를 여는 트리거 — PopoverPortal의 anchorEl로 써서,
  // 메뉴를 이 .block-row 안이 아니라 document.body로 포털링해요. 예전
  // 방식(position:absolute; top:30px, .block-left-actions 기준)은 이
  // 블록 바로 다음에 오는 블록(예: 하위 페이지 제목·링크)과 화면상 같은
  // 자리에 그려져서, 뒤 블록의 텍스트가 메뉴 위로 겹쳐 보이는 문제가
  // 있었어요 — DatabaseBlock/SimpleTableBlock의 행 메뉴에서 이미 같은
  // 문제를 PopoverPortal로 풀었던 것과 똑같은 원인이라 같은 방법으로
  // 고쳤어요.
  const moreTriggerRef = useRef(null);
  // 댓글 패널의 anchor — moreTriggerRef(왼쪽 핸들) 대신 이걸 써요.
  // 요청: "댓글이 블록의 중앙에서 나타났으면" — 핸들은 블록 왼쪽 바깥
  // 여백에 있어서 그 기준으로 열면 패널도 왼쪽으로 쏠려 보이는데,
  // bodyRef(.block-body, 실제 블록 내용 영역)의 가로 중심을 기준으로
  // 열면(PopoverPortal의 align="center") 블록 내용 자체의 가운데에서
  // 뜨는 느낌이 나요.
  const bodyRef = useRef(null);

  // 요청: "블록 중첩/들여쓰기" — .block-row는 원래 호버 hit-box를
  // 넓히려고 margin-left: -52px(핸들이 앉을 자리)를 CSS에서 고정으로
  // 줘요(page-detail.css의 .block-row 주석 참고). 들여쓰기는 이 줄
  // 전체(핸들 + 본문)를 오른쪽으로 24px×단수만큼 밀어야 해서, 그 -52px
  // 기준값에 들여쓰기만큼을 더한 값을 인라인 style로 덮어써요 — 핸들이
  // .block-left-actions(left:0, 즉 이 줄의 왼쪽 끝)에 있어서 줄 자체가
  // 밀리면 핸들도 같이 밀리고, 본문(.block-body)은 이 줄 안에서 여전히
  // padding-left:52px 뒤에 있어서 핸들과의 간격은 항상 그대로예요.
  // indent가 0이면 아예 style을 안 줘서 CSS의 기본값(-52px)을 그대로
  // 쓰게 둬요. (indentLevel 자체는 위 bodyStyle에서도 필요해서 그쪽으로
  // 옮겨 선언했어요.)
  // 요청: "블록 전체가 색이 변하면" — .block-row 자체의 위/아래
  // padding(1px씩, 위 .block-row 주석 참고)이 인접한 두 줄의 색칠된
  // .block-body 사이에 틈을 남겨서, bodyStyle의 모서리 각지게 만들기
  // (borderRadiusValue)만으론 완전히 안 이어져 보였어요. blendTop/
  // blendBottom일 때 그 쪽 padding을 0으로 없애서 진짜로 맞닿게 해요.
  const rowStyle = {
    ...(indentLevel ? { marginLeft: `${-52 + indentLevel * 24}px` } : {}),
    ...(blendTop ? { paddingTop: 0 } : {}),
    ...(blendBottom ? { paddingBottom: 0 } : {}),
  };
  const hasRowStyle = Object.keys(rowStyle).length > 0;

  return (
    <div
      ref={rowRef}
      data-block-id={block.id}
      className={`block-row block-${(block.type || "TEXT").toLowerCase()} ${isMoreOpen ? "menu-open" : ""} ${
        isEmbed ? "block-row--embed" : ""
      } ${isDragging ? "dragging" : ""}${remoteEditors ? ` has-remote-editor remote-tone-${getAvatarTone(remoteEditors[0].userId)}` : ""}`}
      style={hasRowStyle ? rowStyle : undefined}
      onDragEnter={(e) => e.preventDefault()}
      onDragOver={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientY - rect.top) / rect.height;
        const isAfter = ratio >= 2 / 3;
        // 요청: "덩어리 아래로 옮기는 경우 합류할 수도 있고 아닐 수도
        // 있게" — 이 블록 "아래"(isAfter)에 놓일 때만 의미가 있어요.
        // rect.left + 52(.block-row의 padding-left, 위 indentLevel 주석
        // 참고)가 이 줄의 실제 내용이 시작하는 자리라, 거기서 한 단
        // 더(24px) 오른쪽에 커서가 있으면 "이 블록의 자식으로 합류"로
        // 봐요.
        const contentStartX = rect.left + 52;
        const wantsNested = isAfter && e.clientX >= contentStartX + 24;
        onRowDragOver?.(isAfter, wantsNested);
      }}
      onDrop={(e) => e.preventDefault()}
    >
      {/* 다른 멤버가 이 블록을 편집 중이면 그 사람 이름표(왼쪽 색 막대는 CSS가 그려요). */}
      {remoteEditors && (
        <span className="block-remote-editor" contentEditable={false} aria-label={`${remoteEditors.map((v) => v.name).join(", ")}님이 편집 중`}>
          {remoteEditors.map((v) => v.name).join(", ")}
        </span>
      )}
      {/* 노션처럼 "+"와 드래그 핸들을 왼쪽에 나란히 둬요(호버할 때만
          보임). "+"는 바로 아래에 빈 블록을 추가하고, 핸들은 두 가지
          역할을 함께 해요 — 잡고 끌면 순서를 바꾸고(다른 블록 위로
          올라갈 때마다 그 블록의 2/3 지점을 기준으로 앞/뒤 위치가
          정해짐 — 위 onDragOver, 실제 배열 반영은 드롭할 때 한 번만.
          칸반 카드/컬럼 드래그와 같은 방식), 그냥 클릭하면(드래그 없이)
          블록 옵션 메뉴가 열려요. 노션은 점 6개(⋮⋮) 아이콘을 쓰는데,
          저희는 그 대신 두 개의 세로 막대(Pause 모양) 아이콘을 써서
          모양만으로도 노션과 다르게 보이게 했어요 — 폭이 늘었다 줄었다
          하는 모션은 옆 블록을 밀어내는 문제가 있어서 빼고, 크기는
          처음부터 고정했고(노션 정도 크기로) 태스크/이벤트/스프린트처럼
          실제 데이터에 연결된 블록은 핸들 위에 초록 점도 같이 떠서
          (isLive), 이 자리가 단순 이동 버튼이 아니라 "연결 상태를
          보여주는 자리"라는 의미를 더해요. 메뉴가 열려있거나(isMoreOpen)
          드래그 중이면(isDragging) 핸들이 "active" 클래스를 받아서 호버
          여부와 상관없이 색이 꽉 채워진 상태로 유지돼요. */}
      <div className="block-left-actions">
        <button
          type="button"
          className="block-add-btn"
          aria-label="아래에 블록 추가"
          onClick={onAddBelow}
          title="아래에 블록 추가"
        >
          <Plus size={16} />
        </button>

        <button
          ref={moreTriggerRef}
          type="button"
          className={`block-drag-handle ${isHandleActive ? "active" : ""}`}
          aria-label="블록 옵션 (드래그해서 순서 변경)"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            // Firefox는 데이터를 하나도 안 실으면 드래그를 시작하지 않아요. 글자 형식으로 실으면 글자 블록 위에
            // 놓았을 때 그 글자가 붙여넣어지니, 우리만 아는 형식으로 실어요.
            try {
              e.dataTransfer.setData("application/x-flowspace-block-drag", "1");
            } catch {
              // 일부 환경에서는 setData가 막혀 있어도 드래그 자체는 되니 무시해요.
            }
            if (rowRef.current) {
              const rect = rowRef.current.getBoundingClientRect();
              e.dataTransfer.setDragImage(
                rowRef.current,
                e.clientX - rect.left,
                e.clientY - rect.top,
              );
            }
            onDragHandleStart?.();
          }}
          onDragEnd={(e) => onDragHandleEnd?.(e)}
          onClick={onToggleMore}
          title="클릭: 블록 옵션 · 드래그: 순서 변경"
        >
          {/* lucide 아이콘은 기본이 선(stroke)만 그리는 아웃라인이라, 이대로
              두면 "두 세로 막대"가 속이 빈 테두리로만 보여요. fill을
              currentColor로 주고 stroke는 꺼서 막대 안쪽까지 색이 꽉 찬
              모양(요청하신 Dual Bars 레퍼런스)으로 보이게 했어요 — 이
              색은 핸들의 CSS color를 그대로 따라가서, 평소엔 회색, 호버·
              active일 땐 보라색으로 자동으로 같이 바뀌어요. */}
          <Pause size={16} fill="currentColor" stroke="none" />
          {isLive && <span className="block-drag-handle__dot" aria-hidden="true" />}
        </button>

        {(isMoreOpen || isBulkMenuAnchor) && (
          <PopoverPortal
            anchorEl={moreTriggerRef.current}
            onClose={isBulkMenuAnchor ? onBulkCloseMenu : onCloseMore}
          >
            <div className="block-menu block-menu--portal">
              {isBulkMenuAnchor ? (
                // 요청: "여러 블록 선택하고 핸들 버튼 이용이 가능하게",
                // 그리고 노션 도움말을 찾아본 결과 반영 — 노션은 여러 블록을
                // 선택하면 단어/글자 수를 메뉴 위에 보여주는데, 이 앱은 표/
                // 카드형 블록처럼 "글자 수"라는 개념이 없는 블록도 섞여
                // 선택될 수 있어서 그 대신 선택된 블록 개수를 보여줘요.
                // 댓글·다시 선택처럼 블록마다 의미가 달라 "전체 적용"이
                // 애매한 항목만 빼고, 배경색·글자색·복제·삭제를 노션과
                // 동일하게 갖췄어요(색은 선택된 블록 중 실제로 적용
                // 가능한 것만 골라 반영돼요 — BlockEditor의
                // blockCanHaveBackground/blockCanHaveTextColor 참고).
                // 요청: 여러 블록이 서로 다른 타입으로 섞여 있을 수 있어서
                // "타입 변경"은 여러 개를 한꺼번에 바꾸는 의미가 애매해
                // 뺐어요(bulkConvert 자체는 남겨뒀고, 필요하면 다시 노출할
                // 수 있어요).
                bulkMenuMode === "color" ? (
                  <>
                    <button type="button" className="block-menu__back" onClick={onBulkOpenMainView}>
                      <ChevronLeft size={12} />
                      <span>뒤로</span>
                    </button>
                    {BLOCK_COLORS.map((c) => (
                      <button key={c.key ?? "default"} type="button" onClick={() => onBulkSetColor(c.key)}>
                        <span
                          className="block-color-swatch"
                          style={{ background: c.swatch }}
                          aria-hidden="true"
                        />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </>
                ) : bulkMenuMode === "textColor" ? (
                  <>
                    <button type="button" className="block-menu__back" onClick={onBulkOpenMainView}>
                      <ChevronLeft size={12} />
                      <span>뒤로</span>
                    </button>
                    {BLOCK_TEXT_COLORS.map((c) => (
                      <button
                        key={c.key ?? "default"}
                        type="button"
                        onClick={() => onBulkSetTextColor(c.key)}
                      >
                        <span
                          className="block-color-swatch"
                          style={{ background: c.swatch }}
                          aria-hidden="true"
                        />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </>
                ) : bulkMenuMode === "convert" ? (
                  <>
                    <button type="button" className="block-menu__back" onClick={onBulkOpenMainView}>
                      <ChevronLeft size={12} />
                      <span>뒤로</span>
                    </button>
                    {blockTypeOptions.map(({ type, label, icon: Icon }) => (
                      <button key={type} type="button" onClick={() => onBulkConvert(type)}>
                        <Icon size={14} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="block-menu__count">{bulkSelectedCount}개 블록 선택됨</div>
                    <button type="button" onClick={onBulkOpenColorView}>
                      <Palette size={14} />
                      <span>배경색</span>
                      <ChevronRight size={12} className="block-menu__chevron" />
                    </button>
                    <button type="button" onClick={onBulkOpenTextColorView}>
                      <Baseline size={14} />
                      <span>글자색</span>
                      <ChevronRight size={12} className="block-menu__chevron" />
                    </button>
                    <button type="button" onClick={onBulkDuplicate}>
                      <Copy size={14} />
                      <span>복제하기</span>
                    </button>
                    <hr className="block-menu__divider" />
                    <button type="button" className="danger" onClick={onBulkDelete}>
                      <Trash2 size={14} />
                      <span>삭제</span>
                    </button>
                  </>
                )
              ) : block.type === "DIVIDER" ? (
                // 요청: 구분선은 타입 변경도, 배경/글자색도, 댓글도 의미가
                // 약해서(그냥 가로줄 하나라) 핸들 메뉴를 "복제"·"삭제"로만
                // 단순화했어요(복제는 모든 블록 핸들 메뉴에 공통으로 있어야
                // 한다는 요청 반영).
                <>
                  <button type="button" onClick={onDuplicate}>
                    <Copy size={14} />
                    <span>복제하기</span>
                  </button>
                  <hr className="block-menu__divider" />
                  <button type="button" className="danger" onClick={onDelete}>
                    <Trash2 size={14} />
                    <span>삭제</span>
                  </button>
                </>
              ) : moreMode === "main" ? (
                // 요청: 핸들 메뉴는 일단 "타입 변경"·"댓글"·"삭제"만
                // 남겼었는데(위로/아래로 이동·아래에 블록 추가는 계속
                // 빼둬요 — 이동은 핸들을 잡고 드래그해서, 블록 추가는
                // 핸들 옆의 "+" 버튼으로 여전히 할 수 있어요), 다시
                // 요청이 와서 TASK/EVENT/SPRINT 카드에서만 "다시 선택"을
                // 도로 넣었어요(onResetEmbed는 그때도 지우지 않고 그대로
                // 남겨뒀던 함수예요 — 연결된 taskId/eventId/sprintId만
                // null로 되돌려서 피커가 다시 뜨고, 블록 자체는 유지돼요).
                <>
                  {/* 요청: 이미지 블록은 "타입 변경" 대신 "파일로 변경"이,
                      파일 블록은 반대로 "이미지로 변경"이 바로 떠서 클릭
                      한 번에 서로 바뀌어야 해요 — 여러 타입 중 고르는
                      서브메뉴(onOpenConvertView) 대신 onSwapFileType으로
                      바로 그 반대 타입으로 바꿔요(데이터는 그대로 유지,
                      위 swapImageFileType 주석 참고). 그 외 타입은 기존
                      그대로 "타입 변경" 서브메뉴를 열어요. */}
                  {block.type === "IMAGE" ? (
                    <button type="button" onClick={() => onSwapFileType("FILE")}>
                      <Paperclip size={14} />
                      <span>파일로 변경</span>
                    </button>
                  ) : block.type === "FILE" ? (
                    <button type="button" onClick={() => onSwapFileType("IMAGE")}>
                      <ImageIcon size={14} />
                      <span>이미지로 변경</span>
                    </button>
                  ) : (
                    <button type="button" onClick={onOpenConvertView}>
                      <Type size={14} />
                      <span>타입 변경</span>
                      <ChevronRight size={12} className="block-menu__chevron" />
                    </button>
                  )}

                  {/* 요청: "복제를 타입변경 밑에 두고" — 타입 변경(또는 파일/
                      이미지 변경) 바로 아래로 옮겼어요. */}
                  <button type="button" onClick={onDuplicate}>
                    <Copy size={14} />
                    <span>복제하기</span>
                  </button>

                  {/* 요청: 블록 배경색을 핸들 메뉴에서 고를 수 있어야 해요
                      (노션의 블록 색상 메뉴와 같은 자리). "타입 변경"과
                      같은 방식으로 서브메뉴(moreMode "color")를 열어요.
                      요청: "데이터베이스는 배경색과 font색 둘 다 없어야
                      해" — 보드형 데이터베이스(canColorBackground 참고)는
                      아예 숨겨요. */}
                  {canColorBackground && (
                    <button type="button" onClick={onOpenColorView}>
                      <Palette size={14} />
                      <span>배경색</span>
                      <ChevronRight size={12} className="block-menu__chevron" />
                    </button>
                  )}

                  {/* 요청: 배경색뿐 아니라 글자색도 골라야 해요. 태스크/
                      이벤트/스프린트/이미지/파일/하위 페이지 링크·보드형
                      데이터베이스는 실제 "글자"가 없는 블록이라
                      (canColorText 참고) 여기선 숨겨요. 표는 예외로
                      포함돼요. */}
                  {canColorText && (
                    <button type="button" onClick={onOpenTextColorView}>
                      <Baseline size={14} />
                      <span>글자색</span>
                      <ChevronRight size={12} className="block-menu__chevron" />
                    </button>
                  )}

                  {(block.type === "TASK" || block.type === "EVENT" || block.type === "SPRINT") && (
                    <button type="button" onClick={onResetEmbed}>
                      <RefreshCw size={14} />
                      <span>다시 선택</span>
                    </button>
                  )}

                  {!isPageLink && (
                    <button
                      type="button"
                      onClick={() => {
                        onCloseMore();
                        onOpenComments();
                      }}
                    >
                      <MessageCircle size={14} />
                      <span>댓글</span>
                    </button>
                  )}

                  <hr className="block-menu__divider" />

                  <button type="button" className="danger" onClick={onDelete}>
                    <Trash2 size={14} />
                    <span>삭제</span>
                  </button>
                </>
              ) : moreMode === "color" ? (
                <>
                  <button type="button" className="block-menu__back" onClick={onOpenMainView}>
                    <ChevronLeft size={12} />
                    <span>뒤로</span>
                  </button>

                  {BLOCK_COLORS.map((c) => (
                    <button key={c.key ?? "default"} type="button" onClick={() => onSetColor(c.key)}>
                      <span
                        className="block-color-swatch"
                        style={{ background: c.swatch }}
                        aria-hidden="true"
                      />
                      <span>{c.label}</span>
                      {(block.color ?? null) === c.key && (
                        <Check size={13} className="block-menu__check" />
                      )}
                    </button>
                  ))}
                </>
              ) : moreMode === "textColor" ? (
                <>
                  <button type="button" className="block-menu__back" onClick={onOpenMainView}>
                    <ChevronLeft size={12} />
                    <span>뒤로</span>
                  </button>

                  {BLOCK_TEXT_COLORS.map((c) => (
                    <button key={c.key ?? "default"} type="button" onClick={() => onSetTextColor(c.key)}>
                      <span
                        className="block-color-swatch"
                        style={{ background: c.swatch }}
                        aria-hidden="true"
                      />
                      <span>{c.label}</span>
                      {(block.textColor ?? null) === c.key && (
                        <Check size={13} className="block-menu__check" />
                      )}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <button type="button" className="block-menu__back" onClick={onOpenMainView}>
                    <ChevronLeft size={12} />
                    <span>뒤로</span>
                  </button>

                  {blockTypeOptions.map(({ type, label, icon: Icon }) => (
                    <button key={type} type="button" onClick={() => onConvert(type)}>
                      <Icon size={14} />
                      <span>{label}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </PopoverPortal>
        )}
      </div>

      {/* 댓글 수가 있으면 말풍선+개수 배지를 늘 보여줘서(호버 안 해도)
          나중에 다시 찾아 열 수 있게 해요 — .block-left-actions 밖에
          둔 이유는, 그 안은 opacity:0으로 기본 숨김이라(호버해야만
          보임) 그 안에 두면 배지도 같이 숨어버려서예요. ⋯ 메뉴의
          "댓글" 항목과 이 배지 둘 다 같은 패널(아래)을 같은
          anchor(핸들, moreTriggerRef) 기준으로 열어요. */}
      {!isPageLink && (block.comments?.length ?? 0) > 0 && (
        <button
          type="button"
          className="block-comment-badge"
          onClick={onToggleComments}
          title="댓글 보기"
        >
          <MessageCircle size={12} />
          <span>{block.comments.length}</span>
        </button>
      )}

      {!isPageLink && isCommentsOpen && (
        <PopoverPortal
          anchorEl={bodyRef.current}
          align="center"
          onClose={() => {
            onCloseComments();
            // 댓글 패널을 통째로 닫을 때 안쪽에 열려있던 댓글별 ⋯
            // 메뉴/수정창도 같이 접어서, 다음에 다시 열었을 때 엉뚱하게
            // 남아있지 않게 해요.
            setOpenCommentMenuId(null);
            setEditingCommentId(null);
          }}
        >
          <div className="block-comment-panel">
            <div className="block-comment-list">
              {(block.comments?.length ?? 0) === 0 ? (
                <p className="block-comment-empty">아직 댓글이 없어요.</p>
              ) : (
                block.comments.map((c) => {
                  const isMine = c.userId != null && me ? c.userId === me.id : c.author === myName;
                  const isEditingThis = editingCommentId === c.id;

                  return (
                    <div key={c.id} className="block-comment-item">
                      {/* 노션처럼 아바타(이름 첫 글자)를 왼쪽에 두고
                          이름·시간·본문을 오른쪽 세로로 쌓아요. */}
                      <span className="block-comment-avatar" aria-hidden="true">
                        {c.author.slice(0, 1)}
                      </span>

                      <div className="block-comment-body">
                        <div className="block-comment-item__head">
                          <strong
                            className="memberLink"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => c.userId != null && openMemberProfile(c.userId, e.currentTarget)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && c.userId != null) openMemberProfile(c.userId, e.currentTarget);
                            }}
                          >
                            {c.author}
                          </strong>
                          <span>
                            {formatCommentTime(c.createdAt)}
                            {c.editedAt && " · 수정됨"}
                          </span>
                        </div>

                        {isEditingThis ? (
                          <form
                            className="block-comment-edit-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const trimmed = editDraft.trim();
                              if (!trimmed) return;
                              onEditComment(c.id, trimmed);
                              setEditingCommentId(null);
                            }}
                          >
                            <MentionInput
                              type="text"
                              value={editDraft}
                              members={workspaceMembers}
                              onChange={setEditDraft}
                              placement="top"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Escape") setEditingCommentId(null);
                              }}
                            />
                            <div className="block-comment-edit-actions">
                              <button type="button" onClick={() => setEditingCommentId(null)}>
                                취소
                              </button>
                              <button type="submit" disabled={!editDraft.trim()}>
                                저장
                              </button>
                            </div>
                          </form>
                        ) : (
                          <p>
                            <MentionText text={c.text} members={workspaceMembers} meId={me?.id ?? null} />
                          </p>
                        )}
                      </div>

                      {/* 본인이 쓴 댓글에서만 ⋯ 메뉴를 보여줘요(남의 댓글은
                          수정·삭제할 수 없으니 트리거 자체를 안 띄워요) —
                          평소엔 숨어있다가 그 댓글에 마우스를 올렸을 때만
                          보이는 노션 스타일이에요. */}
                      {isMine && (
                        <button
                          type="button"
                          ref={(el) => {
                            commentMenuTriggerRefs.current[c.id] = el;
                          }}
                          className={`block-comment-item__more${
                            openCommentMenuId === c.id ? " block-comment-item__more--active" : ""
                          }`}
                          onClick={() =>
                            setOpenCommentMenuId((prev) => (prev === c.id ? null : c.id))
                          }
                          title="댓글 옵션"
                        >
                          <MoreHorizontal size={13} />
                        </button>
                      )}

                      {/* PopoverPortal로 띄워서 노션처럼 이 댓글 패널
                          카드 밖으로도 자연스럽게 넘쳐 뜰 수 있어요
                          (PopoverPortal.jsx의 중첩 지원 참고). */}
                      {isMine && openCommentMenuId === c.id && (
                        <PopoverPortal
                          anchorEl={commentMenuTriggerRefs.current[c.id]}
                          onClose={() => setOpenCommentMenuId(null)}
                        >
                          <div className="block-menu block-menu--portal block-comment-menu">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(c.id);
                                setEditDraft(c.text);
                                setOpenCommentMenuId(null);
                              }}
                            >
                              <Pencil size={13} />
                              <span>수정</span>
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => {
                                setOpenCommentMenuId(null);
                                if (!window.confirm("이 댓글을 삭제할까요? 되돌릴 수 없어요.")) return;
                                onDeleteComment(c.id);
                              }}
                            >
                              <Trash2 size={13} />
                              <span>삭제</span>
                            </button>
                          </div>
                        </PopoverPortal>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <form
              className="block-comment-form"
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = commentDraft.trim();
                if (!trimmed) return;
                onAddComment(trimmed);
                setCommentDraft("");
              }}
            >
              <span className="block-comment-avatar" aria-hidden="true">
                {myName.slice(0, 1)}
              </span>
              <MentionInput
                type="text"
                value={commentDraft}
                members={workspaceMembers}
                onChange={setCommentDraft}
                placement="top"
                placeholder="댓글 추가… (@로 멤버 멘션)"
                autoFocus
              />
              <button type="submit" disabled={!commentDraft.trim()}>
                등록
              </button>
            </form>
          </div>
        </PopoverPortal>
      )}

      <div
        className={`block-body${block.type === "CALLOUT" ? " block-body--callout" : ""}`}
        ref={bodyRef}
        style={hasBodyStyle ? bodyStyle : undefined}
      >
        {/* 요청: 여러 블록을 사각형으로 드래그 선택했을 때, 배경색 때와
            똑같은 이유로 핸들 자리(.block-row의 -52px 확장 영역)까지
            침범하면 안 돼요. .block-body 안에 딱 맞게 겹치는 반투명
            오버레이라 커스텀 배경색(bodyStyle)이나 텍스트 클릭·타이핑을
            건드리지 않아요(pointer-events:none). */}
        {isSelected && <div className="block-select-highlight" aria-hidden="true" />}

        {block.type === "DIVIDER" ? (
          <hr className="block-divider-line" />
        ) : block.type === "IMAGE" ? (
          <BlockImage block={block} onImageSelect={onImageSelect} onImageResize={onImageResize} />
        ) : block.type === "FILE" ? (
          <BlockFile block={block} onImageSelect={onImageSelect} onImageUrlEmbed={onImageUrlEmbed} />
        ) : block.type === "DATABASE" ? (
          block.database?.kind === "TABLE" ? (
            <SimpleTableBlock table={block.database} onChange={onDatabaseChange} />
          ) : (
            <DatabaseBlock
              database={block.database}
              onChange={onDatabaseChange}
              pages={pages}
              onCreateRowPage={onCreateChildPage}
              onRenameRowPage={onRenameRowPage}
              onDeleteRowPage={onDeleteRowPage}
            />
          )
        ) : block.type === "TASK" ? (
          <TaskEmbed
            taskId={block.taskId}
            tasks={sprintTasks}
            onChange={onTaskChange}
            onToggleSubtask={onToggleSubtask}
          />
        ) : block.type === "EVENT" ? (
          <EventEmbed eventId={block.eventId} onChange={onEventChange} />
        ) : block.type === "SPRINT" ? (
          <SprintEmbed sprintId={block.sprintId} onChange={onSprintChange} />
        ) : block.pageId ? (
          <PageLinkBlock page={pageLink} />
        ) : (
          <>
            {block.type === "TODO" && (
              <input
                type="checkbox"
                className="block-checkbox"
                aria-label="완료"
                checked={!!block.checked}
                onChange={onToggleCheck}
              />
            )}

            {block.type === "BULLET" && <span className="block-bullet">•</span>}

            {block.type === "NUMBERED" && <span className="block-number">{formatListNumber(number, indentLevel)}</span>}

            {block.type === "TOGGLE" && (
              // 요청: "블록 종류가 노션보다 적어요" — 이 버튼 하나가
              // block.collapsed를 뒤집어요. 실제로 "펼치고 접기"는 여기서
              // 안 일어나고(그냥 데이터 필드 하나만 바뀜), BlockEditor의
              // computeHiddenBlockIds가 매 렌더마다 이 필드를 보고 자식
              // 범위를 숨길지 말지 다시 계산해요.
              <button
                type="button"
                className={`block-toggle-caret${block.collapsed ? "" : " block-toggle-caret--expanded"}`}
                onClick={onToggleCollapse}
                aria-label={block.collapsed ? "펼치기" : "접기"}
              >
                <ChevronRight size={14} />
              </button>
            )}

            {block.type === "CALLOUT" && (
              <>
                <button
                  type="button"
                  className="block-callout-icon"
                  ref={calloutIconRef}
                  onClick={() => setCalloutPickerOpen((v) => !v)}
                  aria-label="아이콘 바꾸기"
                >
                  {block.calloutIcon || "💡"}
                </button>
                {calloutPickerOpen && (
                  <PopoverPortal anchorEl={calloutIconRef.current} onClose={() => setCalloutPickerOpen(false)}>
                    <div className="block-callout-icon-picker">
                      {CALLOUT_ICON_PRESETS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className="block-callout-icon-option"
                          onClick={() => {
                            onSetCalloutIcon(icon);
                            setCalloutPickerOpen(false);
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </PopoverPortal>
                )}
              </>
            )}

            {block.type === "CODE" ? (
              // 코드 블록은 인라인 서식(RICH_TEXT_TYPES) 없이 순수 텍스트예요. 대신 노션처럼
              // 언어를 고르면(기본은 자동 감지) 문법에 따라 글자마다 색이 달라져요(CodeEditor.jsx).
              <CodeEditor
                innerRef={registerRef}
                value={block.content}
                language={block.language}
                commented={hasComments}
                placeholder={isFocused ? placeholderFor(block.type) : ""}
                onLanguageChange={onSetLanguage}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={onPasteImage}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            ) : (
              // 요청: "인라인 서식" — TEXT/H1/H2/TODO/BULLET/NUMBERED/QUOTE는
              // contentEditable 기반 RichTextInput으로 바꿔서, 문장 중간
              // 일부만 굵게/기울임/밑줄/취소선/인라인 코드/링크를 입힐 수
              // 있어요(RichTextInput.jsx 참고). div는 원래도 자기 내용만큼
              // 자동으로 늘어나서, 예전 AutoTextarea가 하던 JS 높이 계산이
              // 더 이상 필요 없어요(한 줄짜리였던 타입도 같은 컴포넌트로
              // 통일됐어요 — 대신 위 handleKeyDown에서 Shift+Enter를 막아
              // 예전처럼 한 줄만 유지해요).
              <RichTextInput
                id={block.id}
                innerRef={registerRef}
                className={`block-input block-input--${(block.type || "TEXT").toLowerCase()} ${checkedClass}${hasComments ? " block-input--commented" : ""}`}
                style={textColorInfo ? { color: textColorInfo.color } : undefined}
                value={block.content}
                placeholder={placeholderFor(block.type)}
                showPlaceholder={isFocused}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onPasteImage={onPasteImage}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            )}
          </>
        )}

        {isSlashOpen && (
          <SlashMenu
            query={slashQuery}
            options={blockTypeOptions}
            activeIndex={slashIndex}
            onHoverIndex={onSlashHover}
            onSelect={onConvert}
          />
        )}
      </div>
    </div>
  );
}

const BlockRow = memo(BlockRowImpl);
export default BlockRow;
