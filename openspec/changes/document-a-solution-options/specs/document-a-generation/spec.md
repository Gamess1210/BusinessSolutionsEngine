## ADDED Requirements

### Requirement: documentAGenerationChain produces structured Document A JSON
The system SHALL provide `documentAGenerationChain` in `src/lib/chains/documentAGenerationChain.js`. The chain SHALL use Claude (claude-sonnet-4-20250514) to generate a structured JSON object representing all approved solution options for the engagement. The JSON SHALL include: `engagement_title`, `client_name`, `generated_date`, and an `options` array. Each entry in `options` SHALL contain `title`, `description`, `effort`, `impact`, `key_risk`, and `sequencing`. For `analysis_mode = 'deep'` engagements the chain SHALL also include `feasibility`, `complexity`, `roi_framing`, and `ai_central` per option.

#### Scenario: Chain invoked for a deep analysis engagement
- **WHEN** `documentAGenerationChain` is called with an engagement where `analysis_mode = 'deep'` and `solutions` contains 5 options
- **THEN** the chain returns a JSON object with an `options` array of 5 items
- **AND** each item includes `title`, `description`, `feasibility`, `complexity`, `roi_framing`, `risks`, `sequencing`, and `ai_central`

#### Scenario: Chain invoked for a quick ideas engagement
- **WHEN** `documentAGenerationChain` is called with an engagement where `analysis_mode = 'quick'` and `solutions` contains 3 options
- **THEN** the chain returns a JSON object with an `options` array of 3 items
- **AND** each item includes `title`, `description`, `effort`, `impact`, and `key_risk`

#### Scenario: Chain encounters an AI error
- **WHEN** the Claude API call fails or returns malformed JSON
- **THEN** the chain throws an error
- **AND** the calling API route catches it and sets `status = 'failed'`, `last_successful_gate = 2`, and populates `error_log`

### Requirement: Document A is rendered to A4 HTML and converted to PDF
The system SHALL render the `documentAGenerationChain` JSON output to an A4 HTML document using `comotion-a4-html-template.html`. Document A is NOT a formal client-branded proposal — it is a clean summary document. The HTML SHALL list each solution option with its fields. The system SHALL convert the HTML to a PDF using `puppeteer-core` and `@sparticuz/chromium`. The PDF SHALL be named `[ClientName]_[YYYY-MM-DD]_SolutionOptions.pdf` where `YYYY-MM-DD` is the generation date.

#### Scenario: Successful HTML render
- **WHEN** the chain JSON is passed to the HTML renderer
- **THEN** the output is a valid A4 HTML string using `comotion-a4-html-template.html`, rendered as a clean summary (not a formal branded proposal)
- **AND** all solution options appear in the rendered HTML

#### Scenario: Successful PDF conversion
- **WHEN** the A4 HTML is passed to the Puppeteer converter
- **THEN** a PDF buffer is returned
- **AND** no standard `puppeteer` package is used — only `puppeteer-core` + `@sparticuz/chromium`

### Requirement: Document A PDF is uploaded to SharePoint via Microsoft Graph API
The system SHALL upload the generated PDF buffer to SharePoint using the Microsoft Graph API. The file SHALL be placed in the configured SharePoint document library. After a successful upload the system SHALL store the SharePoint file URL in `engagements.sharepoint_solution_options_url`.

#### Scenario: Successful SharePoint upload
- **WHEN** the PDF buffer is uploaded to SharePoint
- **THEN** `engagements.sharepoint_solution_options_url` is set to the SharePoint file URL
- **AND** the engagement status advances to `gate3_review`

#### Scenario: SharePoint upload fails
- **WHEN** the Microsoft Graph API returns an error
- **THEN** the API route sets `status = 'failed'`, `last_successful_gate = 2`, and populates `error_log` with the Graph API error
- **AND** `sharepoint_solution_options_url` remains NULL

### Requirement: engagements table stores Document A SharePoint URL
The system SHALL add a `sharepoint_solution_options_url` column (text, nullable) to the `engagements` table. The column SHALL be NULL until Document A has been successfully uploaded to SharePoint.

#### Scenario: Column is NULL before Document A generation
- **WHEN** an engagement has status `proposal_pending` and Document A has not yet been generated
- **THEN** `engagements.sharepoint_solution_options_url` is NULL

#### Scenario: Column is populated after successful generation
- **WHEN** Document A has been successfully uploaded to SharePoint
- **THEN** `engagements.sharepoint_solution_options_url` contains the SharePoint file URL

### Requirement: EngagementDetail displays the Document A link when available
The system SHALL display a Document A section in EngagementDetail when `engagement.sharepoint_solution_options_url` is not NULL. The section SHALL show the file name and a link to open the document in SharePoint. The section SHALL not be displayed when `sharepoint_solution_options_url` is NULL.

#### Scenario: Document A link shown after generation
- **WHEN** the BA views EngagementDetail and `sharepoint_solution_options_url` is set
- **THEN** a "Solution Options Summary" link is displayed
- **AND** clicking it opens the SharePoint document in a new tab

#### Scenario: Document A link hidden before generation
- **WHEN** the BA views EngagementDetail and `sharepoint_solution_options_url` is NULL
- **THEN** no Document A section is displayed
