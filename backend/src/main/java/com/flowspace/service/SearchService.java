package com.flowspace.service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowspace.dto.search.SearchResponse;
import com.flowspace.dto.search.SearchResponse.SearchItem;
import com.flowspace.entity.Block;
import com.flowspace.entity.Comment;
import com.flowspace.entity.Event;
import com.flowspace.entity.Page;
import com.flowspace.entity.Sprint;
import com.flowspace.entity.Task;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;

// 워크스페이스 안의 페이지(제목·본문)·작업·스프린트·댓글·일정을 한 번에 검색해요.
// 종류마다 앞쪽 몇 개만 돌려주고(자동완성 목록용), 휴지통에 있는 페이지는 빼요.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SearchService {

    private static final int LIMIT = 6;
    private static final int MAX_KEYWORD_LENGTH = 50;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("M월 d일");

    @PersistenceContext
    private EntityManager em;

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    public SearchResponse search(Long workspaceId, String query, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        String keyword = query == null ? "" : query.trim();

        if (keyword.isEmpty()) {
            return SearchResponse.empty("");
        }

        if (keyword.length() > MAX_KEYWORD_LENGTH) {
            keyword = keyword.substring(0, MAX_KEYWORD_LENGTH);
        }

        String lower = keyword.toLowerCase();
        String like = "%" + escapeLike(lower) + "%";

        return new SearchResponse(keyword, searchPages(workspace, lower, like), searchTasks(workspace, lower, like),
            searchSprints(workspace, lower, like), searchComments(workspace, lower, like),
            searchEvents(workspace, lower, like));
    }

    // ---------- 종류별 검색 ----------

    // 페이지: 제목이 맞는 것을 먼저, 그다음 본문(블록)에 검색어가 있는 페이지
    private List<SearchItem> searchPages(Workspace workspace, String lower, String like) {

        Map<Long, SearchItem> found = new LinkedHashMap<>();

        List<Page> byTitle = em
            .createQuery("select p from Page p where p.workspace = :ws and p.isDeleted = false "
                + "and lower(p.title) like :kw escape '!' order by p.pageId desc", Page.class)
            .setParameter("ws", workspace).setParameter("kw", like).setMaxResults(LIMIT).getResultList();

        for (Page page : byTitle) {
            found.put(page.getPageId(), pageItem(page, null));
        }

        if (found.size() < LIMIT) {
            for (Block block : findMatchingBlocks(workspace, lower)) {
                Page page = block.getPage();

                if (found.containsKey(page.getPageId())) {
                    continue;
                }

                String text = blockText(block);

                if (text == null || !text.toLowerCase().contains(lower)) {
                    continue;
                }

                found.put(page.getPageId(), pageItem(page, excerpt(text, lower)));

                if (found.size() >= LIMIT) {
                    break;
                }
            }
        }

        return new ArrayList<>(found.values());
    }

    // 본문 검색: 블록 내용(JSON)을 글자로 바꿔 LIKE로 먼저 거르고, 실제로 글에 들어 있는지는 다시 확인해요.
    @SuppressWarnings("unchecked")
    private List<Block> findMatchingBlocks(Workspace workspace, String lower) {

        List<Number> ids = em.createNativeQuery("select b.block_id from blocks b join pages p on p.page_id = b.page_id "
            + "where p.workspace_id = :ws and p.is_deleted = 0 "
            + "and lower(cast(b.content as char)) like :kw order by b.block_id desc limit 100")
            .setParameter("ws", workspace.getWorkspaceId()).setParameter("kw", "%" + escapeLike(lower) + "%")
            .getResultList();

        if (ids.isEmpty()) {
            return List.of();
        }

        List<Long> blockIds = ids.stream().map(Number::longValue).toList();

        return em.createQuery("select b from Block b join fetch b.page where b.blockId in :ids order by b.blockId desc",
            Block.class).setParameter("ids", blockIds).getResultList();
    }

    private List<SearchItem> searchTasks(Workspace workspace, String lower, String like) {

        List<Task> tasks = em.createQuery("select t from Task t where t.workspace = :ws "
            + "and (lower(t.title) like :kw escape '!' or lower(coalesce(t.description, '')) like :kw escape '!') "
            + "order by t.taskId desc", Task.class).setParameter("ws", workspace).setParameter("kw", like)
            .setMaxResults(LIMIT).getResultList();

        return tasks.stream().<SearchItem>map(task -> {
            boolean inTitle = task.getTitle().toLowerCase().contains(lower);
            String snippet = inTitle || task.getDescription() == null ? null : excerpt(task.getDescription(), lower);

            return new SearchItem("TASK", task.getTaskId(), task.getTitle(), snippet, null, task.getStatus().getName(),
                NotificationService.taskLink(task));
        }).toList();
    }

    private List<SearchItem> searchSprints(Workspace workspace, String lower, String like) {

        List<Sprint> sprints = em.createQuery("select s from Sprint s where s.workspace = :ws "
            + "and (lower(s.name) like :kw escape '!' or lower(coalesce(s.goal, '')) like :kw escape '!') "
            + "order by s.sprintId desc", Sprint.class).setParameter("ws", workspace).setParameter("kw", like)
            .setMaxResults(LIMIT).getResultList();

        return sprints.stream().<SearchItem>map(sprint -> {
            boolean inName = sprint.getName().toLowerCase().contains(lower);
            String snippet = inName || sprint.getGoal() == null ? null : excerpt(sprint.getGoal(), lower);

            return new SearchItem("SPRINT", sprint.getSprintId(), sprint.getName(), snippet, null, null,
                "/sprints/" + sprint.getSprintId());
        }).toList();
    }

    // 댓글: 달린 작업(또는 페이지) 이름을 제목으로, 댓글 내용 중 검색어 주변을 보여줘요(멘션은 @이름으로 풀어서).
    private List<SearchItem> searchComments(Workspace workspace, String lower, String like) {

        List<Comment> comments = em.createQuery("select c from Comment c left join c.task t left join c.block b "
            + "left join b.page p where (t.workspace = :ws or p.workspace = :ws) and (p is null or p.isDeleted = false) "
            + "and lower(c.content) like :kw escape '!' order by c.commentId desc", Comment.class)
            .setParameter("ws", workspace).setParameter("kw", like).setMaxResults(LIMIT).getResultList();

        List<SearchItem> items = new ArrayList<>();

        for (Comment comment : comments) {
            String plain = MentionParser.toPlain(comment.getContent());
            String title;
            String link;

            if (comment.getTask() != null) {
                title = comment.getTask().getTitle();
                link = NotificationService.taskLink(comment.getTask());
            } else if (comment.getBlock() != null) {
                title = comment.getBlock().getPage().getTitle();
                link = "/pages/" + comment.getBlock().getPage().getPageId();
            } else {
                continue;
            }

            items.add(new SearchItem("COMMENT", comment.getCommentId(), title, excerpt(plain, lower), null,
                comment.getUser().getNickname(), link));
        }

        return items;
    }

    private List<SearchItem> searchEvents(Workspace workspace, String lower, String like) {

        List<Event> events = em.createQuery("select e from Event e where e.workspace = :ws "
            + "and (lower(e.title) like :kw escape '!' or lower(coalesce(e.description, '')) like :kw escape '!') "
            + "order by e.startDatetime desc", Event.class).setParameter("ws", workspace).setParameter("kw", like)
            .setMaxResults(LIMIT).getResultList();

        return events.stream().<SearchItem>map(event -> {
            boolean inTitle = event.getTitle().toLowerCase().contains(lower);
            String snippet = inTitle || event.getDescription() == null ? null : excerpt(event.getDescription(), lower);
            String when = event.getStartDatetime() == null ? null : event.getStartDatetime().format(DATE_FORMAT);

            return new SearchItem("EVENT", event.getEventId(), event.getTitle(), snippet, null, when, "/calendar");
        }).toList();
    }

    // ---------- 도우미 ----------

    private SearchItem pageItem(Page page, String snippet) {
        return new SearchItem("PAGE", page.getPageId(), page.getTitle(), snippet, page.getIcon(), null,
            "/pages/" + page.getPageId());
    }

    // 블록 content(JSON 봉투)의 글자만 꺼내요(서식 태그는 지워요). 글이 없는 블록(이미지 등)은 null.
    private String blockText(Block block) {

        if (block.getContent() == null || block.getContent().isBlank()) {
            return null;
        }

        try {
            JsonNode node = OBJECT_MAPPER.readTree(block.getContent());
            JsonNode text = node.isObject() ? node.get("text") : node;

            if (text == null || !text.isTextual()) {
                return null;
            }

            return stripHtml(text.asText());
        } catch (Exception e) {
            return null;
        }
    }

    private static String stripHtml(String html) {
        return html.replaceAll("<[^>]*>", "").replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">")
            .replace("&quot;", "\"").replace("&#39;", "'").replace("&amp;", "&");
    }

    // 검색어 앞뒤 글을 잘라서 한 줄로 보여줘요: "…앞글 검색어 뒷글…"
    private static String excerpt(String text, String lower) {

        String flat = text.replaceAll("\\s+", " ").trim();
        int index = flat.toLowerCase().indexOf(lower);

        if (index < 0) {
            return flat.length() > 80 ? flat.substring(0, 80) + "…" : flat;
        }

        int start = Math.max(0, index - 24);
        int end = Math.min(flat.length(), index + lower.length() + 56);

        return (start > 0 ? "…" : "") + flat.substring(start, end) + (end < flat.length() ? "…" : "");
    }

    // LIKE의 특수문자(% _)를 글자 그대로 찾게 '!'로 막아요.
    private static String escapeLike(String value) {
        return value.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
