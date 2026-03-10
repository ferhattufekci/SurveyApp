# 📋 SurveyApp — Anket Yönetim Sistemi

> **Admin** rolündeki kullanıcılar; cevap şablonları, sorular ve anketler oluşturabilir, bu anketleri belirli kullanıcılara atayabilir ve anket sonuçlarını detaylı raporlar aracılığıyla takip edebilir. Anketler, sorular ve cevap şablonları için **Aktif/Pasif** durum yönetimi yapılabilir; pasif durumdaki anketler kullanıcılar tarafından görüntülenemez ve doldurulamaz.
>
> **User** rolündeki kullanıcılar; kendilerine atanan, **aktif** durumda olan ve geçerli tarih aralığındaki anketleri görüntüleyebilir, soruları cevaplayarak anketi tamamlayabilir. Tamamlanan anketler tekrar doldurulamaz.

[![dotnet](https://img.shields.io/badge/dotnet-8.0-512BD4?style=flat-square&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-EF%20Core-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![JWT](https://img.shields.io/badge/Auth-JWT-black?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io)

---

## 🏗️ Mimari

### Clean Architecture
Backend, katmanlar arası bağımlılığın tek yönlü olduğu Clean Architecture prensipleriyle geliştirilmiştir:

```
SurveyApp/
├── Backend/
│   ├── SurveyApp.Domain/           → Entities, Interfaces (dışa bağımlılığı sıfır)
│   ├── SurveyApp.Application/      → Use Cases, DTOs, Service Interfaces
│   ├── SurveyApp.Infrastructure/   → EF Core, Repositories, UnitOfWork
│   └── SurveyApp.API/              → Controllers, Middleware, JWT, Swagger
│
└── Frontend/
    └── survey-app/src/
        ├── api/                    → Axios HTTP istemcisi
        ├── store/                  → Zustand state yönetimi
        ├── pages/                  → Admin ve User sayfaları
        ├── components/             → Layout bileşenleri
        ├── types/                  → TypeScript tip tanımları
        └── styles/                 → Global CSS
```

**Bağımlılık yönü:** `API → Application → Domain` ← `Infrastructure`  
Her katman yalnızca bir alt katmana bağımlıdır; Domain hiçbir katmana bağımlı değildir.

---

### RESTful API
Backend, RESTful API prensipleri doğrultusunda tasarlanmıştır:

| Prensip | Uygulama |
|---------|----------|
| **Resource-based URL** | `/api/surveys`, `/api/questions` gibi isim tabanlı endpoint'ler |
| **HTTP metodları** | `GET` okuma, `POST` oluşturma, `PUT` güncelleme, `DELETE` silme |
| **HTTP status kodları** | `200 OK`, `201 Created`, `204 No Content`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found` |
| **Stateless** | Her istek kendi JWT token'ını taşır, sunucuda oturum tutulmaz |
| **JSON** | Tüm istek ve yanıtlar `application/json` formatında |

---

## ⚙️ Teknoloji Yığını

### Backend
| Teknoloji | Kullanım |
|-----------|----------|
| .NET Core 8.0 | Web API framework |
| Entity Framework Core 8 | ORM |
| SQLite | Veritabanı |
| JWT Bearer | Kimlik doğrulama |
| BCrypt.Net | Şifre hashleme |
| Swagger / OpenAPI | API dokümantasyonu |

### Frontend
| Teknoloji | Kullanım |
|-----------|----------|
| React 18 | UI framework |
| TypeScript | Tip güvenliği |
| Zustand | State yönetimi |
| React Router v6 | Client-side routing |
| Axios | HTTP istemcisi |
| Vite | Build aracı |

---

## ✨ Özellikler

### 🔐 Kimlik Doğrulama & Yetkilendirme
- E-posta ve şifre ile giriş
- JWT token tabanlı oturum yönetimi (7 gün geçerli)
- BCrypt ile şifre hashleme
- İki rol: **Admin** ve **User**

### 👑 Admin Paneli
- **Dashboard** — İstatistik kartları ve son anketler tablosu
- **Cevap Şablonları** — 2-4 seçenek arası şablon CRUD
- **Sorular** — Şablona bağlı soru CRUD
- **Anketler** — Başlık, açıklama, tarih aralığı, kullanıcı & soru atama, aktif/pasif durumu
- **Kullanıcılar** — Kullanıcı oluşturma, güncelleme, silme
- **Raporlar** — Tamamlanma oranları, kim doldurdu/doldurmadı, detaylı cevap görüntüleme

### 👤 Kullanıcı Paneli
- Aktif / tamamlanan / yaklaşan anketleri listeleme
- Sadece geçerli tarih aralığındaki anketleri doldurabilme (`StartDate ≤ Şimdi ≤ EndDate`)
- Tüm sorular cevaplanmadan gönderim engeli
- Aynı anketi tekrar doldurma engeli

---

## 🗄️ Veritabanı Şeması

```
Users
  Id, Email (unique), PasswordHash, FullName, Role ('Admin'|'User'), IsActive, CreatedAt

AnswerTemplates
  Id, Name, IsActive, CreatedAt, UpdatedAt

AnswerOptions
  Id, AnswerTemplateId (FK), Text, OrderIndex

Questions
  Id, Text, AnswerTemplateId (FK), IsActive, CreatedAt, UpdatedAt

Surveys
  Id, Title, Description, StartDate, EndDate, IsActive, CreatedAt, UpdatedAt

SurveyQuestions
  Id, SurveyId (FK), QuestionId (FK), OrderIndex

SurveyAssignments
  Id, SurveyId (FK), UserId (FK), AssignedAt
  [UNIQUE: SurveyId + UserId]

SurveyResponses
  Id, SurveyId (FK), UserId (FK), SubmittedAt
  [UNIQUE: SurveyId + UserId]

SurveyAnswers
  Id, SurveyResponseId (FK), QuestionId (FK), AnswerOptionId (FK)
```

---

## 🔌 API Endpoints

Tüm isteklerde `Content-Type: application/json` header'ı kullanılmalıdır.  
Admin ve User endpoint'leri için `Authorization: Bearer {token}` header'ı gereklidir.

---

### 🔓 Auth — Herkese Açık

#### `POST /api/auth/login`
Giriş yapar, JWT token döner.

**Request Body:**
```json
{
  "email": "admin@surveyapp.com",
  "password": "Admin123!"
}
```

**Response `200 OK`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "email": "admin@surveyapp.com",
  "fullName": "System Admin",
  "role": "Admin"
}
```

**Response `401 Unauthorized`:**
```json
{ "message": "Invalid credentials" }
```

---

### 👥 Users — Sadece Admin

#### `GET /api/users`
Tüm aktif kullanıcıları listeler.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "email": "admin@surveyapp.com",
    "fullName": "System Admin",
    "role": "Admin",
    "isActive": true
  }
]
```

---

#### `GET /api/users/{id}`
Tek kullanıcı getirir.

**Response `200 OK`:** Kullanıcı nesnesi  
**Response `404 Not Found`**

---

#### `POST /api/users`
Yeni kullanıcı oluşturur.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Sifre123!",
  "fullName": "Ad Soyad",
  "role": "User"
}
```

