package com.tripcalculator.resource;

import com.tripcalculator.dto.TripDto;
import com.tripcalculator.model.*;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/api/trips")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TripResource {

    @GET
    public List<TripDto> list() {
        List<Trip> trips = Trip.listAll();
        return trips.stream().map(this::toDto).collect(Collectors.toList());
    }

    @POST
    @Transactional
    public Response create(TripDto body) {
        Trip trip = new Trip();
        trip.name = body.name;
        trip.destination = body.destination;
        trip.startedAt = body.startedAt;
        trip.endedAt = body.endedAt;
        trip.persist();

        // Seed default families
        for (String key : List.of("f1", "f2")) {
            TripFamily family = new TripFamily();
            family.trip = trip;
            family.familyKey = key;
            family.name = key.equals("f1") ? "Rodzina 1" : "Rodzina 2";
            family.persist();
        }

        // Seed default settings
        TripSettings settings = new TripSettings();
        settings.trip = trip;
        settings.persist();

        return Response.status(Response.Status.CREATED).entity(toDto(trip)).build();
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") UUID id) {
        Trip trip = Trip.findById(id);
        if (trip == null) return Response.status(Response.Status.NOT_FOUND).build();
        return Response.ok(toDto(trip)).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        Trip trip = Trip.findById(id);
        if (trip == null) return Response.status(Response.Status.NOT_FOUND).build();
        trip.delete();
        return Response.noContent().build();
    }

    private TripDto toDto(Trip t) {
        TripDto dto = new TripDto();
        dto.id = t.id;
        dto.name = t.name;
        dto.destination = t.destination;
        dto.startedAt = t.startedAt;
        dto.endedAt = t.endedAt;
        dto.createdAt = t.createdAt;
        return dto;
    }
}
