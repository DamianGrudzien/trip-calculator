package com.tripcalculator.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "expenses")
public class Expense extends PanacheEntityBase {

    @Id
    @GeneratedValue
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    public Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    public TripFamily family;

    @Column(nullable = false)
    public String description;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal amount;

    @Column(nullable = false)
    public String currency = "PLN";

    @Column(name = "exchange_rate", nullable = false, precision = 8, scale = 4)
    public BigDecimal exchangeRate = BigDecimal.ONE;

    @Column(name = "amount_pln", nullable = false, precision = 12, scale = 2)
    public BigDecimal amountPln;

    @Column(nullable = false)
    public String category = "other";

    @Column(name = "paid_by_person")
    public String paidByPerson;

    @Column(name = "expense_date", nullable = false)
    public LocalDate expenseDate;
}
