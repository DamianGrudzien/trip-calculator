package com.tripcalculator.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "family_members")
public class FamilyMember extends PanacheEntityBase {

    @Id
    @GeneratedValue
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    public TripFamily family;

    @Column(nullable = false)
    public String name;

    @Column(name = "sort_order", nullable = false)
    public int sortOrder;
}
