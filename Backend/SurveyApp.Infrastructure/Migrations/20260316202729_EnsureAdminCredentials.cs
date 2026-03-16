using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SurveyApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnsureAdminCredentials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
		{
			// Ensure IsDeleted columns have correct defaults
			migrationBuilder.Sql(
				"UPDATE Users SET IsDeleted = 0 WHERE IsDeleted IS NULL;");
			migrationBuilder.Sql(
				"UPDATE AnswerTemplates SET IsDeleted = 0 WHERE IsDeleted IS NULL;");
			migrationBuilder.Sql(
				"UPDATE Questions SET IsDeleted = 0 WHERE IsDeleted IS NULL;");
			migrationBuilder.Sql(
				"UPDATE Surveys SET IsDeleted = 0 WHERE IsDeleted IS NULL;");

			// Restore correct Admin123! hash
			migrationBuilder.Sql(
				"UPDATE Users SET PasswordHash = '$2a$11$AJ9ZN6mjQcNBSyQOXXGo1.aASxctJmSDwbItZKPS.CPmZKEbRYACi' WHERE Id = 1;");
		}

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
