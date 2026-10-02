package com.flowspace.dto.retrospective;

// @formatter:off

public record ParticipantItem(

    Long userId,
    String name,
    Long profileFileId,
    String profileImageUrl

) { }

// @formatter:on