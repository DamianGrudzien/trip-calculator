package com.tripcalculator.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "trip_settings")
public class TripSettings extends PanacheEntityBase {

    @Id
    public UUID tripId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "trip_id")
    public Trip trip;

    @Column(name = "split_ratio_f1", nullable = false)
    public int splitRatioF1 = 50;

    @Column(name = "split_ratio_f2", nullable = false)
    public int splitRatioF2 = 50;

    @Column(name = "default_eur_rate", nullable = false, precision = 8, scale = 4)
    public BigDecimal defaultEurRate = new BigDecimal("4.25");
}
