package com.flowspace.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.dto.database.BlockDatabaseCellResponse;
import com.flowspace.dto.database.BlockDatabaseCellUpdateRequest;
import com.flowspace.dto.database.BlockDatabaseColumnCreateRequest;
import com.flowspace.dto.database.BlockDatabaseColumnOptionCreateRequest;
import com.flowspace.dto.database.BlockDatabaseColumnOptionOrderItem;
import com.flowspace.dto.database.BlockDatabaseColumnOptionReorderRequest;
import com.flowspace.dto.database.BlockDatabaseColumnOptionResponse;
import com.flowspace.dto.database.BlockDatabaseColumnOptionUpdateRequest;
import com.flowspace.dto.database.BlockDatabaseColumnOrderItem;
import com.flowspace.dto.database.BlockDatabaseColumnReorderRequest;
import com.flowspace.dto.database.BlockDatabaseColumnResponse;
import com.flowspace.dto.database.BlockDatabaseColumnUpdateRequest;
import com.flowspace.dto.database.BlockDatabaseColumnWidthUpdateRequest;
import com.flowspace.dto.database.BlockDatabaseRowCreateRequest;
import com.flowspace.dto.database.BlockDatabaseRowOrderItem;
import com.flowspace.dto.database.BlockDatabaseRowReorderRequest;
import com.flowspace.dto.database.BlockDatabaseRowResponse;
import com.flowspace.dto.database.DatabaseCreateRequest;
import com.flowspace.dto.database.DatabaseDetailResponse;
import com.flowspace.dto.database.DatabaseResponse;
import com.flowspace.dto.database.DatabaseUpdateRequest;
import com.flowspace.dto.database.DatabaseViewUpdateRequest;
import com.flowspace.entity.Block;
import com.flowspace.entity.BlockDatabase;
import com.flowspace.entity.BlockDatabaseCell;
import com.flowspace.entity.BlockDatabaseColumn;
import com.flowspace.entity.BlockDatabaseColumnOption;
import com.flowspace.entity.BlockDatabaseRow;
import com.flowspace.entity.Page;
import com.flowspace.entity.User;
import com.flowspace.entity.enums.BlockType;
import com.flowspace.entity.enums.DatabaseColumnType;
import com.flowspace.entity.enums.DatabaseViewType;
import com.flowspace.entity.enums.TaskStatusCategory;
import com.flowspace.entity.enums.WorkspaceColor;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.BlockDatabaseCellRepository;
import com.flowspace.repository.BlockDatabaseColumnOptionRepository;
import com.flowspace.repository.BlockDatabaseColumnRepository;
import com.flowspace.repository.BlockDatabaseRepository;
import com.flowspace.repository.BlockDatabaseRowRepository;
import com.flowspace.repository.BlockRepository;
import com.flowspace.repository.PageRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class BlockDatabaseService {

    private final BlockDatabaseRepository blockDatabaseRepository;
    private final BlockRepository blockRepository;
    private final PageRepository pageRepository;
    private final BlockDatabaseColumnRepository columnRepository;
    private final BlockDatabaseRowRepository rowRepository;
    private final BlockDatabaseCellRepository cellRepository;
    private final BlockDatabaseColumnOptionRepository optionRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    // SELECT/MULTI_SELECT 컬럼 이름이 이렇게 생기면(우선순위류) 프리셋을
    // 채워줘요 — 프론트엔드 DatabaseBlock.jsx의 SELECT_OPTION_PRESETS와
    // 패턴·옵션을 그대로 맞췄어요.
    private static final Pattern PRIORITY_OPTION_PATTERN = Pattern.compile("우선순위|priority",
        Pattern.CASE_INSENSITIVE);
    // HTTP 메서드류 컬럼 이름 패턴 — 역시 SELECT_OPTION_PRESETS와 동일해요.
    private static final Pattern METHOD_OPTION_PATTERN = Pattern.compile("method|메서드", Pattern.CASE_INSENSITIVE);

    // 컬럼 옵션 기본값 하나를 나타내는 값 객체 — statusGroup은 STATUS 옵션에만
    // 쓰이고 SELECT/MULTI_SELECT 옵션에서는 항상 null이에요.
    private record OptionSeed(String value, WorkspaceColor color, TaskStatusCategory statusGroup) {}

    // 컬럼 응답 DTO를 옵션까지 채워서 만들어요 — SELECT/MULTI_SELECT/STATUS가
    // 아닌 컬럼은 옵션이 항상 빈 리스트예요.
    private BlockDatabaseColumnResponse toColumnResponse(BlockDatabaseColumn column) {
        List<BlockDatabaseColumnOptionResponse> options = optionRepository.findByColumnOrderByPositionAsc(column)
            .stream().map(BlockDatabaseColumnOptionResponse::from).toList();
        return BlockDatabaseColumnResponse.from(column, options);
    }

    // 컬럼이 SELECT/MULTI_SELECT/STATUS로 만들어지거나 바뀌었는데 옵션이
    // 아직 하나도 없으면 기본 옵션을 채워줘요 — 프론트엔드 retypeColumn()의
    // "옵션이 비어 있을 때만 프리셋을 채운다" 규칙과 똑같이, 이미 옵션이
    // 있으면(사용자가 직접 만든 옵션 포함) 절대 덮어쓰지 않아요.
    private void seedDefaultOptionsIfEmpty(BlockDatabaseColumn column) {

        if (!optionRepository.findByColumnOrderByPositionAsc(column).isEmpty()) {
            return;
        }

        List<OptionSeed> seeds = defaultOptionSeeds(column.getType(), column.getName());

        int position = 0;

        for (OptionSeed seed : seeds) {
            BlockDatabaseColumnOption option = BlockDatabaseColumnOption.builder().column(column).value(seed.value())
                .color(seed.color()).statusGroup(seed.statusGroup()).position(position++).build();

            optionRepository.save(option);
        }
    }

    // 컬럼 타입·이름에 맞는 기본 옵션 목록을 돌려줘요. STATUS는 항상
    // task_statuses(TODO/IN_PROGRESS/DONE)와 맞춘 3개 고정값을, SELECT/
    // MULTI_SELECT는 컬럼 이름이 우선순위·HTTP 메서드류로 뻔히 보일 때만
    // 프리셋을 주고, 그 외엔 빈 채로 시작해서 사용자가 직접 옵션을 만들면
    // 팔레트가 순서대로 배정되게 해요(프론트엔드와 동일한 정책).
    private List<OptionSeed> defaultOptionSeeds(DatabaseColumnType type, String columnName) {

        if (type == DatabaseColumnType.STATUS) {
            return List.of(new OptionSeed("할 일", WorkspaceColor.GRAY, TaskStatusCategory.TODO),
                new OptionSeed("진행 중", WorkspaceColor.BLUE, TaskStatusCategory.IN_PROGRESS),
                new OptionSeed("완료", WorkspaceColor.GREEN, TaskStatusCategory.DONE));
        }

        if (type == DatabaseColumnType.SELECT || type == DatabaseColumnType.MULTI_SELECT) {

            String name = columnName == null ? "" : columnName;

            if (PRIORITY_OPTION_PATTERN.matcher(name).find()) {
                return List.of(new OptionSeed("높음", WorkspaceColor.RED, null),
                    new OptionSeed("보통", WorkspaceColor.ORANGE, null),
                    new OptionSeed("낮음", WorkspaceColor.GREEN, null));
            }

            if (METHOD_OPTION_PATTERN.matcher(name).find()) {
                return List.of(new OptionSeed("GET", WorkspaceColor.BLUE, null),
                    new OptionSeed("POST", WorkspaceColor.GREEN, null),
                    new OptionSeed("PUT", WorkspaceColor.ORANGE, null),
                    new OptionSeed("PATCH", WorkspaceColor.ORANGE, null),
                    new OptionSeed("DELETE", WorkspaceColor.RED, null));
            }

            return List.of();
        }

        return List.of();
    }

    // 데이터베이스 생성 — 노션처럼 이름(제목) · 생성 일시 · 사람 3개
    // 컬럼과 시드 행(=페이지) 1개를 함께 만들어요. 프론트엔드 기본
    // 데이터베이스(BlockEditor.jsx의 createDefaultDatabase)와 결과가
    // 같아지도록 서버 쪽에서 한 번에 원자적으로 만들어요.
    public DatabaseResponse createDatabase(Long pageId, DatabaseCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Page page = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(page.getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        BigDecimal position = BigDecimal.valueOf(blockRepository.findByPageOrderByPositionAsc(page).size());

        Block block = Block.builder().page(page).type(BlockType.DATABASE).position(position).createdBy(user).build();

        blockRepository.save(block);

        String title = (request.title() == null || request.title().isBlank()) ? "제목 없음" : request.title();

        DatabaseViewType viewType = request.viewType() == null ? DatabaseViewType.TABLE : request.viewType();

        BlockDatabase database = BlockDatabase.builder().block(block).title(title).viewType(viewType).build();

        blockDatabaseRepository.save(database);

        // 표(TABLE)는 속성 유형도 행 페이지도 없는 단순한 텍스트 칸이라, 이름 없는 텍스트 열 3개 · 행 3개로 시작해요.
        if (viewType == DatabaseViewType.TABLE) {

            List<BlockDatabaseColumn> tableColumns = List.of(createColumnEntity(database, "", DatabaseColumnType.TEXT, 0),
                createColumnEntity(database, "", DatabaseColumnType.TEXT, 1),
                createColumnEntity(database, "", DatabaseColumnType.TEXT, 2));

            for (int i = 0; i < 3; i++) {

                BlockDatabaseRow tableRow = createRowWithPage(database, null, i);

                for (BlockDatabaseColumn column : tableColumns) {
                    cellRepository
                        .save(BlockDatabaseCell.builder().row(tableRow).column(column).value(null).build());
                }
            }

            return DatabaseResponse.from(database);
        }

        BlockDatabaseColumn nameColumn = createColumnEntity(database, "이름", DatabaseColumnType.TITLE, 0);
        BlockDatabaseColumn createdTimeColumn =
            createColumnEntity(database, "생성 일시", DatabaseColumnType.CREATED_TIME, 1);
        BlockDatabaseColumn personColumn = createColumnEntity(database, "사람", DatabaseColumnType.PERSON, 2);

        List<BlockDatabaseColumn> seedColumns = List.of(nameColumn, createdTimeColumn, personColumn);

        BlockDatabaseRow seedRow = createRowWithPage(database, resolveRowPage(request.seedPageId(), page, user), 0);

        for (BlockDatabaseColumn column : seedColumns) {
            BlockDatabaseCell cell = BlockDatabaseCell.builder().row(seedRow).column(column).value(null).build();

            cellRepository.save(cell);
        }

        return DatabaseResponse.from(database);
    }

    // 컬럼 엔티티 하나를 만들고 저장해요 — createDatabase()의 기본 컬럼
    // 시딩에서 공통으로 쓸 수 있게 뽑아냈어요.
    private BlockDatabaseColumn createColumnEntity(BlockDatabase database, String name, DatabaseColumnType type,
        int position) {

        BlockDatabaseColumn column = BlockDatabaseColumn.builder().database(database).name(name).type(type)
            .position(position).build();

        columnRepository.save(column);

        return column;
    }

    // 행 + 하위 페이지를 함께 만들고 저장해요 — "행 = 페이지" 모델이라
    // 행을 만드는 순간 바로 하위 페이지도 같이 만들어 연결해요.
    // createRow()와 createDatabase()의 시드 행 생성에서 공통으로 써요.
    private BlockDatabaseRow createRowWithPage(BlockDatabase database, Page rowPage, int position) {

        BlockDatabaseRow row = BlockDatabaseRow.builder().database(database).page(rowPage).position(position).build();

        rowRepository.save(row);

        return row;
    }

    // 행에 연결할 페이지를 정해요 — 연결할 페이지가 넘어왔고(같은 워크스페이스, 다른 행에 안 쓰이는 페이지) 이면
    // 그 페이지를, 아니면 이 데이터베이스가 있는 페이지의 하위 페이지로 새로 만들어요.
    private Page resolveRowPage(Long pageId, Page ownerPage, User user) {

        if (pageId != null) {

            Page existing = pageRepository.findByPageIdAndIsDeletedFalse(pageId)
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.PAGE_NOT_FOUND));

            if (!existing.getWorkspace().getWorkspaceId().equals(ownerPage.getWorkspace().getWorkspaceId())) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }

            if (rowRepository.findByPage(existing).isEmpty()) {
                return existing;
            }
        }

        Page rowPage = Page.builder().workspace(ownerPage.getWorkspace()).parentPage(ownerPage).createdBy(user)
            .build();

        return pageRepository.save(rowPage);
    }

    // 데이터베이스 단건 조회
    @Transactional(readOnly = true)
    public DatabaseResponse getDatabase(Long databaseId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabase database = blockDatabaseRepository.findById(databaseId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(database.getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        return DatabaseResponse.from(database);
    }

    // 데이터베이스 제목 수정
    public DatabaseResponse updateDatabase(Long databaseId, DatabaseUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabase database = blockDatabaseRepository.findById(databaseId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(database.getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        String title = request.title().isBlank() ? "제목 없음" : request.title();

        database.updateTitle(title);

        return DatabaseResponse.from(database);
    }

    // 데이터베이스 삭제
    public void deleteDatabase(Long databaseId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabase database = blockDatabaseRepository.findById(databaseId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(database.getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        blockDatabaseRepository.delete(database);
    }

    // 컬럼 생성
    public BlockDatabaseColumnResponse createColumn(Long databaseId, BlockDatabaseColumnCreateRequest request,
        String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabase database = blockDatabaseRepository.findById(databaseId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(database.getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        int position = columnRepository.findByDatabaseOrderByPositionAsc(database).size();

        BlockDatabaseColumn column = BlockDatabaseColumn.builder().database(database).name(request.name())
            .type(request.type()).position(position).build();

        columnRepository.save(column);

        // SELECT/MULTI_SELECT/STATUS로 바로 만들어지는 컬럼이면(요청이 직접
        // 이 타입을 지정한 경우) 기본 옵션을 같이 채워줘요.
        seedDefaultOptionsIfEmpty(column);

        List<BlockDatabaseRow> rows = rowRepository.findByDatabaseOrderByPositionAsc(database);

        for (BlockDatabaseRow row : rows) {
            BlockDatabaseCell cell = BlockDatabaseCell.builder().row(row).column(column).value(null).build();

            cellRepository.save(cell);
        }

        return toColumnResponse(column);
    }

    // 컬럼 수정
    public BlockDatabaseColumnResponse updateColumn(Long columnId, BlockDatabaseColumnUpdateRequest request,
        String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabaseColumn column = columnRepository.findById(columnId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_COLUMN_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(column.getDatabase().getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        column.update(request.name(), request.type());

        // 프론트엔드 retypeColumn()과 동일하게, 타입이 SELECT/MULTI_SELECT/
        // STATUS로 바뀌었는데 옵션이 아직 없으면 기본 옵션을 채워줘요.
        seedDefaultOptionsIfEmpty(column);

        return toColumnResponse(column);
    }

    // 컬럼 너비 변경
    public BlockDatabaseColumnResponse updateColumnWidth(Long columnId, BlockDatabaseColumnWidthUpdateRequest request,
        String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabaseColumn column = columnRepository.findById(columnId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_COLUMN_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(column.getDatabase().getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        column.updateWidth(request.width());

        return toColumnResponse(column);
    }

    // 컬럼 순서 변경
    public void reorderColumns(Long databaseId, BlockDatabaseColumnReorderRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabase database = blockDatabaseRepository.findById(databaseId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(database.getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        for (BlockDatabaseColumnOrderItem item : request.columns()) {

            BlockDatabaseColumn column = columnRepository.findById(item.columnId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_COLUMN_NOT_FOUND));

            if (!column.getDatabase().getDatabaseId().equals(databaseId)) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }

            column.updatePosition(item.position());
        }
    }

    // 컬럼 삭제
    public void deleteColumn(Long columnId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabaseColumn column = columnRepository.findById(columnId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_COLUMN_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(column.getDatabase().getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        columnRepository.delete(column);
    }

    // 컬럼 옵션 생성 (SELECT/MULTI_SELECT/STATUS 컬럼의 선택지)
    public BlockDatabaseColumnOptionResponse createOption(Long columnId, BlockDatabaseColumnOptionCreateRequest request,
        String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabaseColumn column = columnRepository.findById(columnId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_COLUMN_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(column.getDatabase().getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        int position = optionRepository.findByColumnOrderByPositionAsc(column).size();

        BlockDatabaseColumnOption option = BlockDatabaseColumnOption.builder().column(column).value(request.value())
            .color(request.color() == null ? WorkspaceColor.GRAY : request.color())
            .statusGroup(request.statusGroup()).position(position).build();

        optionRepository.save(option);

        return BlockDatabaseColumnOptionResponse.from(option);
    }

    // 컬럼 옵션 수정
    public BlockDatabaseColumnOptionResponse updateOption(Long optionId, BlockDatabaseColumnOptionUpdateRequest request,
        String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabaseColumnOption option = optionRepository.findById(optionId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_OPTION_NOT_FOUND));

        workspaceMemberRepository
            .findByWorkspaceAndUser(option.getColumn().getDatabase().getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        option.update(request.value(), request.color() == null ? WorkspaceColor.GRAY : request.color(),
            request.statusGroup());

        return BlockDatabaseColumnOptionResponse.from(option);
    }

    // 컬럼 옵션 순서 변경
    public void reorderOptions(Long columnId, BlockDatabaseColumnOptionReorderRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabaseColumn column = columnRepository.findById(columnId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_COLUMN_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(column.getDatabase().getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        for (BlockDatabaseColumnOptionOrderItem item : request.options()) {

            BlockDatabaseColumnOption option = optionRepository.findById(item.optionId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_OPTION_NOT_FOUND));

            if (!option.getColumn().getColumnId().equals(columnId)) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }

            option.updatePosition(item.position());
        }
    }

    // 컬럼 옵션 삭제
    public void deleteOption(Long optionId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabaseColumnOption option = optionRepository.findById(optionId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_OPTION_NOT_FOUND));

        workspaceMemberRepository
            .findByWorkspaceAndUser(option.getColumn().getDatabase().getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        optionRepository.delete(option);
    }

    // 행 생성
    public BlockDatabaseRowResponse createRow(Long databaseId, BlockDatabaseRowCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabase database = blockDatabaseRepository.findById(databaseId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(database.getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        int position = rowRepository.findByDatabaseOrderByPositionAsc(database).size();

        // 노션처럼 행을 만드는 순간 이미 페이지예요 — "아직 페이지가 없는
        // 행"이라는 상태를 안 만들려고, 행을 만들 때 바로 하위 페이지도
        // 같이 만들어 연결해요. 이 데이터베이스 블록이 속한 페이지의
        // 하위 페이지로 만들어요.
        // 표(TABLE)의 행은 페이지 없이 만들어요. 연결할 페이지(pageId)가 오면 새로 만들지 않고 그 페이지를 써요.
        Page ownerPage = database.getBlock().getPage();

        Page rowPage = database.getViewType() == DatabaseViewType.TABLE ? null
            : resolveRowPage(request == null ? null : request.pageId(), ownerPage, user);

        BlockDatabaseRow row = createRowWithPage(database, rowPage, position);

        List<BlockDatabaseColumn> columns = columnRepository.findByDatabaseOrderByPositionAsc(database);

        for (BlockDatabaseColumn column : columns) {
            BlockDatabaseCell cell = BlockDatabaseCell.builder().row(row).column(column).value(null).build();

            cellRepository.save(cell);
        }

        return BlockDatabaseRowResponse.from(row);
    }

    // 행 순서 변경
    public void reorderRows(Long databaseId, BlockDatabaseRowReorderRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabase database = blockDatabaseRepository.findById(databaseId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(database.getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        for (BlockDatabaseRowOrderItem item : request.rows()) {

            BlockDatabaseRow row = rowRepository.findById(item.rowId())
                .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_ROW_NOT_FOUND));

            if (!row.getDatabase().getDatabaseId().equals(databaseId)) {
                throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
            }

            row.updatePosition(item.position());
        }
    }

    // 행 삭제
    public void deleteRow(Long rowId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabaseRow row = rowRepository.findById(rowId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_ROW_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(row.getDatabase().getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        // 행 = 페이지라서, 행을 지우면 연결된 페이지(안의 내용까지)도 같이
        // 소프트 삭제해요 — 페이지 쪽 삭제만 하고 행을 남겨두면 "삭제된
        // 페이지를 가리키는 고아 행"이 생겨서요.
        if (row.getPage() != null) {
            row.getPage().delete();
        }

        rowRepository.delete(row);
    }

    // 셀 수정
    public BlockDatabaseCellResponse updateCell(Long databaseId, BlockDatabaseCellUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabase database = blockDatabaseRepository.findById(databaseId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(database.getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        BlockDatabaseRow row = rowRepository.findById(request.rowId())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_ROW_NOT_FOUND));

        BlockDatabaseColumn column = columnRepository.findById(request.columnId())
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_COLUMN_NOT_FOUND));

        if (!row.getDatabase().getDatabaseId().equals(databaseId)
            || !column.getDatabase().getDatabaseId().equals(databaseId)) {
            throw new FlowSpaceException(ErrorCode.ACCESS_DENIED);
        }

        BlockDatabaseCell cell = cellRepository.findByRowAndColumn(row, column)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_CELL_NOT_FOUND));

        cell.updateValue(request.value());

        return BlockDatabaseCellResponse.from(cell);
    }

    // 데이터베이스 전체 조회
    @Transactional(readOnly = true)
    public DatabaseDetailResponse getDatabaseDetail(Long databaseId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabase database = blockDatabaseRepository.findById(databaseId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(database.getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        List<BlockDatabaseColumnResponse> columns = columnRepository.findByDatabaseOrderByPositionAsc(database).stream()
            .map(this::toColumnResponse).toList();

        List<DatabaseDetailResponse.RowData> rows = rowRepository.findByDatabaseOrderByPositionAsc(database).stream()
            .map(row -> new DatabaseDetailResponse.RowData(row.getRowId(),
                row.getPage() == null ? null : row.getPage().getPageId(), row.getPosition(),
                cellRepository.findByRowOrderByColumnPositionAsc(row).stream()
                    .map(cell -> new DatabaseDetailResponse.CellData(cell.getColumn().getColumnId(), cell.getValue()))
                    .toList()))
            .toList();

        return new DatabaseDetailResponse(database.getDatabaseId(), database.getTitle(), database.getViewType(),
            columns, rows);
    }

    // 데이터베이스 View 변경
    public DatabaseResponse updateViewType(Long databaseId, DatabaseViewUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabase database = blockDatabaseRepository.findById(databaseId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(database.getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        database.updateViewType(request.viewType());

        return DatabaseResponse.from(database);
    }
}