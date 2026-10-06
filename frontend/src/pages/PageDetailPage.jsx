import { useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Camera, ChevronRight, ImagePlus, Smile, X } from "lucide-react";

import PageBlocks from "../components/page/PageBlocks";
import PopoverPortal from "../components/page/PopoverPortal";
import EmojiPicker from "../components/common/EmojiPicker";
import { useWorkspace } from "../context/WorkspaceContext";
import { usePagePresence } from "../hooks/usePagePresence";
import "../styles/page-detail.css";

// 백엔드 static/covers에 있는 기본 커버 16장. Vite가 frontend/public을
// 루트 경로로 서빙해서 지금은 /covers/*.png 로 바로 접근되고, 나중에
// 백엔드 정적 리소스로 붙여도 같은 경로라 이 문자열을 안 바꿔도 돼요.
// 피커에서는 사진(배경)과 단색 파스텔(색상)을 섹션으로 나눠서 보여줘요.
const COVER_GROUPS = [
  {
    title: "배경",
    choices: [
      { label: "해변", url: "/covers/beach.png" },
      { label: "책상", url: "/covers/desk.png" },
      { label: "호수", url: "/covers/lake.png" },
      { label: "산", url: "/covers/mountain.png" },
      { label: "비 오는 창가", url: "/covers/rainy-window.png" },
      { label: "방", url: "/covers/room.png" },
      { label: "하늘", url: "/covers/sky.png" },
      { label: "파스텔 스카이", url: "/covers/pastel-sky.png" },
      { label: "우주", url: "/covers/space.png" },
    ],
  },
  {
    title: "색상",
    choices: [
      { label: "파스텔 블루", url: "/covers/pastel-blue.png" },
      { label: "파스텔 그레이", url: "/covers/pastel-gray.png" },
      { label: "파스텔 그린", url: "/covers/pastel-green.png" },
      { label: "파스텔 라벤더", url: "/covers/pastel-lavender.png" },
      { label: "파스텔 민트", url: "/covers/pastel-mint.png" },
      { label: "파스텔 핑크", url: "/covers/pastel-pink.png" },
      { label: "파스텔 옐로우", url: "/covers/pastel-yellow.png" },
    ],
  },
];

