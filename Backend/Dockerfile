# ── Build Stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files first for layer caching
COPY SurveyApp.Domain/SurveyApp.Domain.csproj           SurveyApp.Domain/
COPY SurveyApp.Application/SurveyApp.Application.csproj SurveyApp.Application/
COPY SurveyApp.Infrastructure/SurveyApp.Infrastructure.csproj SurveyApp.Infrastructure/
COPY SurveyApp.API/SurveyApp.API.csproj                 SurveyApp.API/

RUN dotnet restore SurveyApp.API/SurveyApp.API.csproj

# Copy all source files and publish
COPY . .
RUN dotnet publish SurveyApp.API/SurveyApp.API.csproj \
    -c Release \
    -o /app \
    --no-restore

# ── Runtime Stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Create persistent data directory for SQLite
RUN mkdir -p /app/data

COPY --from=build /app .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "SurveyApp.API.dll"]
