package com.flowspace.service;

import java.time.LocalDateTime;

import com.flowspace.dto.event.EventCreateRequest;
import com.flowspace.dto.event.EventResponse;
import com.flowspace.dto.event.EventUpdateRequest;
import com.flowspace.entity.Event;
import com.flowspace.entity.User;
import com.flowspace.entity.Workspace;
import com.flowspace.exception.ErrorCode;
import com.flowspace.exception.FlowSpaceException;
import com.flowspace.repository.EventRepository;
import com.flowspace.repository.UserRepository;
import com.flowspace.repository.WorkspaceMemberRepository;
import com.flowspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class EventService {

    private final EventRepository eventRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    // 이벤트 생성
    public EventResponse createEvent(Long workspaceId, EventCreateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.WORKSPACE_NOT_FOUND));

        validateMember(workspace, user);
        validateEventTime(request.startDatetime(), request.endDatetime());

        Event event = Event.builder().workspace(workspace).createdBy(user).title(request.title())
            .description(request.description()).color(request.color()).startDatetime(request.startDatetime())
            .endDatetime(request.endDatetime()).build();

        eventRepository.save(event);

        return EventResponse.from(event);
    }

    // 이벤트 단건 조회
    @Transactional(readOnly = true)
    public EventResponse getEvent(Long eventId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.EVENT_NOT_FOUND));

        validateMember(event.getWorkspace(), user);

        return EventResponse.from(event);
    }

    // 이벤트 수정
    public EventResponse updateEvent(Long eventId, EventUpdateRequest request, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.EVENT_NOT_FOUND));

        validateMember(event.getWorkspace(), user);
        validateEventTime(request.startDatetime(), request.endDatetime());

        event.update(request.title(), request.description(), request.color(), request.startDatetime(),
            request.endDatetime());

        return EventResponse.from(event);
    }

    // 이벤트 삭제
    public void deleteEvent(Long eventId, String email) {

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.USER_NOT_FOUND));

        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.EVENT_NOT_FOUND));

        validateMember(event.getWorkspace(), user);

        eventRepository.delete(event);
    }

    // 워크스페이스 멤버 확인
    private void validateMember(Workspace workspace, User user) {
        workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
            .orElseThrow(() -> new FlowSpaceException(ErrorCode.ACCESS_DENIED));
    }

    // 이벤트 시간 검증
    private void validateEventTime(LocalDateTime start, LocalDateTime end) {
        if (end != null && end.isBefore(start)) {
            throw new FlowSpaceException(ErrorCode.INVALID_EVENT_TIME);
        }
    }
}