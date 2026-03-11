# SurveyApp

A full-stack survey management system built with **.NET 8** (Clean Architecture) and **React TypeScript**. Admins create answer templates, questions, and surveys, assign them to users, and track completion through detailed reports. Users fill in assigned surveys and view their history.

[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=flat-square&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-EF_Core-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Default Credentials](#default-credentials)
- [Switching Databases](#switching-databases)

---

## Features

### Admin Panel
| Page | Description |
|------|-------------|
| **Dashboard** | Overview stats, active/expired survey breakdown, and recent survey table |
| **Answer Templates** | Create reusable option sets (2–4 choices) used across questions |
| **Questions** | Manage questions linked to answer templates; view option counts |
| **Surveys** | Create surveys with date ranges, assign questions and users |
| **Users** | Create, update, and delete user accounts; assign roles |
| **Reports** | Completion rates with progress bars, response detail drill-down |

### User Panel
| Feature | Description |
|---------|-------------|
| **My Surveys** | Tabbed list: Active, Completed, Upcoming, Expired |
| **Fill Survey** | Answer all questions, submit once per survey |
| **Question Preview** | See answer template name and options per question in the list |
| **Search** | Filter by title, description, question text, template name, or option text |

### Core Business Rules
- Surveys with received responses cannot be edited or deleted
- Passive users cannot be assigned to surveys or submit responses
- Questions used in surveys cannot be deleted until removed from all surveys
- Templates used in questions cannot be deleted until re-assigned
- The last remaining active admin cannot be deleted
- JWT tokens are validated for expiry on every page load

---

## Architecture

### Backend — Clean Architecture

Dependencies flow strictly inward. The Domain layer has zero external dependencies.

```
SurveyApp/
├── Backend/
│   ├── SurveyApp.Domain/           # Entities, repository interfaces
│   ├── SurveyApp.Application/      # Use cases, DTOs, service interfaces
│   ├── SurveyApp.Infrastructure/   # EF Core, repositories, Unit of Work
│   └── SurveyApp.API/              # Controllers, JWT middleware, Swagger
│
└── Frontend/
    └── survey-app/src/
        ├── api/                    # Axios HTTP client
        ├── store/                  # Zustand auth store
        ├── pages/admin/            # Admin pages
        ├── pages/user/             # User-facing pages
        ├── components/             # Shared UI components
        ├── types/                  # TypeScript interfaces
        └── styles/                 # Global CSS
```

**Dependency direction:** `API → Application → Domain ← Infrastructure`

### Frontend — Component Architecture

- **Zustand** manages authentication state (token, role, user info)
- **React Router v6** handles client-side routing with role-based guards
- **Axios interceptors** attach the Bearer token to every request and redirect to login on 401
- **URL search params** enable shareable filtered views across admin pages

---

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| .NET 8 | Web API framework |
| Entity Framework Core 8 | ORM |
| SQLite | Embedded database (swappable — see [Switching Databases](#switching-databases)) |
| JWT Bearer | Stateless authentication |
| BCrypt.Net | Password hashing |
| Swagger / OpenAPI | Interactive API documentation |

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Static typing |
| Zustand | Lightweight global state |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| Vite | Build tool and dev server |

---

## Database Schema

```
Users
  Id · Email (unique) · PasswordHash · FullName · Role (Admin|User) · IsActive · CreatedAt

AnswerTemplates
  Id · Name · IsActive · CreatedAt · UpdatedAt

AnswerOptions
  Id · AnswerTemplateId (FK) · Text · OrderIndex

Questions
  Id · Text · AnswerTemplateId (FK) · IsActive · CreatedAt · UpdatedAt

Surveys
  Id · Title · Description · StartDate · EndDate · IsActive · CreatedAt · UpdatedAt

SurveyQuestions
  Id · SurveyId (FK) · QuestionId (FK) · OrderIndex

SurveyAssignments
  Id · SurveyId (FK) · UserId (FK) · AssignedAt
  UNIQUE (SurveyId, UserId)

SurveyResponses
  Id · SurveyId (FK) · UserId (FK) · SubmittedAt
  UNIQUE (SurveyId, UserId)

SurveyAnswers
  Id · SurveyResponseId (FK) · QuestionId (FK) · AnswerOptionId (FK)
```

---

## API Reference

All endpoints require `Content-Type: application/json`.  
Protected endpoints require `Authorization: Bearer <token>`.

---

### Authentication

#### `POST /api/auth/login`

**Request**
```json
{ "email": "admin@surveyapp.com", "password": "Admin123!" }
```

**Response `200 OK`**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "email": "admin@surveyapp.com",
  "fullName": "System Admin",
  "role": "Admin",
  "isActive": true
}
```

**Response `401 Unauthorized`**
```json
{ "message": "Invalid credentials" }
```

---

### Users *(Admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/{id}` | Get user by ID |
| `POST` | `/api/users` | Create user |
| `PUT` | `/api/users/{id}` | Update user |
| `DELETE` | `/api/users/{id}` | Delete user |

**Create / Update body**
```json
{
  "email": "user@example.com",
  "password": "Secret123!",
  "fullName": "Jane Doe",
  "role": "User",
  "isActive": true
}
```

---

### Answer Templates *(Admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/answertemplates` | List all templates with options |
| `GET` | `/api/answertemplates/{id}` | Get template by ID |
| `POST` | `/api/answertemplates` | Create template (2–4 options required) |
| `PUT` | `/api/answertemplates/{id}` | Update template |
| `DELETE` | `/api/answertemplates/{id}` | Delete template (blocked if used in questions) |

**Create body**
```json
{
  "name": "Agreement Scale",
  "isActive": true,
  "options": ["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"]
}
```

---

### Questions *(Admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/questions` | List all questions with template info |
| `GET` | `/api/questions/{id}` | Get question with full template and options |
| `POST` | `/api/questions` | Create question |
| `PUT` | `/api/questions/{id}` | Update question |
| `DELETE` | `/api/questions/{id}` | Delete question (blocked if used in surveys) |

**Create body**
```json
{
  "text": "How satisfied are you with our service?",
  "answerTemplateId": 1,
  "isActive": true
}
```

---

### Surveys *(Admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/surveys` | List all surveys with assigned/response counts |
| `GET` | `/api/surveys/{id}` | Get survey with questions and assigned user IDs |
| `POST` | `/api/surveys` | Create survey |
| `PUT` | `/api/surveys/{id}` | Update survey (blocked if responses exist) |
| `DELETE` | `/api/surveys/{id}` | Delete survey (blocked if responses exist) |

**Create body**
```json
{
  "title": "Q4 Employee Satisfaction",
  "description": "End of year review",
  "startDate": "2024-12-01T00:00:00",
  "endDate": "2024-12-31T00:00:00",
  "isActive": true,
  "questionIds": [1, 2, 3],
  "userIds": [2, 3, 4]
}
```

---

### Reports *(Admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports` | List all surveys with completion stats |
| `GET` | `/api/reports/{surveyId}` | Full report: who completed, who hasn't, all answers |

**Report response `200 OK`**
```json
{
  "surveyId": 1,
  "title": "Q4 Employee Satisfaction",
  "totalAssigned": 10,
  "totalCompleted": 7,
  "totalPending": 3,
  "completedResponses": [
    {
      "userId": 2,
      "userName": "Jane Doe",
      "userEmail": "jane@example.com",
      "submittedAt": "2024-12-15T10:30:00",
      "answers": [
        { "questionId": 1, "questionText": "How satisfied are you?", "answerText": "Agree" }
      ]
    }
  ],
  "pendingUsers": [
    { "id": 3, "fullName": "John Smith", "email": "john@example.com", "role": "User", "isActive": true }
  ]
}
```

---

### My Surveys *(User only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/my-surveys` | List all assigned surveys (with questions and options) |
| `GET` | `/api/my-surveys/{surveyId}` | Get survey detail for filling (active and in-date only) |
| `POST` | `/api/my-surveys/{surveyId}/submit` | Submit answers |

**Submit body**
```json
{
  "surveyId": 1,
  "answers": [
    { "questionId": 1, "answerOptionId": 2 },
    { "questionId": 2, "answerOptionId": 5 }
  ]
}
```

**Response `400 Bad Request`** (already submitted or survey unavailable)
```json
{ "message": "Survey already completed or not available" }
```

---

## Getting Started

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| .NET SDK | 8.0 | [dotnet.microsoft.com](https://dotnet.microsoft.com/en-us/download/dotnet/8.0) |
| Node.js | 18+ LTS | [nodejs.org](https://nodejs.org/en/download) |

Verify installations:
```sh
dotnet --version   # 8.x.x
node --version     # v18+
npm --version
```

---

### 1. Clone the Repository

```sh
git clone https://github.com/ferhattufekci/SurveyApp.git
cd SurveyApp
```

---

### 2. Run the Backend

```sh
cd Backend/SurveyApp.API
```

Install the EF Core CLI tool (one-time):
```sh
dotnet tool install --global dotnet-ef
```

Restore dependencies and create the database:
```sh
dotnet restore
dotnet ef migrations add InitialCreate --project ..\SurveyApp.Infrastructure --startup-project .
dotnet ef database update --project ..\SurveyApp.Infrastructure --startup-project .
dotnet run
```

> API: http://localhost:5000  
> Swagger: http://localhost:5000/swagger

---

### 3. Run the Frontend

Open a **new terminal** (keep the backend running):

```sh
cd Frontend/survey-app
npm install
npm run dev
```

> App: http://localhost:3000

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@surveyapp.com | Admin123! |

Additional users can be created from **Admin Panel → Users**.

---

## Switching Databases

The default SQLite database can be replaced with any EF Core-compatible provider.

**PostgreSQL example**

`SurveyApp.Infrastructure.csproj`:
```xml
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.0" />
```

`Program.cs`:
```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
```

`appsettings.json`:
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=surveyapp;Username=postgres;Password=yourpassword"
}
```

---

## License

[MIT](LICENSE)
