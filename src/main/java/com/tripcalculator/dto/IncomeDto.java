package com.tripcalculator.dto;

import java.math.BigDecimal;

public class IncomeDto {
    public String id;
    public String description;
    public BigDecimal amount;
    public String currency;
    public BigDecimal exchangeRate;
    public BigDecimal amountPLN;
    public String category;
    public String receivedByFamily;
    public String receivedByPerson;
    public String date;

    public IncomeDto() {}
}
