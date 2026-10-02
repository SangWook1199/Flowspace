import { useRef, useState } from "react";
import { Image as ImageIcon, Link2, Paperclip, UploadCloud } from "lucide-react";
import PopoverPortal from "../PopoverPortal";

/* ================= BlockImage ================= */

export function BlockImage({ block, onImageSelect, onImageResize }) {
  const fileRef = useRef(null);
  const boxRef = useRef(null);
  const frameRef = useRef(null);
  const image = block.image;

  // 노션처럼 왼쪽·오른쪽 가장자리에 핸들이 하나씩 있고, 어느 쪽을 잡고
  // 끌어도 이미지가 항상 박스 가운데 있어야 해요(아래 .block-image-frame
  // 의 margin:0 auto가 실제 가운데 정렬을 맡아요). "시작 폭 + 마우스
  // 이동량"처럼 한쪽 가장자리를 기준으로 폭을 계산하면 반대쪽 가장자리는
  // 그대로 있고 이 가장자리만 움직이는 셈이라 중심이 매번 옆으로
  // 쏠려요 — 그래서 대신 "박스의 가로 중심에서 마우스 커서까지 거리 ×
  // 2"로 폭을 계산해요. 박스(.page-image-box) 자체는 드래그 중에
  // 움직이거나 크기가 안 바뀌니까 이 중심 좌표는 드래그 내내 고정이고,
  // 왼쪽 핸들이든 오른쪽 핸들이든 같은 공식 하나로 항상 중심을 유지한
  // 채 커지고 줄어들어요.
  //
  // 최대치: 처음엔 .page-image-box 자기 자신의 폭(=본문 칼럼 900px 안쪽)
  // 으로 묶어놨는데, 그러면 이미 칼럼을 꽉 채운 상태가 "최대"라서 노션과
  // 달리 더 못 키웠어요. 실제 노션은 이미지를 본문 칼럼보다 넓게, 페이지
  // 가장자리 가까이까지 키울 수 있어요 — 그래서 기준을 박스가 아니라
  // 페이지 전체(.page-detail-page, 사이드바를 뺀 실제 화면 폭)로 바꿨어요.
  // 이렇게 드래그로 칼럼보다 넓은 값을 넘기면, 아래 .page-image-box가
  // (부모 .block-image-align의 justify-content:center로) 칼럼 밖으로
  // 실제로 삐져나가면서도 항상 페이지 가운데를 유지해요 — 부모 요소들
  // 중 overflow:hidden이 없어서 삐져나간 부분이 잘리지 않고 그대로
  // 보여요.
  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const boxEl = boxRef.current;
    if (!boxEl || !onImageResize) return;

    const boxRect = boxEl.getBoundingClientRect();
    const centerX = boxRect.left + boxRect.width / 2;
    const pageEl = boxEl.closest(".page-detail-page");
    const maxWidth = pageEl ? Math.max(320, pageEl.clientWidth - 48) : boxEl.clientWidth - 20;

    const handleMove = (moveEvent) => {
      const nextWidth = Math.round(
        Math.min(maxWidth, Math.max(160, Math.abs(moveEvent.clientX - centerX) * 2)),
      );
      onImageResize(nextWidth);
    };
    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  if (image) {
    return (
      // .page-image-box를 이 정렬 래퍼(.block-image-align)로 한 번 더
      // 감쌌어요. 예전엔 박스 자신에 position:relative + left:50% +
      // transform:translateX(-50%)를 줘서 가운데를 맞췄는데, 이 계산은
      // 박스가 부모(.block-body, 가로 flex)보다 "많이" 넓을 때는 티가
      // 안 날 만큼만 어긋나고 박스가 작을 때는 왼쪽으로 쏠려 보이는
      // 문제가 있었어요(실측 확인됨). 대신 justify-content:center인
      // flex 컨테이너로 감싸면, 안의 박스가 이 컨테이너보다 좁든(줄인
      // 상태) 같든(기본 100%) 넓든(칼럼보다 크게 키운 상태) 상관없이
      // flex 엔진이 항상 정확히 가운데에 놓아줘요 — 그래서 아래
      // .page-image-box에는 이제 위치 계산용 CSS가 없어요.
      <div className="block-image-align">
        <div
          className="page-image-box"
          ref={boxRef}
          style={image.width ? { width: image.width + 20 } : undefined}
        >
          {image.url ? (
            <div
              className="block-image-frame"
              ref={frameRef}
              style={image.width ? { width: image.width } : undefined}
            >
              <img src={image.url} alt={image.fileName} className="block-image-preview" />

              {/* 노션처럼 왼쪽·오른쪽에 핸들을 하나씩 — 드래그로 폭 조절,
                  더블클릭하면 원래(100% 채움) 크기로 되돌아가요. 표시는
                  호버 중일 때만. */}
              <div
                className="block-image-resize-handle block-image-resize-handle--left"
                onMouseDown={startResize}
                onDoubleClick={() => onImageResize?.(null)}
                title="드래그해서 크기 조절 · 더블클릭하면 원래 크기로"
              />
              <div
                className="block-image-resize-handle block-image-resize-handle--right"
                onMouseDown={startResize}
                onDoubleClick={() => onImageResize?.(null)}
                title="드래그해서 크기 조절 · 더블클릭하면 원래 크기로"
              />
            </div>
          ) : (
            <div className="block-image-placeholder">
              <ImageIcon size={22} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <button type="button" className="block-image-empty" onClick={() => fileRef.current?.click()}>
      <ImageIcon size={22} />
      <span>클릭해서 이미지 업로드</span>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onImageSelect(e.target.files?.[0])}
      />
    </button>
  );
}

/* ================= BlockFile =================
   IMAGE 블록과 데이터 모양(block.image = { fileName, fileSize, url })이
   완전히 같아요 — "이미지로 변경"/"파일로 변경"(위 swapImageFileType)이
   type 필드만 바꾸고 image는 그대로 두는 토글이라서예요. 다른 건 그
   첨부를 큰 미리보기 사진으로 보여줄지(BlockImage), 아이콘+파일명+
   용량 한 줄짜리 카드로 보여줄지(이 컴포넌트)뿐이에요. 리사이즈 핸들도
   없고(파일은 크기 조절할 미리보기가 없어요), 카드 자체가 곧 다운로드/
   열기 링크예요.

   빈 상태는 노션의 "/file" 그대로예요 — 클릭하면 바로 파일 선택창이
   뜨는 대신, "업로드"/"링크" 탭이 있는 작은 팝오버가 먼저 떠요. 컴퓨터
   파일을 올리는 것 말고, 이미 어딘가에 있는 파일 URL을 그대로 임베드할
   수도 있게 하기 위해서예요(handleImageUrlEmbed → onImageUrlEmbed). */
export function BlockFile({ block, onImageSelect, onImageUrlEmbed }) {
  const fileRef = useRef(null);
  const triggerRef = useRef(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState("upload");
  const [linkDraft, setLinkDraft] = useState("");
  const image = block.image;

  if (image?.url) {
    return (
      <a
        className="block-file-card"
        href={image.url}
        download={image.fileName || true}
        target="_blank"
        rel="noreferrer"
      >
        <span className="block-file-card__icon">
          <Paperclip size={18} />
        </span>
        <span className="block-file-card__name">{image.fileName || "파일"}</span>
        {image.fileSize && <span className="block-file-card__size">{image.fileSize}</span>}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="block-file-empty"
        onClick={() => {
          setTab("upload");
          setPickerOpen((v) => !v);
        }}
      >
        <Paperclip size={16} />
        <span>파일 업로드 또는 임베드</span>
      </button>

      {isPickerOpen && (
        <PopoverPortal anchorEl={triggerRef.current} onClose={() => setPickerOpen(false)}>
          <div className="block-file-picker">
            <div className="block-file-picker__tabs">
              <button
                type="button"
                className={tab === "upload" ? "active" : ""}
                onClick={() => setTab("upload")}
              >
                업로드
              </button>
              <button
                type="button"
                className={tab === "link" ? "active" : ""}
                onClick={() => setTab("link")}
              >
                링크
              </button>
            </div>

            {tab === "upload" ? (
              <button
                type="button"
                className="block-file-picker__upload-btn"
                onClick={() => fileRef.current?.click()}
              >
                <UploadCloud size={14} />
                <span>파일을 선택하세요</span>
              </button>
            ) : (
              <form
                className="block-file-picker__link-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = linkDraft.trim();
                  if (!trimmed) return;
                  onImageUrlEmbed(trimmed);
                  setLinkDraft("");
                  setPickerOpen(false);
                }}
              >
                <input
                  type="text"
                  value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)}
                  placeholder="파일 링크를 붙여넣으세요"
                  autoFocus
                />
                <button type="submit" disabled={!linkDraft.trim()}>
                  <Link2 size={14} />
                  <span>임베드</span>
                </button>
              </form>
            )}
          </div>
        </PopoverPortal>
      )}

      <input
        ref={fileRef}
        type="file"
        hidden
        onChange={(e) => {
          onImageSelect(e.target.files?.[0]);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

