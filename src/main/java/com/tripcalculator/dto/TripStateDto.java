package com.tripcalculator.dto;

import java.util.List;

public class TripStateDto {
    public List<FamilyDto> families;
    public List<ExpenseDto> expenses;
    public List<IncomeDto> incomes;
    public SettingsDto settings;

    public TripStateDto() {}

    public TripStateDto(List<FamilyDto> families,
                        List<ExpenseDto> expenses,
                        List<IncomeDto> incomes,
                        SettingsDto settings) {
        this.families = families;
        this.expenses = expenses;
        this.incomes = incomes;
        this.settings = settings;
    }
}