**Response `201 Created`:** Oluşturulan kullanıcı nesnesi

---

#### `PUT /api/users/{id}`
Kullanıcı günceller.

**Request Body:**
```json
{
  "fullName": "Yeni Ad Soyad",
  "isActive": true
}
```

**Response `200 OK`:** Güncellenmiş kullanıcı nesnesi  
**Response `404 Not Found`**

---

#### `DELETE /api/users/{id}`
Kullanıcı siler.

**Response `204 No Content`**  
**Response `404 Not Found`**

---

### 📋 Answer Templates — Sadece Admin

#### `GET /api/answertemplates`
Tüm şablonları seçenekleriyle birlikte listeler.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "name": "Evet/Hayır",
    "isActive": true,
    "options": [
      { "id": 1, "text": "Evet", "orderIndex": 0 },
      { "id": 2, "text": "Hayır", "orderIndex": 1 }
    ]
  }
]
```

---

#### `GET /api/answertemplates/{id}`
Tek şablon getirir.

**Response `200 OK`:** Şablon nesnesi  
**Response `404 Not Found`**

---

#### `POST /api/answertemplates`
Yeni şablon oluşturur. Seçenek sayısı 2-4 arası olmalıdır.

**Request Body:**
```json
{
  "name": "Katılım Düzeyi",
  "options": ["Kesinlikle Katılıyorum", "Katılıyorum", "Katılmıyorum", "Kesinlikle Katılmıyorum"]
}
```

**Response `201 Created`:** Oluşturulan şablon nesnesi  
**Response `400 Bad Request`:**
```json
{ "message": "Option count must be between 2 and 4." }
```

---

#### `PUT /api/answertemplates/{id}`
Şablon günceller.

**Request Body:**
```json
{
  "name": "Güncellenmiş Şablon",
  "isActive": true,
  "options": [
    { "id": 1, "text": "Evet", "orderIndex": 0 },
    { "id": 2, "text": "Hayır", "orderIndex": 1 }
  ]
}
```

**Response `200 OK`:** Güncellenmiş şablon  
**Response `404 Not Found`**

---

#### `DELETE /api/answertemplates/{id}`
Şablon siler.

**Response `204 No Content`**  
**Response `404 Not Found`**

---

### ❓ Questions — Sadece Admin

#### `GET /api/questions`
Tüm soruları şablon adıyla birlikte listeler.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "text": "Ürünümüzden memnun musunuz?",
    "isActive": true,
    "answerTemplateId": 1,
    "answerTemplateName": "Evet/Hayır"
  }
]
```

