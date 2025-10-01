using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SurveyApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDeleteAndFixHash : Migration
    {
        /// <inheritdoc />
		protected override void Up(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.Sql("ALTER TABLE Users ADD COLUMN IsDeleted INTEGER NOT NULL DEFAULT 0;");
			migrationBuilder.Sql("ALTER TABLE Users ADD COLUMN DeletedAt TEXT NULL;");
			migrationBuilder.Sql("ALTER TABLE AnswerTemplates ADD COLUMN IsDeleted INTEGER NOT NULL DEFAULT 0;");
			migrationBuilder.Sql("ALTER TABLE AnswerTemplates ADD COLUMN DeletedAt TEXT NULL;");
			migrationBuilder.Sql("ALTER TABLE Questions ADD COLUMN IsDeleted INTEGER NOT NULL DEFAULT 0;");
			migrationBuilder.Sql("ALTER TABLE Questions ADD COLUMN DeletedAt TEXT NULL;");
			migrationBuilder.Sql("ALTER TABLE Surveys ADD COLUMN IsDeleted INTEGER NOT NULL DEFAULT 0;");
			migrationBuilder.Sql("ALTER TABLE Surveys ADD COLUMN DeletedAt TEXT NULL;");
			migrationBuilder.Sql("UPDATE Users SET PasswordHash = '$2a$11$AJ9ZN6mjQcNBSyQOXXGo1.aASxctJmSDwbItZKPS.CPmZKEbRYACi' WHERE Id = 1;");
		}

        /// <inheritdoc />
		protected override void Down(MigrationBuilder migrationBuilder) { }
    }
}
