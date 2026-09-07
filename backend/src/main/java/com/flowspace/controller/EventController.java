package com.flowspace.controller;

import com.flowspace.dto.event.EventCreateRequest;
import com.flowspace.dto.event.EventResponse;
import com.flowspace.dto.event.EventUpdateRequest;
import com.flowspace.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class EventController {

    private final EventService eventService;

    @Operation(summary = "이벤트 생성")
    @PostMapping("/workspaces/{workspaceId}/events")
    public EventResponse createEvent(@PathVariable Long workspaceId, @Valid @RequestBody EventCreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return eventService.createEvent(workspaceId, request, userDetails.getUsername());
    }

    @Operation(summary = "이벤트 단건 조회")
    @GetMapping("/events/{eventId}")
    public EventResponse getEvent(@PathVariable Long eventId, @AuthenticationPrincipal UserDetails userDetails) {
        return eventService.getEvent(eventId, userDetails.getUsername());
    }

    @Operation(summary = "이벤트 수정")
    @PatchMapping("/events/{eventId}")
    public EventResponse updateEvent(@PathVariable Long eventId, @Valid @RequestBody EventUpdateRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {
        return eventService.updateEvent(eventId, request, userDetails.getUsername());
    }

    @Operation(summary = "이벤트 삭제")
    @DeleteMapping("/events/{eventId}")
    public void deleteEvent(@PathVariable Long eventId, @AuthenticationPrincipal UserDetails userDetails) {
        eventService.deleteEvent(eventId, userDetails.getUsername());
    }
}