---

#### `GET /api/questions/{id}`
Tek soruyu şablon ve seçenekleriyle getirir.

**Response `200 OK`:**
```json
{
  "id": 1,
  "text": "Ürünümüzden memnun musunuz?",
  "isActive": true,
  "answerTemplate": {
    "id": 1,
    "name": "Evet/Hayır",
    "isActive": true,
    "options": [
      { "id": 1, "text": "Evet", "orderIndex": 0 },
      { "id": 2, "text": "Hayır", "orderIndex": 1 }
    ]
  }
}
```

---

#### `POST /api/questions`
Yeni soru oluşturur.

**Request Body:**
```json
{
  "text": "Hizmetimizi tavsiye eder misiniz?",
  "answerTemplateId": 1
}
```

**Response `201 Created`:** Oluşturulan soru nesnesi  
**Response `400 Bad Request`:** Şablon bulunamazsa

---

#### `PUT /api/questions/{id}`
Soru günceller.

**Request Body:**
```json
{
  "text": "Güncellenmiş soru metni",
  "answerTemplateId": 2,
  "isActive": true
}
```

**Response `200 OK`:** Güncellenmiş soru  
**Response `404 Not Found`**

---

#### `DELETE /api/questions/{id}`
Soru siler.

**Response `204 No Content`**  
**Response `404 Not Found`**

---

### 📝 Surveys — Sadece Admin

#### `GET /api/surveys`
Tüm anketleri atanan kullanıcı sayısı ve yanıt sayısıyla listeler.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "title": "Müşteri Memnuniyet Anketi",
    "description": "2024 yılı değerlendirmesi",
    "startDate": "2024-01-01T00:00:00",
    "endDate": "2024-12-31T00:00:00",
    "isActive": true,
    "assignedUserCount": 10,
    "responseCount": 7
  }
]
```

---

#### `GET /api/surveys/{id}`
Anket detayını sorular ve atanan kullanıcı ID'leriyle getirir.

**Response `200 OK`:**
```json
{
  "id": 1,
  "title": "Müşteri Memnuniyet Anketi",
  "description": "2024 yılı değerlendirmesi",
  "startDate": "2024-01-01T00:00:00",
  "endDate": "2024-12-31T00:00:00",
  "isActive": true,
  "questions": [
    {
      "id": 1,
      "questionId": 1,
      "questionText": "Ürünümüzden memnun musunuz?",
      "orderIndex": 0,
      "answerTemplate": {
        "id": 1,
        "name": "Evet/Hayır",
        "isActive": true,
        "options": [
          { "id": 1, "text": "Evet", "orderIndex": 0 },
          { "id": 2, "text": "Hayır", "orderIndex": 1 }
        ]
      }
    }
  ],
  "assignedUserIds": [2, 3, 4]
}
```

---

#### `POST /api/surveys`
Yeni anket oluşturur.

**Request Body:**
```json
{
  "title": "Çalışan Memnuniyet Anketi",
  "description": "Yıllık değerlendirme",
  "startDate": "2024-06-01T00:00:00",
  "endDate": "2024-06-30T00:00:00",
  "isActive": true,
  "questionIds": [1, 2, 3],
  "userIds": [2, 3]
}
```

**Response `201 Created`:** Oluşturulan anket detay nesnesi

---

#### `PUT /api/surveys/{id}`
Anket günceller. `questionIds` ve `userIds` tamamen yenisiyle değiştirilir.

**Request Body:** `POST /api/surveys` ile aynı yapı  
**Response `200 OK`:** Güncellenmiş anket detayı  
**Response `404 Not Found`**

---

#### `DELETE /api/surveys/{id}`
Anket siler. İlişkili sorular ve atamalar da silinir.

**Response `204 No Content`**  
**Response `404 Not Found`**

---

### 📊 Reports — Sadece Admin

#### `GET /api/reports`
Tüm anketleri istatistiklerle listeler (`GET /api/surveys` ile aynı yapı).

**Response `200 OK`:** Anket listesi (assignedUserCount, responseCount dahil)

---

#### `GET /api/reports/{surveyId}`
Belirli anketin detaylı raporunu getirir.

**Response `200 OK`:**
```json
{
  "surveyId": 1,
  "title": "Müşteri Memnuniyet Anketi",
  "totalAssigned": 10,
  "totalCompleted": 7,
  "totalPending": 3,
  "completedResponses": [
    {
      "userId": 2,
      "userName": "Ahmet Yılmaz",
      "userEmail": "ahmet@example.com",
      "submittedAt": "2024-06-15T10:30:00",
      "answers": [
        {
          "questionId": 1,
          "questionText": "Ürünümüzden memnun musunuz?",
          "answerText": "Evet"
        }
      ]
    }
  ],
  "pendingUsers": [
    {
      "id": 3,
      "email": "mehmet@example.com",
      "fullName": "Mehmet Kaya",
      "role": "User",
      "isActive": true
    }
  ]
}
```

**Response `404 Not Found`**

---

### 📌 My Surveys — Sadece User

#### `GET /api/my-surveys`
Kullanıcıya atanan tüm anketleri listeler (tamamlananlar dahil).

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "title": "Müşteri Memnuniyet Anketi",
    "description": "2024 yılı değerlendirmesi",
    "startDate": "2024-01-01T00:00:00",
    "endDate": "2024-12-31T00:00:00",
    "isCompleted": false
  }
]
```

