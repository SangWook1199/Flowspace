FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon
COPY src src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system flowspace && mkdir uploads && chown flowspace uploads
COPY --from=build /app/build/libs/*.jar app.jar
USER flowspace
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]