export default function PageDetailPage() {
  // 제목·아이콘·커버는 WorkspaceProvider의 페이지 목록(MainLayout의 Outlet context)에서 읽고,
  // 본문 블록은 PageBlocks가 페이지 상세 API로 따로 불러와 저장해요.
  const { pageId } = useParams();
  const navigate = useNavigate();
  const {
    pages,
    pagesLoading,
    pagesError,
    reloadPages,
    createChildPage,
    pageIdMap,
    duplicatePage,
    updatePage: updatePageById,
    updateCover,
    deletePage,
    restorePage,
    renamePage,
    sprintTasks,
    toggleSubtask,
  } = useOutletContext();
  const { currentWorkspaceId } = useWorkspace();

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [coverAnchor, setCoverAnchor] = useState(null);
  const coverInputRef = useRef(null);

  // :pageId는 URL에서 온 문자열이라 숫자가 아닐 수도 있어요("abc", "NaN", "1.5" 등).
  // 정수로 딱 떨어지는 값만 페이지 id로 보고, 아니면 찾지 못한 걸로 처리해요.
  // 지금 워크스페이스에 속한 페이지만 보여줘요 — 주소창에 다른 워크스페이스의 페이지
  // id가 남아 있어도(뒤로가기 등) 이전 워크스페이스의 내용이 그대로 뜨지 않게요.
  // 서버에 만들던 임시 페이지(음수 id)의 주소로 들어와도 실제 페이지를 찾아요.
  const numericId = Number(pageId);
  const resolvedId = pageIdMap?.[numericId] ?? numericId;
  const page = Number.isInteger(resolvedId)
    ? pages.find(
        (p) =>
          p.id === resolvedId && (p.workspaceId ?? 1) === currentWorkspaceId,
      )
    : undefined;

  // 이 페이지를 같이 보는 다른 멤버(실시간). 훅이라서 아래 early return보다 먼저 불러요.
  const { viewers, reportBlock, contentSeq } = usePagePresence(page ? page.id : null);

  // 페이지 목록을 서버에서 받는 중이거나 실패했을 때는 "찾을 수 없어요"를 보여주지 않아요.
  if (!page && pagesLoading) {
    return (
      <div className="page-detail-page">
        <p className="page-detail__missing" role="status">
          페이지를 불러오는 중이에요…
        </p>
      </div>
    );
  }

  if (!page && pagesError) {
    return (
      <div className="page-detail-page">
        <p className="page-detail__missing" role="alert">
          {pagesError}
        </p>
        <button
          type="button"
          className="page-detail__cover-btn"
          style={{ margin: "0 auto" }}
          onClick={reloadPages}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="page-detail-page">
        <p className="page-detail__missing">
          페이지를 찾을 수 없어요. <Link to="/">홈으로 돌아가기</Link>
        </p>
      </div>
    );
  }

  // 휴지통에 있는 페이지는 편집할 수 없게 해요. 주소로 직접 들어오거나 열어둔 채로
  // 삭제했을 때 에디터가 그대로 떠서 "삭제된 페이지"를 계속 고칠 수 있었어요.
  // 복원하면 trashedAt이 지워지면서 바로 에디터가 나타나요.
  if (page.trashedAt) {
    return (
      <div className="page-detail-page">
        <p className="page-detail__missing">이 페이지는 휴지통에 있어요</p>
        <button
          type="button"
          className="page-detail__cover-btn"
          style={{ margin: "0 auto" }}
          onClick={() => restorePage(page.id)}
        >
          복원
        </button>
      </div>
    );
  }

  // 아직 서버에 만드는 중인 임시 페이지는 만들어질 때까지 기다려요.
  if (page.id <= 0) {
    return (
      <div className="page-detail-page">
        <p className="page-detail__missing" role="status">
          페이지를 만드는 중이에요…
        </p>
      </div>
    );
  }

  // 제목·아이콘은 잠깐 기다렸다가 한 번에 서버에 저장되고, 커버는 고르는 즉시 저장돼요.
  const updatePage = (patch) => updatePageById(page.id, patch);

  // breadcrumb: 바로 위 부모만이 아니라 최상위까지 전체 경로를 보여줘요.
  const ancestors = [];
  let cursor = page.parentPageId ? pages.find((p) => p.id === page.parentPageId) : null;
  while (cursor) {
    ancestors.unshift(cursor);
    cursor = cursor.parentPageId ? pages.find((p) => p.id === cursor.parentPageId) : null;
  }

  const handleCoverSelect = (file) => {
    if (!file) return;
    updateCover(page.id, { file });
  };

  // 페이지 삭제 버튼은 일단 화면에서 뺐어요(요청으로 임시 제거) —
  // deletePage(page.id)를 부르는 handleDeletePage 같은 함수만 없앴을
  // 뿐, deletePage 자체(휴지통 이동 로직)는 WorkspaceProvider에 그대로 있어서
  // 나중에 버튼을 다시 붙이기만 하면 바로 복원돼요.

  const closeIconPicker = () => setIconPickerOpen(false);

  // 아이콘 피커 — 검색창 + 카테고리별 이모지 목록은 워크스페이스 아이콘 선택과 같이 쓰는
  // 공용 EmojiPicker예요.
  const iconPickerPanel = iconPickerOpen ? (
    <EmojiPicker
      onSelect={(emoji) => {
        updatePage({ icon: emoji });
        closeIconPicker();
      }}
      onClose={closeIconPicker}
    />
  ) : null;

  // "커버 추가"/"변경" 버튼 둘 다 이 패널을 열어요 — 기본 커버 16장을
  // 고르거나 업로드를 선택할 수 있어요. 커버가 있을 때(변경 버튼)는
  // .page-detail__cover-zone에 overflow:hidden(280px 고정 높이)이
  // 걸려 있어서 예전처럼 그 안에서 absolute로 띄우면 패널이 바닥
  // 밑으로 넘쳐 그대로 잘려 안 보였어요 — PopoverPortal(다른 메뉴들과
  // 같은 컴포넌트)로 document.body에 fixed로 띄워서 그 문제를
  // 없앴어요. align="end"는 예전 CSS의 right:0 의도 그대로 트리거
  // 오른쪽 끝에 패널 오른쪽 끝을 맞춰요. 두 버튼 중 실제로 클릭된
  // 쪽을 anchorEl로 써야 해서, 클릭 시 e.currentTarget을 coverAnchor에
  // 같이 저장해요.
  const coverPickerPanel = coverPickerOpen ? (
    <PopoverPortal anchorEl={coverAnchor} onClose={() => setCoverPickerOpen(false)} align="end">
      <div className="page-detail__cover-picker">
        {COVER_GROUPS.map((group) => (
          <div key={group.title} className="page-detail__cover-picker-section">
            <span className="page-detail__cover-picker-label">{group.title}</span>
            <div className="page-detail__cover-picker-grid">
              {group.choices.map((choice) => (
                <button
                  key={choice.url}
                  type="button"
                  className="page-detail__cover-thumb"
                  title={choice.label}
                  onClick={() => {
                    updateCover(page.id, { defaultUrl: choice.url });
                    setCoverPickerOpen(false);
                  }}
                >
                  <img src={choice.url} alt={choice.label} />
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="page-detail__cover-upload-btn"
          onClick={() => {
            setCoverPickerOpen(false);
            coverInputRef.current?.click();
          }}
        >
          <ImagePlus size={14} />
          업로드
        </button>
      </div>
    </PopoverPortal>
  ) : null;

  return (
    <div className="page-detail-page">
      {/* 커버는 노션처럼 일반 흐름(in-flow) 요소예요 — 있으면 그만큼
          아래 내용이 실제로 밀려요. 상위 페이지 경로/삭제 같은 상단
          바는 노션엔 없는 이 앱만의 기능이라, 문서 흐름을 차지하지
          않게 커버(또는 커버가 없으면 페이지 맨 위) 위에 떠 있는
          오버레이로 뒀어요 — 그래야 아이콘이 항상 "커버 바로 아래"에서
          시작해서 커버에 겹칠 수 있어요. */}
      {page.cover && (
        <div className="page-detail__cover-zone">
          <img src={page.cover} alt="" />
          <div
            className={`page-detail__cover-actions${
              coverPickerOpen ? " page-detail__cover-actions--open" : ""
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                setCoverAnchor(e.currentTarget);
                setCoverPickerOpen((v) => !v);
              }}
            >
              <Camera size={13} />
              변경
            </button>
            <button type="button" onClick={() => updateCover(page.id, null)}>
              <X size={13} />
              삭제
            </button>

            {coverPickerPanel}
          </div>
        </div>
      )}

      <div className="page-detail__topbar-zone">
        <div className="page-detail__container page-detail__topbar">
          {ancestors.length > 0 ? (
            <div className="page-detail__breadcrumb page-detail__topbar-surface">
              {ancestors.map((a) => (
                <span key={a.id} className="page-detail__breadcrumb-seg">
                  <button type="button" onClick={() => navigate(`/pages/${a.id}`)}>
                    <span>{a.icon}</span>
                    <span>{a.title || "제목 없음"}</span>
                  </button>
                  <ChevronRight size={12} />
                </span>
              ))}
            </div>
          ) : (
            <span />
          )}

          {/* 삭제 버튼은 일단 빼뒀어요. 커버가 없을 때만 여기(상단
              바)에 "커버 추가"가 남아요 — 커버가 있을 때는 커버 사진
              자체에 hover하면 변경/삭제가 나와요(노션 방식). */}
          {!page.cover && (
            <div className="page-detail__topbar-actions page-detail__topbar-surface">
              <div className="page-detail__cover-btn-wrap">
                <button
                  type="button"
                  className="page-detail__cover-btn"
                  onClick={(e) => {
                    setCoverAnchor(e.currentTarget);
                    setCoverPickerOpen((v) => !v);
                  }}
                >
                  <ImagePlus size={13} />
                  커버 추가
                </button>

                {coverPickerPanel}
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          handleCoverSelect(e.target.files?.[0]);
          e.target.value = ""; // 같은 파일을 다시 골라도 반응하게 비워요.
        }}
      />

      <div
        className={`page-detail__container page-detail__container--body${
          page.cover ? " page-detail__container--body--with-cover" : ""
        }`}
      >
        <div className="page-detail__head">
          <div
            className={`page-detail__icon-wrap${
              page.cover ? " page-detail__icon-wrap--overlap" : ""
            }`}
          >
            <button
              type="button"
              className="page-detail__icon"
              onClick={() => setIconPickerOpen((v) => !v)}
            >
              {page.icon || <Smile size={26} />}
            </button>

            {iconPickerPanel}
          </div>

          <input
            className="page-detail__title"
            value={page.title}
            placeholder="제목 없음"
            onChange={(e) => updatePage({ title: e.target.value })}
          />
        </div>

        <PageBlocks
          key={page.id}
          pageId={page.id}
          viewers={viewers}
          onReportBlock={reportBlock}
          remoteContentSeq={contentSeq}
          pages={pages}
          pageIdMap={pageIdMap}
          onCreateChildPage={() => createChildPage(page.id)}
          onDuplicatePage={(pageId) => duplicatePage(pageId, page.id)}
          onRenameRowPage={renamePage}
          onDeleteRowPage={deletePage}
          sprintTasks={sprintTasks}
          onToggleSubtask={toggleSubtask}
        />
      </div>
    </div>
  );
}
