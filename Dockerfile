FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Copy Gradle wrapper and build files first (layer cache for dependencies)
COPY gradlew .
COPY gradle ./gradle
COPY build.gradle settings.gradle* ./

RUN chmod +x gradlew

# Pre-download dependencies (cached unless build.gradle changes)
RUN ./gradlew dependencies --no-daemon || true

# Copy source and build the Spring Boot fat JAR
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

# Render injects PORT automatically (defaults to 10000 for Docker web services)
ENV PORT=10000
EXPOSE 10000

ENTRYPOINT ["sh", "-c", "java -jar app.jar --server.port=${PORT}"]
