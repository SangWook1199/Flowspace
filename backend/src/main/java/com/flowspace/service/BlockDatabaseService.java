package com.flowspace.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.flowspace.dto.database.BlockDatabaseCellResponse;
import com.flowspace.dto.database.BlockDatabaseCellUpdateRequest;
import com.flowspace.dto.database.BlockDatabaseColumnCreateRequest;
import com.flowspace.dto.database.BlockDatabaseColumnResponse;
import com.flowspace.dto.database.BlockDatabaseColumnUpdateRequest;
import com.flowspace.dto.database.BlockDatabaseRowResponse;
import com.flowspace.dto.database.DatabaseCreateRequest;
import com.flowspace.dto.database.DatabaseDetailResponse;
import com.flowspace.dto.database.DatabaseResponse;
import com.flowspace.dto.database.DatabaseUpdateRequest;
import com.flowspace.entity.Block;
import com.flowspace.entity.BlockDatabase;
import com.flowspace.entity.BlockDatabaseCell;
import com.flowspace.entity.BlockDatabaseColumn;
import com.flowspace.entity.BlockDatabaseRow;
import com.flowspace.entity.Page;
import com.flowspace.entity.User;
import com.flowspace.entity.enums.BlockType;
import com.flowspace.entity.enums.DatabaseColumnType;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.BlockDatabaseCellRepository;
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
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    // 데이터베이스 생성
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

        BlockDatabase database = BlockDatabase.builder().block(block).title(request.title()).build();

        blockDatabaseRepository.save(database);

        BlockDatabaseColumn titleColumn = BlockDatabaseColumn.builder().database(database).name("제목")
            .type(DatabaseColumnType.TITLE).position(0).build();

        columnRepository.save(titleColumn);

        return DatabaseResponse.from(database);
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

        List<BlockDatabaseRow> rows = rowRepository.findByDatabaseOrderByPositionAsc(database);

        for (BlockDatabaseRow row : rows) {
            BlockDatabaseCell cell = BlockDatabaseCell.builder().row(row).column(column).value(null).build();

            cellRepository.save(cell);
        }

        return BlockDatabaseColumnResponse.from(column);
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

        return BlockDatabaseColumnResponse.from(column);
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

    // 행 생성
    public BlockDatabaseRowResponse createRow(Long databaseId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabase database = blockDatabaseRepository.findById(databaseId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(database.getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

        int position = rowRepository.findByDatabaseOrderByPositionAsc(database).size();

        BlockDatabaseRow row = BlockDatabaseRow.builder().database(database).position(position).build();

        rowRepository.save(row);

        List<BlockDatabaseColumn> columns = columnRepository.findByDatabaseOrderByPositionAsc(database);

        for (BlockDatabaseColumn column : columns) {
            BlockDatabaseCell cell = BlockDatabaseCell.builder().row(row).column(column).value(null).build();

            cellRepository.save(cell);
        }

        return BlockDatabaseRowResponse.from(row);
    }

    // 행 삭제
    public void deleteRow(Long rowId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        BlockDatabaseRow row = rowRepository.findById(rowId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.DATABASE_ROW_NOT_FOUND));

        workspaceMemberRepository.findByWorkspaceAndUser(row.getDatabase().getBlock().getPage().getWorkspace(), user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));

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
            .map(BlockDatabaseColumnResponse::from).toList();

        List<DatabaseDetailResponse.RowData> rows = rowRepository.findByDatabaseOrderByPositionAsc(database).stream()
            .map(row -> new DatabaseDetailResponse.RowData(row.getRowId(), row.getPosition(),
                cellRepository.findByRowOrderByColumnPositionAsc(row).stream()
                    .map(cell -> new DatabaseDetailResponse.CellData(cell.getColumn().getColumnId(), cell.getValue()))
                    .toList()))
            .toList();

        return new DatabaseDetailResponse(database.getDatabaseId(), database.getTitle(), columns, rows);
    }
}