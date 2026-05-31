package com.tripcalculator.dto;

import java.util.List;

public class FamilyDto {
    public String id;
    public String name;
    public List<String> members;

    public FamilyDto() {}

    public FamilyDto(String id, String name, List<String> members) {
        this.id = id;
        this.name = name;
        this.members = members;
    }
}
