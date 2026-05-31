package com.tripcalculator;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class TripStateResourceTest {

    @Test
    void createTripAndFetchState() {
        // Create a trip
        String tripId = given()
                .contentType(ContentType.JSON)
                .body("{\"name\":\"Test Wakacje\",\"destination\":\"Chorwacja\"}")
                .when().post("/api/trips")
                .then()
                .statusCode(201)
                .body("name", is("Test Wakacje"))
                .extract().path("id");

        // Fetch its state
        given()
                .when().get("/api/trips/" + tripId + "/state")
                .then()
                .statusCode(200)
                .body("families", hasSize(2))
                .body("families[0].id", is("f1"))
                .body("families[1].id", is("f2"))
                .body("expenses", hasSize(0))
                .body("incomes", hasSize(0))
                .body("settings.splitRatio", hasSize(2))
                .body("settings.splitRatio[0]", is(50))
                .body("settings.defaultEurRate", notNullValue());
    }

    @Test
    void addExpenseAndVerify() {
        String tripId = given()
                .contentType(ContentType.JSON)
                .body("{\"name\":\"Wydatki Trip\"}")
                .when().post("/api/trips")
                .then().statusCode(201)
                .extract().path("id");

        given()
                .contentType(ContentType.JSON)
                .body("{\"description\":\"Obiad\",\"amount\":80,\"currency\":\"PLN\"," +
                      "\"exchangeRate\":1,\"amountPLN\":80,\"category\":\"food\"," +
                      "\"paidByFamily\":\"f1\",\"paidByPerson\":\"Anna\",\"date\":\"2024-07-15\"}")
                .when().post("/api/trips/" + tripId + "/expenses")
                .then()
                .statusCode(201)
                .body("description", is("Obiad"))
                .body("amountPLN", is(80.0f));

        given()
                .when().get("/api/trips/" + tripId + "/state")
                .then()
                .statusCode(200)
                .body("expenses", hasSize(1))
                .body("expenses[0].paidByFamily", is("f1"))
                .body("expenses[0].category", is("food"));
    }

    @Test
    void unknownTripReturns404() {
        given()
                .when().get("/api/trips/00000000-0000-0000-0000-000000000000/state")
                .then()
                .statusCode(404);
    }
}
