FROM eclipse-temurin:21-jre-alpine

WORKDIR /deployments

COPY target/quarkus-app/lib/           lib/
COPY target/quarkus-app/*.jar          ./
COPY target/quarkus-app/app/           app/
COPY target/quarkus-app/quarkus/       quarkus/

EXPOSE 8080

ENV JAVA_OPTS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar quarkus-run.jar"]
