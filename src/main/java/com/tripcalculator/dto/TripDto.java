package com.tripcalculator.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class TripDto {
    public UUID id;
    public String name;
    public String destination;
    public LocalDate startedAt;
    public LocalDate endedAt;
    public OffsetDateTime createdAt;

    public TripDto() {}
}
