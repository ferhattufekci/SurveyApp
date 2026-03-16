using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SurveyApp.Application.Interfaces;

namespace SurveyApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _service;
    public ReportsController(IReportService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _service.GetAllSurveysWithStatsAsync());

    [HttpGet("{surveyId}")]
    public async Task<IActionResult> GetSurveyReport(int surveyId)
    {
        var result = await _service.GetSurveyReportAsync(surveyId);
        return result == null ? NotFound() : Ok(result);
    }
}