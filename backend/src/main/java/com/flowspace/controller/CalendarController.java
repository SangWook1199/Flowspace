package com.flowspace.controller;

import com.flowspace.dto.calendar.CalendarItemResponse;
import com.flowspace.service.CalendarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "OAuth2")
public class CalendarController {

    private final CalendarService calendarService;

    @Operation(summary = "캘린더 조회")
    @GetMapping("/workspaces/{workspaceId}/calendar")
    public List<CalendarItemResponse> getCalendar(@PathVariable Long workspaceId, @RequestParam Integer year,
        @RequestParam Integer month, @RequestParam(required = false) Long sprintId,
        @AuthenticationPrincipal UserDetails userDetails) {
        return calendarService.getCalendar(workspaceId, year, month, sprintId, userDetails.getUsername());
    }
}