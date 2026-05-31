package com.tripcalculator.resource;

import com.tripcalculator.dto.*;
import com.tripcalculator.model.*;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Path("/api/trips/{tripId}")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TripStateResource {

    // ─── Full state ──────────────────────────────────────────────────────────

    @GET
    @Path("/state")
    public Response getState(@PathParam("tripId") UUID tripId) {
        Trip trip = Trip.findById(tripId);
        if (trip == null) return Response.status(Response.Status.NOT_FOUND).build();
        return Response.ok(buildState(trip)).build();
    }

    @PUT
    @Path("/state")
    @Transactional
    public Response replaceState(@PathParam("tripId") UUID tripId, TripStateDto body) {
        Trip trip = Trip.findById(tripId);
        if (trip == null) return Response.status(Response.Status.NOT_FOUND).build();

        // Delete and re-create all families, expenses, incomes, settings
        TripFamily.delete("trip", trip);
        Expense.delete("trip", trip);
        Income.delete("trip", trip);
        TripSettings.deleteById(tripId);

        applyState(trip, body);
        return Response.ok(buildState(trip)).build();
    }

    // ─── Expenses ────────────────────────────────────────────────────────────

    @POST
    @Path("/expenses")
    @Transactional
    public Response addExpense(@PathParam("tripId") UUID tripId, ExpenseDto body) {
        Trip trip = Trip.findById(tripId);
        if (trip == null) return Response.status(Response.Status.NOT_FOUND).build();

        TripFamily family = findFamily(tripId, body.paidByFamily);
        if (family == null) return Response.status(Response.Status.BAD_REQUEST)
                .entity("Unknown family: " + body.paidByFamily).build();

        Expense e = toExpenseEntity(body, trip, family);
        e.persist();
        return Response.status(Response.Status.CREATED).entity(toExpenseDto(e)).build();
    }

    @PUT
    @Path("/expenses/{eid}")
    @Transactional
    public Response updateExpense(@PathParam("tripId") UUID tripId,
                                  @PathParam("eid") UUID eid,
                                  ExpenseDto body) {
        Expense e = Expense.findById(eid);
        if (e == null || !e.trip.id.equals(tripId))
            return Response.status(Response.Status.NOT_FOUND).build();

        TripFamily family = findFamily(tripId, body.paidByFamily);
        if (family == null) return Response.status(Response.Status.BAD_REQUEST)
                .entity("Unknown family: " + body.paidByFamily).build();

        e.family = family;
        e.description = body.description;
        e.amount = body.amount;
        e.currency = body.currency;
        e.exchangeRate = body.exchangeRate;
        e.amountPln = body.amountPLN;
        e.category = body.category;
        e.paidByPerson = body.paidByPerson;
        e.expenseDate = LocalDate.parse(body.date);
        return Response.ok(toExpenseDto(e)).build();
    }

    @DELETE
    @Path("/expenses/{eid}")
    @Transactional
    public Response deleteExpense(@PathParam("tripId") UUID tripId, @PathParam("eid") UUID eid) {
        Expense e = Expense.findById(eid);
        if (e == null || !e.trip.id.equals(tripId))
            return Response.status(Response.Status.NOT_FOUND).build();
        e.delete();
        return Response.noContent().build();
    }

    // ─── Incomes ─────────────────────────────────────────────────────────────

    @POST
    @Path("/incomes")
    @Transactional
    public Response addIncome(@PathParam("tripId") UUID tripId, IncomeDto body) {
        Trip trip = Trip.findById(tripId);
        if (trip == null) return Response.status(Response.Status.NOT_FOUND).build();

        TripFamily family = findFamily(tripId, body.receivedByFamily);
        if (family == null) return Response.status(Response.Status.BAD_REQUEST)
                .entity("Unknown family: " + body.receivedByFamily).build();

        Income i = toIncomeEntity(body, trip, family);
        i.persist();
        return Response.status(Response.Status.CREATED).entity(toIncomeDto(i)).build();
    }

    @PUT
    @Path("/incomes/{iid}")
    @Transactional
    public Response updateIncome(@PathParam("tripId") UUID tripId,
                                 @PathParam("iid") UUID iid,
                                 IncomeDto body) {
        Income i = Income.findById(iid);
        if (i == null || !i.trip.id.equals(tripId))
            return Response.status(Response.Status.NOT_FOUND).build();

        TripFamily family = findFamily(tripId, body.receivedByFamily);
        if (family == null) return Response.status(Response.Status.BAD_REQUEST)
                .entity("Unknown family: " + body.receivedByFamily).build();

        i.family = family;
        i.description = body.description;
        i.amount = body.amount;
        i.currency = body.currency;
        i.exchangeRate = body.exchangeRate;
        i.amountPln = body.amountPLN;
        i.category = body.category;
        i.receivedByPerson = body.receivedByPerson;
        i.incomeDate = LocalDate.parse(body.date);
        return Response.ok(toIncomeDto(i)).build();
    }

    @DELETE
    @Path("/incomes/{iid}")
    @Transactional
    public Response deleteIncome(@PathParam("tripId") UUID tripId, @PathParam("iid") UUID iid) {
        Income i = Income.findById(iid);
        if (i == null || !i.trip.id.equals(tripId))
            return Response.status(Response.Status.NOT_FOUND).build();
        i.delete();
        return Response.noContent().build();
    }

    // ─── Settings ────────────────────────────────────────────────────────────

    @PUT
    @Path("/settings")
    @Transactional
    public Response updateSettings(@PathParam("tripId") UUID tripId, SettingsDto body) {
        Trip trip = Trip.findById(tripId);
        if (trip == null) return Response.status(Response.Status.NOT_FOUND).build();

        TripSettings s = TripSettings.findById(tripId);
        if (s == null) {
            s = new TripSettings();
            s.trip = trip;
        }
        if (body.splitRatio != null && body.splitRatio.size() == 2) {
            s.splitRatioF1 = body.splitRatio.get(0);
            s.splitRatioF2 = body.splitRatio.get(1);
        }
        if (body.defaultEurRate != null) s.defaultEurRate = body.defaultEurRate;
        s.persist();
        return Response.ok(toSettingsDto(s)).build();
    }

    // ─── Families ────────────────────────────────────────────────────────────

    @PUT
    @Path("/families")
    @Transactional
    public Response updateFamilies(@PathParam("tripId") UUID tripId, List<FamilyDto> body) {
        Trip trip = Trip.findById(tripId);
        if (trip == null) return Response.status(Response.Status.NOT_FOUND).build();

        for (FamilyDto dto : body) {
            TripFamily family = findFamily(tripId, dto.id);
            if (family == null) continue;
            family.name = dto.name;
            // Replace members
            FamilyMember.delete("family", family);
            if (dto.members != null) {
                for (int idx = 0; idx < dto.members.size(); idx++) {
                    FamilyMember m = new FamilyMember();
                    m.family = family;
                    m.name = dto.members.get(idx);
                    m.sortOrder = idx;
                    m.persist();
                }
            }
        }
        return Response.ok(buildFamilyDtos(tripId)).build();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private TripStateDto buildState(Trip trip) {
        List<TripFamily> families = TripFamily.list("trip", trip);
        Map<UUID, String> familyKeyById = families.stream()
                .collect(Collectors.toMap(f -> f.id, f -> f.familyKey));

        List<FamilyDto> familyDtos = families.stream()
                .map(f -> {
                    List<FamilyMember> members = FamilyMember.list("family", f);
                    List<String> names = members.stream()
                            .sorted(Comparator.comparingInt(m -> m.sortOrder))
                            .map(m -> m.name)
                            .collect(Collectors.toList());
                    return new FamilyDto(f.familyKey, f.name, names);
                })
                .collect(Collectors.toList());

        List<ExpenseDto> expenseDtos = Expense.<Expense>list("trip", trip).stream()
                .map(e -> {
                    ExpenseDto dto = toExpenseDto(e);
                    dto.paidByFamily = familyKeyById.get(e.family.id);
                    return dto;
                })
                .collect(Collectors.toList());

        List<IncomeDto> incomeDtos = Income.<Income>list("trip", trip).stream()
                .map(i -> {
                    IncomeDto dto = toIncomeDto(i);
                    dto.receivedByFamily = familyKeyById.get(i.family.id);
                    return dto;
                })
                .collect(Collectors.toList());

        TripSettings settings = TripSettings.findById(trip.id);
        SettingsDto settingsDto = settings != null
                ? toSettingsDto(settings)
                : new SettingsDto(List.of(50, 50), new BigDecimal("4.25"));

        return new TripStateDto(familyDtos, expenseDtos, incomeDtos, settingsDto);
    }

    private List<FamilyDto> buildFamilyDtos(UUID tripId) {
        Trip trip = Trip.findById(tripId);
        List<TripFamily> families = TripFamily.list("trip", trip);
        return families.stream().map(f -> {
            List<FamilyMember> members = FamilyMember.list("family", f);
            List<String> names = members.stream()
                    .sorted(Comparator.comparingInt(m -> m.sortOrder))
                    .map(m -> m.name)
                    .collect(Collectors.toList());
            return new FamilyDto(f.familyKey, f.name, names);
        }).collect(Collectors.toList());
    }

    private void applyState(Trip trip, TripStateDto state) {
        Map<String, TripFamily> createdFamilies = new HashMap<>();

        if (state.families != null) {
            for (FamilyDto dto : state.families) {
                TripFamily family = new TripFamily();
                family.trip = trip;
                family.familyKey = dto.id;
                family.name = dto.name != null ? dto.name : dto.id;
                family.persist();
                createdFamilies.put(dto.id, family);

                if (dto.members != null) {
                    for (int idx = 0; idx < dto.members.size(); idx++) {
                        FamilyMember m = new FamilyMember();
                        m.family = family;
                        m.name = dto.members.get(idx);
                        m.sortOrder = idx;
                        m.persist();
                    }
                }
            }
        }

        if (state.expenses != null) {
            for (ExpenseDto dto : state.expenses) {
                TripFamily family = createdFamilies.get(dto.paidByFamily);
                if (family != null) {
                    toExpenseEntity(dto, trip, family).persist();
                }
            }
        }

        if (state.incomes != null) {
            for (IncomeDto dto : state.incomes) {
                TripFamily family = createdFamilies.get(dto.receivedByFamily);
                if (family != null) {
                    toIncomeEntity(dto, trip, family).persist();
                }
            }
        }

        TripSettings settings = new TripSettings();
        settings.trip = trip;
        if (state.settings != null) {
            if (state.settings.splitRatio != null && state.settings.splitRatio.size() == 2) {
                settings.splitRatioF1 = state.settings.splitRatio.get(0);
                settings.splitRatioF2 = state.settings.splitRatio.get(1);
            }
            if (state.settings.defaultEurRate != null)
                settings.defaultEurRate = state.settings.defaultEurRate;
        }
        settings.persist();
    }

    private TripFamily findFamily(UUID tripId, String familyKey) {
        return TripFamily.find("trip.id = ?1 and familyKey = ?2", tripId, familyKey)
                .<TripFamily>firstResultOptional().orElse(null);
    }

    private Expense toExpenseEntity(ExpenseDto dto, Trip trip, TripFamily family) {
        Expense e = new Expense();
        e.trip = trip;
        e.family = family;
        e.description = dto.description;
        e.amount = dto.amount;
        e.currency = dto.currency != null ? dto.currency : "PLN";
        e.exchangeRate = dto.exchangeRate != null ? dto.exchangeRate : BigDecimal.ONE;
        e.amountPln = dto.amountPLN != null ? dto.amountPLN : dto.amount;
        e.category = dto.category != null ? dto.category : "other";
        e.paidByPerson = dto.paidByPerson;
        e.expenseDate = dto.date != null ? LocalDate.parse(dto.date) : LocalDate.now();
        return e;
    }

    private Income toIncomeEntity(IncomeDto dto, Trip trip, TripFamily family) {
        Income i = new Income();
        i.trip = trip;
        i.family = family;
        i.description = dto.description;
        i.amount = dto.amount;
        i.currency = dto.currency != null ? dto.currency : "PLN";
        i.exchangeRate = dto.exchangeRate != null ? dto.exchangeRate : BigDecimal.ONE;
        i.amountPln = dto.amountPLN != null ? dto.amountPLN : dto.amount;
        i.category = dto.category != null ? dto.category : "other_income";
        i.receivedByPerson = dto.receivedByPerson;
        i.incomeDate = dto.date != null ? LocalDate.parse(dto.date) : LocalDate.now();
        return i;
    }

    private ExpenseDto toExpenseDto(Expense e) {
        ExpenseDto dto = new ExpenseDto();
        dto.id = e.id.toString();
        dto.description = e.description;
        dto.amount = e.amount;
        dto.currency = e.currency;
        dto.exchangeRate = e.exchangeRate;
        dto.amountPLN = e.amountPln;
        dto.category = e.category;
        dto.paidByPerson = e.paidByPerson;
        dto.date = e.expenseDate.toString();
        return dto;
    }

    private IncomeDto toIncomeDto(Income i) {
        IncomeDto dto = new IncomeDto();
        dto.id = i.id.toString();
        dto.description = i.description;
        dto.amount = i.amount;
        dto.currency = i.currency;
        dto.exchangeRate = i.exchangeRate;
        dto.amountPLN = i.amountPln;
        dto.category = i.category;
        dto.receivedByPerson = i.receivedByPerson;
        dto.date = i.incomeDate.toString();
        return dto;
    }

    private SettingsDto toSettingsDto(TripSettings s) {
        return new SettingsDto(List.of(s.splitRatioF1, s.splitRatioF2), s.defaultEurRate);
    }
}
