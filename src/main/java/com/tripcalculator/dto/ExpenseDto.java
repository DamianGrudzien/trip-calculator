package com.tripcalculator.dto;

import java.math.BigDecimal;

public class ExpenseDto {
    public String id;
    public String description;
    public BigDecimal amount;
    public String currency;
    public BigDecimal exchangeRate;
    public BigDecimal amountPLN;
    public String category;
    public String paidByFamily;
    public String paidByPerson;
    public String date;

    public ExpenseDto() {}
}
