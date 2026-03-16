using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SurveyApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixAdminPasswordHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.UpdateData(
				table: "Users",
				keyColumn: "Id",
				keyValue: 1,
				column: "PasswordHash",
				value: "$2a$11$AJ9ZN6mjQcNBSyQOXXGo1.aASxctJmSDwbItZKPS.CPmZKEbRYACi");
		}

        /// <inheritdoc />
		protected override void Down(MigrationBuilder migrationBuilder) { }
    }
}
