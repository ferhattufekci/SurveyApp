# SurveyApp

**[English](#english) · [Türkçe](#türkçe)**

---

<a name="english"></a>

A full-stack survey management system built with **.NET 8** (Clean Architecture) and **React TypeScript**. Admins create answer templates, questions, and surveys, assign them to users, and track completion through detailed reports. Users fill in assigned surveys and view their history.

[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=flat-square&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-EF_Core-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

## Live Demo

- **Application:** [https://sor-bakalim.vercel.app/](https://sor-bakalim.vercel.app/)
- **Admin Login:** `admin@surveyapp.com` / `Admin123!`

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Default Credentials](#default-credentials)
- [Switching Databases](#switching-databases)
- [Contributing](#contributing)

---

## Features

### Admin Panel

| Page                 | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| **Dashboard**        | Overview stats, active/expired survey breakdown, and recent survey table |
| **Answer Templates** | Create reusable option sets (2–4 choices) used across questions          |
| **Questions**        | Manage questions linked to answer templates; view option counts          |
| **Surveys**          | Create surveys with date ranges, assign questions and users              |
| **Users**            | Create, update, and delete user accounts; assign roles                   |
| **Reports**          | Completion rates with progress bars, response detail drill-down          |

### User Panel

| Feature              | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| **My Surveys**       | Tabbed list: Active, Completed, Upcoming, Expired                          |
| **Fill Survey**      | Answer all questions, submit once per survey                               |
| **Question Preview** | See answer template name and options per question in the list              |
| **Search**           | Filter by title, description, question text, template name, or option text |

### Core Business Rules

- Surveys with received responses cannot be edited or deleted
- Passive users cannot be assigned to surveys or submit responses
- Questions used in surveys cannot be deleted until removed from all surveys
- Templates used in questions cannot be deleted until re-assigned
- The last remaining active admin cannot be deleted
- JWT tokens are validated for expiry on every page load
- **Deleted records (users, templates, questions, surveys) are soft-deleted** — the row is retained in the database with `IsDeleted = true` and a `DeletedAt` timestamp; it never appears in any query
- All unhandled exceptions return structured `{ message }` JSON — stack traces are never exposed to clients
- Role names (`Admin`, `User`) are compile-time constants — typos cause build errors, not silent authorization failures

---

## Architecture

### Backend — Clean Architecture

Dependencies flow strictly inward. The Domain layer has zero external dependencies.
```
SurveyApp/
├── Backend/
│   ├── SurveyApp.Domain/
│   │   ├── Entities/               # Aggregate roots and owned entities
│   │   ├── Interfaces/             # Repository and UoW contracts, ISoftDeletable
│   │   ├── Constants/              # Roles (compile-time role name constants)
│   │   └── Exceptions/             # BusinessRuleException
│   ├── SurveyApp.Application/
│   │   ├── DTOs/                   # Request and response records with validation annotations
│   │   ├── Interfaces/             # Service contracts
│   │   └── Services/               # One file per service class
│   ├── SurveyApp.Infrastructure/
│   │   ├── Data/                   # AppDbContext — global filters, soft delete override
│   │   ├── Repositories/           # Repository and Unit of Work implementations
│   │   └── Migrations/             # EF Core migrations
│   └── SurveyApp.API/
│       ├── Controllers/            # One file per controller
│       └── Middleware/             # GlobalExceptionMiddleware
│
└── Frontend/
    └── survey-app/src/
        ├── api/                    # Axios HTTP client
        ├── store/                  # Zustand auth store
        ├── hooks/                  # Custom data-fetching hooks
        ├── components/
        │   ├── admin/              # Admin UI components
        │   └── ErrorBoundary.tsx   # Catches render errors per route
        ├── pages/admin/            # Admin pages
        ├── pages/user/             # User-facing pages
        ├── types/                  # TypeScript interfaces
        └── styles/                 # Global CSS
```

**Dependency direction:** `API → Application → Domain ← Infrastructure`

### Soft Delete Design

| Layer                 | Responsibility                                                                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain**            | `ISoftDeletable` interface declares `IsDeleted` and `DeletedAt`. Entities implement it — no EF Core dependency.                                                                               |
| **Infrastructure**    | `AppDbContext` applies `HasQueryFilter(!IsDeleted)` on all four aggregate roots and overrides both `SaveChanges` and `SaveChangesAsync` to intercept `EntityState.Deleted`, converting it transparently to a soft delete. |
| **Application / API** | Zero changes. Services call `DeleteAsync` exactly as before; they are unaware of the persistence strategy.                                                                                   |

> `SurveyResponse` and `SurveyAnswer` are intentionally excluded from soft delete — they are audit records and must never be altered.

### Frontend — Component Architecture

- **Zustand** manages authentication state (token, role, user info)
- **React Router v6** handles client-side routing with role-based guards
- **Axios interceptors** attach the Bearer token to every request and redirect to login on 401
- **URL search params** enable shareable filtered views across admin pages
- **ErrorBoundary** wraps each route — a single component crash never takes down the entire app
- **Custom hooks** (`useAnswerTemplates`, `useQuestions`, `useSurveys`, `useUsers`) isolate data-fetching logic from page components

### API Design — RESTful Principles

The backend API is designed around REST constraints, ensuring a predictable and interoperable interface:

| Principle                   | Implementation                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resource-based URLs**     | Nouns over verbs — `/api/surveys`, `/api/questions`, `/api/users`                                                                                 |
| **HTTP method semantics**   | `GET` read · `POST` create · `PUT` full update · `DELETE` remove                                                                                  |
| **Standard status codes**   | `200 OK` · `201 Created` · `204 No Content` · `400 Bad Request` · `401 Unauthorized` · `404 Not Found`                                            |
| **Stateless communication** | Each request carries its own JWT token; no server-side session is maintained                                                                      |
| **Uniform interface**       | All request and response bodies use `application/json`; errors follow a consistent `{ message }` envelope                                         |
| **Layered system**          | Controllers delegate to the Application layer via interfaces; infrastructure details are never exposed to clients                                 |
| **Pagination**              | List endpoints support client-driven pagination via `page` and `pageSize` parameters, keeping response payloads predictable and network-efficient |

---

## Tech Stack

### Backend

| Technology              | Purpose                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| .NET 8                  | Web API framework                                                               |
| Entity Framework Core 8 | ORM                                                                             |
| SQLite                  | Embedded database (swappable — see [Switching Databases](#switching-databases)) |
| JWT Bearer              | Stateless authentication                                                        |
| BCrypt.Net              | Password hashing                                                                |
| Swagger / OpenAPI       | Interactive API documentation                                                   |

### Frontend

| Technology      | Purpose                   |
| --------------- | ------------------------- |
| React 18        | UI framework              |
| TypeScript      | Static typing             |
| Zustand         | Lightweight global state  |
| React Router v6 | Client-side routing       |
| Axios           | HTTP client               |
| Vite            | Build tool and dev server |

---

## Database Schema
```
Users
  Id · Email (unique) · PasswordHash · FullName · Role (Admin|User) · IsActive · CreatedAt
  IsDeleted · DeletedAt

AnswerTemplates
  Id · Name · IsActive · CreatedAt · UpdatedAt
  IsDeleted · DeletedAt

AnswerOptions
  Id · AnswerTemplateId (FK) · Text · OrderIndex

Questions
  Id · Text · AnswerTemplateId (FK) · IsActive · CreatedAt · UpdatedAt
  IsDeleted · DeletedAt

Surveys
  Id · Title · Description · StartDate · EndDate · IsActive · CreatedAt · UpdatedAt
  IsDeleted · DeletedAt

SurveyQuestions
  Id · SurveyId (FK) · QuestionId (FK) · OrderIndex

SurveyAssignments
  Id · SurveyId (FK) · UserId (FK) · AssignedAt
  UNIQUE (SurveyId, UserId)

SurveyResponses  ← audit record, never soft-deleted
  Id · SurveyId (FK) · UserId (FK) · SubmittedAt
  UNIQUE (SurveyId, UserId)

SurveyAnswers  ← audit record, never soft-deleted
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

### Users _(Admin only)_

| Method   | Endpoint          | Description      |
| -------- | ----------------- | ---------------- |
| `GET`    | `/api/users`      | List all users   |
| `GET`    | `/api/users/{id}` | Get user by ID   |
| `POST`   | `/api/users`      | Create user      |
| `PUT`    | `/api/users/{id}` | Update user      |
| `DELETE` | `/api/users/{id}` | Soft-delete user |

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

### Answer Templates _(Admin only)_

| Method   | Endpoint                    | Description                                         |
| -------- | --------------------------- | --------------------------------------------------- |
| `GET`    | `/api/answertemplates`      | List all templates with options                     |
| `GET`    | `/api/answertemplates/{id}` | Get template by ID                                  |
| `POST`   | `/api/answertemplates`      | Create template (2–4 options required)              |
| `PUT`    | `/api/answertemplates/{id}` | Update template                                     |
| `DELETE` | `/api/answertemplates/{id}` | Soft-delete template (blocked if used in questions) |

**Create body**
```json
{
  "name": "Agreement Scale",
  "isActive": true,
  "options": ["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"]
}
```

---

### Questions _(Admin only)_

| Method   | Endpoint              | Description                                       |
| -------- | --------------------- | ------------------------------------------------- |
| `GET`    | `/api/questions`      | List all questions with template info             |
| `GET`    | `/api/questions/{id}` | Get question with full template and options       |
| `POST`   | `/api/questions`      | Create question                                   |
| `PUT`    | `/api/questions/{id}` | Update question                                   |
| `DELETE` | `/api/questions/{id}` | Soft-delete question (blocked if used in surveys) |

**Create body**
```json
{
  "text": "How satisfied are you with our service?",
  "answerTemplateId": 1,
  "isActive": true
}
```

---

### Surveys _(Admin only)_

| Method   | Endpoint            | Description                                        |
| -------- | ------------------- | -------------------------------------------------- |
| `GET`    | `/api/surveys`      | List all surveys with assigned/response counts     |
| `GET`    | `/api/surveys/{id}` | Get survey with questions and assigned user IDs    |
| `POST`   | `/api/surveys`      | Create survey                                      |
| `PUT`    | `/api/surveys/{id}` | Update survey (blocked if responses exist)         |
| `DELETE` | `/api/surveys/{id}` | Soft-delete survey (blocked if responses exist)    |

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

### Reports _(Admin only)_

| Method | Endpoint                  | Description                                         |
| ------ | ------------------------- | --------------------------------------------------- |
| `GET`  | `/api/reports`            | List all surveys with completion stats              |
| `GET`  | `/api/reports/{surveyId}` | Full report: who completed, who hasn't, all answers |

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
        {
          "questionId": 1,
          "questionText": "How satisfied are you?",
          "answerText": "Agree"
        }
      ]
    }
  ],
  "pendingUsers": [
    {
      "id": 3,
      "fullName": "John Smith",
      "email": "john@example.com",
      "role": "User",
      "isActive": true
    }
  ]
}
```

---

### My Surveys _(User only)_

| Method | Endpoint                            | Description                                             |
| ------ | ----------------------------------- | ------------------------------------------------------- |
| `GET`  | `/api/my-surveys`                   | List all assigned surveys (with questions and options)  |
| `GET`  | `/api/my-surveys/{surveyId}`        | Get survey detail for filling (active and in-date only) |
| `POST` | `/api/my-surveys/{surveyId}/submit` | Submit answers                                          |

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

---

## Getting Started

### Prerequisites

| Tool     | Version | Download                                                                       |
| -------- | ------- | ------------------------------------------------------------------------------ |
| .NET SDK | 8.0     | [dotnet.microsoft.com](https://dotnet.microsoft.com/en-us/download/dotnet/8.0) |
| Node.js  | 18+ LTS | [nodejs.org](https://nodejs.org/en/download)                                   |

Verify installations:
```sh
dotnet --version
node --version
npm --version
```

### 1. Clone the Repository
```sh
git clone https://github.com/ferhattufekci/SurveyApp.git
cd SurveyApp
```

### 2. Run the Backend

Install the EF Core CLI tool (one-time):
```sh
dotnet tool install --global dotnet-ef
```

Navigate to the API project:
```sh
cd Backend/SurveyApp.API
```

Restore dependencies and apply migrations:
```sh
dotnet restore
dotnet ef database update --project ..\SurveyApp.Infrastructure --startup-project .
dotnet run
```

> Swagger: http://localhost:5000/swagger

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

| Role  | Email               | Password  |
| ----- | ------------------- | --------- |
| Admin | admin@surveyapp.com | Admin123! |

Additional users can be created from **Admin Panel → Users**.

---

## Deployment

The project ships with configuration files for a **free-tier** production deployment: **.NET backend on Railway, React frontend on Vercel**.
```
Browser → surveyapp.vercel.app (React / Vercel)
                ↓ HTTPS API calls
   surveyapp-api.up.railway.app (.NET 8 / Railway)
                ↓
          SQLite on Railway volume
```

> **Note:** For long-running production use, replacing SQLite with PostgreSQL (Railway add-on, free tier available) is strongly recommended to avoid data loss on container restarts. See [Switching Databases](#switching-databases).

---

### Step 1 — Deploy the Backend to Railway

**Prerequisites:** [railway.app](https://railway.app) account (free, sign in with GitHub)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select the **SurveyApp** repository
3. When asked for the root directory, enter **`Backend`**
4. Railway will auto-detect `Dockerfile` and begin building
5. Once deployed, go to **Settings → Networking → Generate Domain**
6. Copy the generated URL (e.g. `https://surveyapp-api.up.railway.app`)

**Set environment variables in Railway (Settings → Variables):**

| Variable                 | Value                                   |
| ------------------------ | --------------------------------------- |
| `ASPNETCORE_ENVIRONMENT` | `Production`                            |
| `FRONTEND_URL`           | your Vercel URL — fill in after Step 2  |
| `Jwt__Key`               | a long random secret string (32+ chars) |
| `Jwt__Issuer`            | `SurveyApp`                             |
| `Jwt__Audience`          | `SurveyAppUsers`                        |

---

### Step 2 — Deploy the Frontend to Vercel

**Prerequisites:** [vercel.com](https://vercel.com) account (free, sign in with GitHub)

1. Go to [vercel.com](https://vercel.com) → **New Project** → import **SurveyApp** repository
2. Set **Root Directory** to **`Frontend/survey-app`**
3. Framework will be auto-detected as **Vite**
4. Under **Environment Variables**, add:

| Variable       | Value                                         |
| -------------- | --------------------------------------------- |
| `VITE_API_URL` | `https://your-railway-url.up.railway.app/api` |

5. Click **Deploy** — Vercel will give you a URL (e.g. `https://surveyapp.vercel.app`)

---

### Step 3 — Connect Frontend URL to Backend CORS

Go back to Railway → **Variables** and set:

| Variable       | Value                          |
| -------------- | ------------------------------ |
| `FRONTEND_URL` | `https://surveyapp.vercel.app` |

Railway will automatically redeploy the backend with the updated CORS origin.

---

### Deployment Files Reference

| File                                                | Purpose                                               |
| --------------------------------------------------- | ----------------------------------------------------- |
| `Backend/Dockerfile`                                | Multi-stage Docker build for Railway                  |
| `Backend/railway.json`                              | Railway build and restart configuration               |
| `Backend/SurveyApp.API/appsettings.Production.json` | Production settings template (SQLite path, log level) |
| `Frontend/survey-app/vercel.json`                   | SPA rewrite rule so React Router handles all routes   |
| `Frontend/survey-app/.env.example`                  | Environment variable template for local development   |

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

## Contributing

Contributions are welcome! Please follow the guidelines below to keep the codebase consistent and the review process smooth.

### How to Contribute

1. **Fork** the repository and create your branch from `main`:
   ```sh
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes.** Keep each commit focused on a single logical change.

3. **Follow the commit message convention** — this project uses [Conventional Commits](https://www.conventionalcommits.org/):

   | Type       | When to use                                             |
   | ---------- | ------------------------------------------------------- |
   | `feat`     | A new feature                                           |
   | `fix`      | A bug fix                                               |
   | `docs`     | Documentation changes only                             |
   | `refactor` | Code change that neither fixes a bug nor adds a feature |
   | `test`     | Adding or updating tests                                |
   | `chore`    | Build process, tooling, or dependency updates           |

   Examples:
   ```
   feat: add export-to-CSV button on reports page
   fix: prevent duplicate survey submission on slow connections
   docs: add PostgreSQL migration guide to README
   ```

4. **Test your changes** locally before opening a pull request:
   ```sh
   # Backend
   cd Backend/SurveyApp.API && dotnet run

   # Frontend
   cd Frontend/survey-app && npm run dev
   ```

5. **Open a Pull Request** against the `main` branch. Fill in the PR template:
   - What problem does this solve?
   - How was it tested?
   - Any breaking changes?

### Branch Naming

| Pattern                  | Purpose                              |
| ------------------------ | ------------------------------------ |
| `feat/short-description` | New feature                          |
| `fix/short-description`  | Bug fix                              |
| `docs/short-description` | Documentation update                 |
| `refactor/...`           | Refactoring without behavior change  |

### Code Style

- **Backend:** Follow the existing Clean Architecture layer boundaries. Business logic belongs in the Application layer — never in controllers. New endpoints must include `[ProducesResponseType]` annotations.
- **Frontend:** Keep page-level state in page components; share data-fetching logic through custom hooks. New user-visible strings must be added to `src/i18n/translations.ts` with both `tr` and `en` values.
- Use **4 spaces** for C# and **2 spaces** for TypeScript/TSX.

### Reporting Bugs

Open an issue and include:
- Steps to reproduce
- Expected vs. actual behavior
- Browser / .NET SDK version
- Relevant error messages or screenshots

### Suggesting Features

Open an issue with the `enhancement` label. Describe the use case and the proposed solution. For larger changes, discuss the approach in an issue before writing code.

### Code of Conduct

Be respectful and constructive. All contributors are expected to follow the [Contributor Covenant](https://www.contributor-covenant.org/).

---

## Author

[![Author](https://img.shields.io/badge/author-ferhattufekci-red)](https://github.com/ferhattufekci)
[![Contact](https://img.shields.io/badge/contact-linkedin-blue)](https://www.linkedin.com/in/ferhattufekci/)

---

<h2 align="center">👏 Support My Work</h2>

<p align="center">
  If you find my work helpful or inspiring, consider buying me a coffee to show your support.
</p>

<p align="center">
  <a href="https://www.buymeacoffee.com/ferhattufekci" target="_blank">
    <img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png"
         alt="Buy Me A Coffee"
         style="height: 45px; width: 180px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px;">
  </a>
</p>

---

<h3 align="center">Let's Connect — I'm Always Open to Collaborate and Share Ideas!</h3>

---

---

<a name="türkçe"></a>

# SurveyApp — Türkçe

**.NET 8** (Clean Architecture) ve **React TypeScript** ile geliştirilmiş tam yığın anket yönetim sistemi. Adminler cevap şablonları, sorular ve anketler oluşturur, bunları kullanıcılara atar ve tamamlanma durumlarını detaylı raporlar aracılığıyla takip eder. Kullanıcılar kendilerine atanan anketleri doldurur ve geçmişlerini görüntüler.

[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=flat-square&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-EF_Core-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

## Canlı Demo

- **Uygulama Adresi:** [https://sor-bakalim.vercel.app/](https://sor-bakalim.vercel.app/)
- **Admin Giriş Bilgileri:** `admin@surveyapp.com` / `Admin123!`

---

## İçindekiler

- [Özellikler](#özellikler)
- [Mimari](#mimari)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Veritabanı Şeması](#veritabanı-şeması)
- [API Referansı](#api-referansı)
- [Kurulum](#kurulum)
- [Varsayılan Giriş Bilgileri](#varsayılan-giriş-bilgileri)
- [Farklı Veritabanına Geçiş](#farklı-veritabanına-geçiş)
- [Katkı Sağlama](#katkı-sağlama)

---

## Özellikler

### Admin Paneli

| Ekran                | Açıklama                                                                       |
| -------------------- | ------------------------------------------------------------------------------ |
| **Dashboard**        | Genel istatistikler, aktif/süresi geçen anket dağılımı ve son anketler tablosu |
| **Cevap Şablonları** | Sorularda kullanılmak üzere 2–4 seçenekli yeniden kullanılabilir şablonlar     |
| **Sorular**          | Cevap şablonlarına bağlı soru yönetimi; seçenek sayısı görüntüleme             |
| **Anketler**         | Tarih aralıklı anket oluşturma, soru ve kullanıcı atama                        |
| **Kullanıcılar**     | Kullanıcı oluşturma, güncelleme, silme ve rol atama                            |
| **Raporlar**         | İlerleme çubuğuyla tamamlanma oranları ve yanıt detayı görüntüleme             |

### Kullanıcı Paneli

| Özellik           | Açıklama                                                                    |
| ----------------- | --------------------------------------------------------------------------- |
| **Anketlerim**    | Sekmeli liste: Aktif, Tamamlanan, Yaklaşan, Süresi Geçen                    |
| **Anket Doldur**  | Tüm soruları cevapla ve anketi bir kez gönder                               |
| **Soru Önizleme** | Listede her sorunun şablon adını ve seçeneklerini göster                    |
| **Arama**         | Başlık, açıklama, soru metni, şablon adı veya seçenek metnine göre filtrele |

### Temel İş Kuralları

- Yanıt alınmış anketler düzenlenemez veya silinemez
- Pasif kullanıcılar ankete atanamaz ve anket gönderemez
- Anketlerde kullanılan sorular, anketlerden çıkarılmadan silinemez
- Sorularda kullanılan şablonlar, yeniden atanmadan silinemez
- Son aktif admin silinemez
- JWT token geçerliliği her sayfa yüklemesinde kontrol edilir
- **Silinen kayıtlar (kullanıcı, şablon, soru, anket) fiziksel olarak silinmez** — satır `IsDeleted = true` ve `DeletedAt` zaman damgasıyla veritabanında tutulur; hiçbir sorguda görünmez
- Tüm işlenmemiş hatalar yapısal `{ message }` JSON olarak döner — istemciye asla stack trace iletilmez
- Rol isimleri (`Admin`, `User`) derleme zamanı sabitleri — yazım hatası runtime hatası değil, derleme hatası üretir

---

## Mimari

### Backend — Clean Architecture

Bağımlılıklar yalnızca içe doğru akar. Domain katmanının hiçbir dış bağımlılığı yoktur.
```
SurveyApp/
├── Backend/
│   ├── SurveyApp.Domain/
│   │   ├── Entities/               # Aggregate root'lar ve owned entity'ler
│   │   ├── Interfaces/             # Repository ve UoW arayüzleri, ISoftDeletable
│   │   ├── Constants/              # Roles (derleme zamanı rol adı sabitleri)
│   │   └── Exceptions/             # BusinessRuleException
│   ├── SurveyApp.Application/
│   │   ├── DTOs/                   # Validation annotation'lı request/response record'ları
│   │   ├── Interfaces/             # Servis arayüzleri
│   │   └── Services/               # Her servis sınıfı ayrı dosyada
│   ├── SurveyApp.Infrastructure/
│   │   ├── Data/                   # AppDbContext — global filter'lar, soft delete override
│   │   ├── Repositories/           # Repository ve Unit of Work implementasyonları
│   │   └── Migrations/             # EF Core migration'ları
│   └── SurveyApp.API/
│       ├── Controllers/            # Her controller ayrı dosyada
│       └── Middleware/             # GlobalExceptionMiddleware
│
└── Frontend/
    └── survey-app/src/
        ├── api/                    # Axios HTTP istemcisi
        ├── store/                  # Zustand kimlik doğrulama store'u
        ├── hooks/                  # Custom veri çekme hook'ları
        ├── components/
        │   ├── admin/              # Admin UI bileşenleri
        │   └── ErrorBoundary.tsx   # Route başına render hatalarını yakalar
        ├── pages/admin/            # Admin sayfaları
        ├── pages/user/             # Kullanıcı sayfaları
        ├── types/                  # TypeScript arayüzleri
        └── styles/                 # Global CSS
```

**Bağımlılık yönü:** `API → Application → Domain ← Infrastructure`

### Soft Delete Tasarımı

| Katman              | Sorumluluk                                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain**          | `ISoftDeletable` arayüzü `IsDeleted` ve `DeletedAt` özelliklerini tanımlar. Entity'ler bu arayüzü uygular — EF Core bağımlılığı yoktur.                                                                                |
| **Infrastructure**  | `AppDbContext`, dört aggregate root üzerinde `HasQueryFilter(!IsDeleted)` uygular; hem senkron `SaveChanges` hem de `SaveChangesAsync` override edilerek `EntityState.Deleted` yakalanır ve şeffaf biçimde soft delete'e çevrilir. |
| **Application / API** | Sıfır değişiklik. Servisler `DeleteAsync`'i eskisi gibi çağırır; kalıcılık stratejisinden haberleri yoktur.                                                                                                           |

> `SurveyResponse` ve `SurveyAnswer` kasıtlı olarak soft delete kapsamı dışında tutulmuştur — bunlar denetim kayıtlarıdır ve asla değiştirilemez.

### Frontend — Bileşen Mimarisi

- **Zustand** kimlik doğrulama durumunu (token, rol, kullanıcı bilgisi) yönetir
- **React Router v6** rol tabanlı korumalarla istemci tarafı yönlendirmeyi yönetir
- **Axios interceptor'ları** her isteğe Bearer token ekler ve 401'de login'e yönlendirir
- **URL search param'ları** admin sayfaları arasında paylaşılabilir filtrelenmiş görünümler sağlar
- **ErrorBoundary** her route'u sarar — tek bir bileşen çökmesi tüm uygulamayı kapatmaz
- **Custom hook'lar** (`useAnswerTemplates`, `useQuestions`, `useSurveys`, `useUsers`) veri çekme mantığını sayfa bileşenlerinden ayırır

### API Tasarımı — RESTful Prensipler

Backend API, tahmin edilebilir ve birlikte çalışabilir bir arayüz sağlamak amacıyla REST kısıtlamaları temel alınarak tasarlanmıştır:

| Prensip                    | Uygulama                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kaynak tabanlı URL'ler** | Fiil değil isim — `/api/surveys`, `/api/questions`, `/api/users`                                                                                     |
| **HTTP metod semantiği**   | `GET` okuma · `POST` oluşturma · `PUT` güncelleme · `DELETE` silme                                                                                   |
| **Standart durum kodları** | `200 OK` · `201 Created` · `204 No Content` · `400 Bad Request` · `401 Unauthorized` · `404 Not Found`                                               |
| **Stateless iletişim**     | Her istek kendi JWT token'ını taşır; sunucuda oturum tutulmaz                                                                                        |
| **Tekdüze arayüz**         | Tüm istek ve yanıt gövdeleri `application/json` kullanır; hatalar tutarlı `{ message }` zarfıyla döner                                               |
| **Katmanlı sistem**        | Controller'lar iş mantığını arayüzler üzerinden Application katmanına devreder; altyapı detayları istemciye hiçbir zaman açılmaz                     |
| **Sayfalama (Pagination)** | Liste endpoint'leri `page` ve `pageSize` parametreleriyle istemci güdümlü sayfalamayı destekler; yanıt boyutları öngörülür ve ağ verimliliği korunur |

---

## Teknoloji Yığını

### Backend

| Teknoloji               | Kullanım                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| .NET 8                  | Web API framework                                                                                   |
| Entity Framework Core 8 | ORM                                                                                                 |
| SQLite                  | Gömülü veritabanı (değiştirilebilir — bkz. [Farklı Veritabanına Geçiş](#farklı-veritabanına-geçiş)) |
| JWT Bearer              | Stateless kimlik doğrulama                                                                          |
| BCrypt.Net              | Şifre hashleme                                                                                      |
| Swagger / OpenAPI       | Etkileşimli API dokümantasyonu                                                                      |

### Frontend

| Teknoloji       | Kullanım                           |
| --------------- | ---------------------------------- |
| React 18        | UI framework                       |
| TypeScript      | Statik tipleme                     |
| Zustand         | Hafif global state yönetimi        |
| React Router v6 | İstemci tarafı yönlendirme         |
| Axios           | HTTP istemcisi                     |
| Vite            | Build aracı ve geliştirme sunucusu |

---

## Veritabanı Şeması
```
Users
  Id · Email (unique) · PasswordHash · FullName · Role (Admin|User) · IsActive · CreatedAt
  IsDeleted · DeletedAt

AnswerTemplates
  Id · Name · IsActive · CreatedAt · UpdatedAt
  IsDeleted · DeletedAt

AnswerOptions
  Id · AnswerTemplateId (FK) · Text · OrderIndex

Questions
  Id · Text · AnswerTemplateId (FK) · IsActive · CreatedAt · UpdatedAt
  IsDeleted · DeletedAt

Surveys
  Id · Title · Description · StartDate · EndDate · IsActive · CreatedAt · UpdatedAt
  IsDeleted · DeletedAt

SurveyQuestions
  Id · SurveyId (FK) · QuestionId (FK) · OrderIndex

SurveyAssignments
  Id · SurveyId (FK) · UserId (FK) · AssignedAt
  UNIQUE (SurveyId, UserId)

SurveyResponses  ← denetim kaydı, soft delete dışında
  Id · SurveyId (FK) · UserId (FK) · SubmittedAt
  UNIQUE (SurveyId, UserId)

SurveyAnswers  ← denetim kaydı, soft delete dışında
  Id · SurveyResponseId (FK) · QuestionId (FK) · AnswerOptionId (FK)
```

---

## API Referansı

Tüm endpoint'ler `Content-Type: application/json` gerektirir.  
Korumalı endpoint'ler `Authorization: Bearer <token>` gerektirir.

---

### Kimlik Doğrulama

#### `POST /api/auth/login`

**İstek**
```json
{ "email": "admin@surveyapp.com", "password": "Admin123!" }
```

**Yanıt `200 OK`**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "email": "admin@surveyapp.com",
  "fullName": "System Admin",
  "role": "Admin",
  "isActive": true
}
```

**Yanıt `401 Unauthorized`**
```json
{ "message": "Invalid credentials" }
```

---

### Kullanıcılar _(Yalnızca Admin)_

| Metod    | Endpoint          | Açıklama                   |
| -------- | ----------------- | -------------------------- |
| `GET`    | `/api/users`      | Tüm kullanıcıları listele  |
| `GET`    | `/api/users/{id}` | ID ile kullanıcı getir     |
| `POST`   | `/api/users`      | Kullanıcı oluştur          |
| `PUT`    | `/api/users/{id}` | Kullanıcı güncelle         |
| `DELETE` | `/api/users/{id}` | Kullanıcıyı soft-delete et |

**Oluşturma / Güncelleme gövdesi**
```json
{
  "email": "user@example.com",
  "password": "Secret123!",
  "fullName": "Ahmet Yılmaz",
  "role": "User",
  "isActive": true
}
```

---

### Cevap Şablonları _(Yalnızca Admin)_

| Metod    | Endpoint                    | Açıklama                                                     |
| -------- | --------------------------- | ------------------------------------------------------------ |
| `GET`    | `/api/answertemplates`      | Seçenekleriyle tüm şablonları listele                        |
| `GET`    | `/api/answertemplates/{id}` | ID ile şablon getir                                          |
| `POST`   | `/api/answertemplates`      | Şablon oluştur (2–4 seçenek zorunlu)                         |
| `PUT`    | `/api/answertemplates/{id}` | Şablon güncelle                                              |
| `DELETE` | `/api/answertemplates/{id}` | Şablonu soft-delete et (sorularda kullanılıyorsa engellenir) |

**Oluşturma gövdesi**
```json
{
  "name": "Katılım Düzeyi",
  "isActive": true,
  "options": [
    "Kesinlikle Katılıyorum",
    "Katılıyorum",
    "Katılmıyorum",
    "Kesinlikle Katılmıyorum"
  ]
}
```

---

### Sorular _(Yalnızca Admin)_

| Metod    | Endpoint              | Açıklama                                                        |
| -------- | --------------------- | --------------------------------------------------------------- |
| `GET`    | `/api/questions`      | Şablon bilgisiyle tüm soruları listele                          |
| `GET`    | `/api/questions/{id}` | Tam şablon ve seçenekleriyle soru getir                         |
| `POST`   | `/api/questions`      | Soru oluştur                                                    |
| `PUT`    | `/api/questions/{id}` | Soru güncelle                                                   |
| `DELETE` | `/api/questions/{id}` | Soruyu soft-delete et (anketlerde kullanılıyorsa engellenir)    |

**Oluşturma gövdesi**
```json
{
  "text": "Hizmetimizden memnun musunuz?",
  "answerTemplateId": 1,
  "isActive": true
}
```

---

### Anketler _(Yalnızca Admin)_

| Metod    | Endpoint            | Açıklama                                           |
| -------- | ------------------- | -------------------------------------------------- |
| `GET`    | `/api/surveys`      | Atanan/yanıtlayan sayısıyla tüm anketleri listele  |
| `GET`    | `/api/surveys/{id}` | Sorular ve atanan kullanıcı ID'leriyle anket getir |
| `POST`   | `/api/surveys`      | Anket oluştur                                      |
| `PUT`    | `/api/surveys/{id}` | Anket güncelle (yanıt varsa engellenir)            |
| `DELETE` | `/api/surveys/{id}` | Anketi soft-delete et (yanıt varsa engellenir)     |

**Oluşturma gövdesi**
```json
{
  "title": "Çalışan Memnuniyet Anketi",
  "description": "Yıl sonu değerlendirmesi",
  "startDate": "2024-12-01T00:00:00",
  "endDate": "2024-12-31T00:00:00",
  "isActive": true,
  "questionIds": [1, 2, 3],
  "userIds": [2, 3, 4]
}
```

---

### Raporlar _(Yalnızca Admin)_

| Metod | Endpoint                  | Açıklama                                              |
| ----- | ------------------------- | ----------------------------------------------------- |
| `GET` | `/api/reports`            | Tamamlanma istatistikleriyle tüm anketleri listele    |
| `GET` | `/api/reports/{surveyId}` | Tam rapor: kim doldurdu, kim doldurmadı, tüm yanıtlar |

**Rapor yanıtı `200 OK`**
```json
{
  "surveyId": 1,
  "title": "Çalışan Memnuniyet Anketi",
  "totalAssigned": 10,
  "totalCompleted": 7,
  "totalPending": 3,
  "completedResponses": [
    {
      "userId": 2,
      "userName": "Ahmet Yılmaz",
      "userEmail": "ahmet@example.com",
      "submittedAt": "2024-12-15T10:30:00",
      "answers": [
        {
          "questionId": 1,
          "questionText": "Hizmetimizden memnun musunuz?",
          "answerText": "Katılıyorum"
        }
      ]
    }
  ],
  "pendingUsers": [
    {
      "id": 3,
      "fullName": "Mehmet Kaya",
      "email": "mehmet@example.com",
      "role": "User",
      "isActive": true
    }
  ]
}
```

---

### Anketlerim _(Yalnızca User)_

| Metod  | Endpoint                            | Açıklama                                                                       |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------ |
| `GET`  | `/api/my-surveys`                   | Atanan tüm anketleri listele (sorular ve seçeneklerle)                         |
| `GET`  | `/api/my-surveys/{surveyId}`        | Doldurmak için anket detayı getir (yalnızca aktif ve tarih aralığında olanlar) |
| `POST` | `/api/my-surveys/{surveyId}/submit` | Yanıtları gönder                                                               |

**Gönderme gövdesi**
```json
{
  "surveyId": 1,
  "answers": [
    { "questionId": 1, "answerOptionId": 2 },
    { "questionId": 2, "answerOptionId": 5 }
  ]
}
```

---

## Kurulum

### Gereksinimler

| Araç     | Versiyon | İndirme                                                                        |
| -------- | -------- | ------------------------------------------------------------------------------ |
| .NET SDK | 8.0      | [dotnet.microsoft.com](https://dotnet.microsoft.com/en-us/download/dotnet/8.0) |
| Node.js  | 18+ LTS  | [nodejs.org](https://nodejs.org/en/download)                                   |

Kurulumu doğrulayın:
```sh
dotnet --version
node --version
npm --version
```

### 1. Repoyu Klonlayın
```sh
git clone https://github.com/ferhattufekci/SurveyApp.git
cd SurveyApp
```

### 2. Backend'i Başlatın

EF Core CLI aracını kurun (bir kez yapılır):
```sh
dotnet tool install --global dotnet-ef
```

API projesine gidin:
```sh
cd Backend/SurveyApp.API
```

Bağımlılıkları yükleyin ve migration'ları uygulayın:
```sh
dotnet restore
dotnet ef database update --project ..\SurveyApp.Infrastructure --startup-project .
dotnet run
```

> Swagger: http://localhost:5000/swagger

### 3. Frontend'i Başlatın

**Yeni bir terminal açın** (backend'i kapatmayın):
```sh
cd Frontend/survey-app
npm install
npm run dev
```

> Uygulama: http://localhost:3000

---

## Varsayılan Giriş Bilgileri

| Rol   | E-posta             | Şifre     |
| ----- | ------------------- | --------- |
| Admin | admin@surveyapp.com | Admin123! |

Ek kullanıcılar **Admin Paneli → Kullanıcılar** ekranından oluşturulabilir.

---

## Deployment

Proje, **ücretsiz tier** için hazır deployment dosyalarıyla birlikte gelir: **.NET backend Railway'de, React frontend Vercel'de**.
```
Tarayıcı → surveyapp.vercel.app (React / Vercel)
                ↓ HTTPS API istekleri
   surveyapp-api.up.railway.app (.NET 8 / Railway)
                ↓
        SQLite (Railway volume)
```

> **Not:** Uzun süreli üretim kullanımı için SQLite yerine PostgreSQL'e geçilmesi önerilir. Bkz. [Farklı Veritabanına Geçiş](#farklı-veritabanına-geçiş).

---

### Adım 1 — Backend'i Railway'e Deploy Et

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. **SurveyApp** reposunu seç, root directory: **`Backend`**
3. Deploy tamamlandıktan sonra **Settings → Networking → Generate Domain**

**Railway Variables:**

| Değişken                 | Değer                                   |
| ------------------------ | --------------------------------------- |
| `ASPNETCORE_ENVIRONMENT` | `Production`                            |
| `FRONTEND_URL`           | Vercel URL'in — Adım 2 sonrası doldur   |
| `Jwt__Key`               | Uzun rastgele bir string (32+ karakter) |
| `Jwt__Issuer`            | `SurveyApp`                             |
| `Jwt__Audience`          | `SurveyAppUsers`                        |

### Adım 2 — Frontend'i Vercel'e Deploy Et

1. [vercel.com](https://vercel.com) → **New Project** → **SurveyApp** repo
2. Root Directory: **`Frontend/survey-app`**
3. Environment Variables: `VITE_API_URL` = `https://your-railway-url.up.railway.app/api`

### Adım 3 — CORS Bağlantısı

Railway → Variables: `FRONTEND_URL` = `https://surveyapp.vercel.app`

---

## Farklı Veritabanına Geçiş

**PostgreSQL örneği**

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
  "DefaultConnection": "Host=localhost;Database=surveyapp;Username=postgres;Password=sifreniz"
}
```

---

## Katkı Sağlama

Katkılarınızı bekliyoruz! Kod tabanının tutarlı kalması ve inceleme sürecinin sorunsuz ilerlemesi için aşağıdaki yönergeleri lütfen takip edin.

### Nasıl Katkı Sağlanır

1. Repoyu **fork**'layın ve `main` dalından kendi dalınızı oluşturun:
   ```sh
   git checkout -b feat/ozellik-adiniz
   ```

2. **Değişikliklerinizi yapın.** Her commit'i tek bir mantıksal değişikliğe odaklı tutun.

3. **Commit mesajı kuralına uyun** — bu proje [Conventional Commits](https://www.conventionalcommits.org/) standardını kullanır:

   | Tür        | Ne zaman kullanılır                                         |
   | ---------- | ----------------------------------------------------------- |
   | `feat`     | Yeni bir özellik                                            |
   | `fix`      | Bir hata düzeltmesi                                         |
   | `docs`     | Yalnızca dokümantasyon değişiklikleri                       |
   | `refactor` | Hata düzeltmeyen ve özellik eklemeyen kod değişikliği       |
   | `test`     | Test ekleme veya güncelleme                                 |
   | `chore`    | Build süreci, araç güncellemesi veya bağımlılık güncellemesi |

   Örnekler:
   ```
   feat: raporlar sayfasına CSV dışa aktarma butonu ekle
   fix: yavaş bağlantılarda çift anket gönderimini önle
   docs: README'ye PostgreSQL migration rehberi ekle
   ```

4. Pull request açmadan önce değişikliklerinizi **yerel ortamda test edin**:
   ```sh
   # Backend
   cd Backend/SurveyApp.API && dotnet run

   # Frontend
   cd Frontend/survey-app && npm run dev
   ```

5. `main` dalına yönelik bir **Pull Request** açın. PR açıklamasında şunları belirtin:
   - Bu hangi sorunu çözüyor?
   - Nasıl test edildi?
   - Kırıcı (breaking) değişiklik var mı?

### Dal Adlandırma

| Kalıp                    | Amaç                                        |
| ------------------------ | ------------------------------------------- |
| `feat/kısa-açıklama`     | Yeni özellik                                |
| `fix/kısa-açıklama`      | Hata düzeltmesi                             |
| `docs/kısa-açıklama`     | Dokümantasyon güncellemesi                  |
| `refactor/...`           | Davranış değiştirmeyen yeniden yapılandırma |

### Kod Stili

- **Backend:** Mevcut Clean Architecture katman sınırlarına uyun. İş mantığı Application katmanına aittir — asla controller'lara yazılmamalıdır. Yeni endpoint'lere `[ProducesResponseType]` annotation'ı eklenmelidir.
- **Frontend:** Sayfa düzeyindeki state'i sayfa bileşenlerinde tutun; veri çekme mantığını custom hook'lar üzerinden paylaşın. Kullanıcıya görünen yeni string'ler `src/i18n/translations.ts` dosyasına hem `tr` hem `en` değerleriyle eklenmelidir.
- C# için **4 boşluk**, TypeScript/TSX için **2 boşluk** kullanın.

### Hata Bildirimi

Bir issue açarak şunları ekleyin:
- Yeniden üretme adımları
- Beklenen ve gerçekleşen davranış
- Tarayıcı / .NET SDK sürümü
- İlgili hata mesajları veya ekran görüntüleri

### Özellik Önerisi

`enhancement` etiketiyle bir issue açın. Kullanım senaryosunu ve önerilen çözümü açıklayın. Kapsamlı değişiklikler için kod yazmadan önce yaklaşımı bir issue üzerinden tartışın.

### Davranış Kuralları

Saygılı ve yapıcı olun. Tüm katkıcıların [Contributor Covenant](https://www.contributor-covenant.org/) ilkelerine uyması beklenir.

---

## Yazar

[![Author](https://img.shields.io/badge/author-ferhattufekci-red)](https://github.com/ferhattufekci)
[![Contact](https://img.shields.io/badge/contact-linkedin-blue)](https://www.linkedin.com/in/ferhattufekci/)

---