---

#### `GET /api/my-surveys/{surveyId}`
Anketi sorular ve seçenekleriyle getirir.  
Sadece aktif ve geçerli tarih aralığındaki anketleri döner.

**Response `200 OK`:** Anket detay nesnesi (`GET /api/surveys/{id}` ile aynı yapı)  
**Response `404 Not Found`:** Anket bulunamadı, atanmamış, tarihi geçmiş veya pasif ise

---

#### `POST /api/my-surveys/{surveyId}/submit`
Anketi yanıtlarıyla birlikte gönderir.

**Request Body:**
```json
{
  "surveyId": 1,
  "answers": [
    { "questionId": 1, "answerOptionId": 1 },
    { "questionId": 2, "answerOptionId": 4 }
  ]
}
```

**Response `200 OK`:**
```json
{ "message": "Survey submitted successfully" }
```

**Response `400 Bad Request`:**
```json
{ "message": "Survey already completed or not available" }
```

---

## 🚀 Kurulum (Windows)

### Gereksinimler

| Araç | Versiyon | İndirme |
|------|----------|---------|
| .NET SDK | 8.0 | [dotnet.microsoft.com/en-us/download/dotnet/8.0](https://dotnet.microsoft.com/en-us/download/dotnet/8.0) |
| Node.js | 18+ LTS | [nodejs.org/en/download](https://nodejs.org/en/download) |

Kurulumu doğrulamak için:
```cmd
dotnet --version
node --version
npm --version
```

---

### 1. Repoyu Klonlayın

```cmd
git clone https://github.com/kullanici-adi/surveyapp.git
cd surveyapp
```

---

### 2. Backend

```cmd
cd Backend\SurveyApp.API
```

EF Core aracını kurun (bir kez yapılır):
```cmd
dotnet tool install --global dotnet-ef
```

Paketleri yükleyin:
```cmd
dotnet restore
```

Veritabanını oluşturun:
```cmd
dotnet ef migrations add InitialCreate --project ..\SurveyApp.Infrastructure --startup-project .
dotnet ef database update --project ..\SurveyApp.Infrastructure --startup-project .
```

Başlatın:
```cmd
dotnet run
```

> ✅ API: http://localhost:5000  
> ✅ Swagger: http://localhost:5000/swagger

---

### 3. Frontend

**Yeni bir terminal açın** (backend'i kapatmayın):

```cmd
cd Frontend\survey-app
npm install
npm run dev
```

> ✅ Uygulama: http://localhost:3000

---

## 🔑 Varsayılan Giriş

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Admin | admin@surveyapp.com | Admin123! |

Yeni kullanıcılar Admin Paneli → Kullanıcılar ekranından oluşturulabilir.

---

## 🔄 Farklı Veritabanına Geçiş

**PostgreSQL için `SurveyApp.Infrastructure.csproj`:**
```xml
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.0" />
```

**`Program.cs`:**
```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
```

**`appsettings.json`:**
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=surveyapp;Username=postgres;Password=sifre"
}
```

---

## 📄 Lisans

MIT License
