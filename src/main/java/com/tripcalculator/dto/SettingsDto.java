package com.tripcalculator.dto;

import java.math.BigDecimal;
import java.util.List;

public class SettingsDto {
    public List<Integer> splitRatio;
    public BigDecimal defaultEurRate;

    public SettingsDto() {}

    public SettingsDto(List<Integer> splitRatio, BigDecimal defaultEurRate) {
        this.splitRatio = splitRatio;
        this.defaultEurRate = defaultEurRate;
    }
}
