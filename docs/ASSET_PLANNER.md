# Asset Planner Integration

This document describes how to integrate Asset Planner as a content source for dynamic ad generation.

## Overview

The Display Development Server now supports Asset Planner as an alternative to Google Sheets for external data sources. This allows you to use Asset Planner sheets to dynamically generate multiple variations of your display ads.

## Configuration

### Basic Configuration

Add a `contentSource` configuration to your `.richmediarc` file:

```json
{
  "settings": {
    "contentSource": {
      "type": "assetPlanner",
      "baseUrl": "https://api.asset-planner.dev.monksflow.ai",
      "project": "your-monks-flow-project",
      "workspace": "your-monks-flow-workspace",
      "sheetId": "your-sheet-id",
      "apiKey": "your-api-key"
    }
  }
}
```

### Required Parameters

- **type**: Must be set to `"assetPlanner"`
- **baseUrl**: Asset Planner API base URL
- **project**: Your Monks Flow project identifier (sent as `monks-flow-project` header)
- **workspace**: Your Monks Flow workspace identifier (sent as `monks-flow-workspace` header)
- **sheetId**: The ID of the specific sheet to fetch data from

### Optional Parameters

- **apiKey**: API key for authentication (sent as `Authorization: Bearer` header)
- **idField**: Field name to use as unique identifier for each row (default: uses row index)
- **filter**: Object or array of objects to filter rows based on specific criteria

### Filter Examples

#### Single Filter
```json
{
  "contentSource": {
    "type": "assetPlanner",
    "filter": { "active": true }
  }
}
```

#### Multiple Filters
```json
{
  "contentSource": {
    "type": "assetPlanner", 
    "filter": [
      { "active": true },
      { "type": "banner" }
    ]
  }
}
```

## API Integration

The integration uses the Asset Planner API as documented at:
https://api.asset-planner.dev.monksflow.ai/swagger

### API Endpoints Used

1. **GET /sheets?id={sheetId}** - Retrieves sheet metadata and column structure
   - Headers: `monks-flow-project`, `monks-flow-workspace`
   - Optional: `Authorization: Bearer {apiKey}`

### Data Transformation

The Asset Planner data is transformed to match the Google Sheets format for compatibility:

- **headerValues**: Array of column labels from the sheet structure
- **rows**: Array of row objects where each object has column labels as keys

## Environment Variables

You can use environment variables for sensitive data:

```bash
export ASSET_PLANNER_API_KEY="your-api-key"
export MONKS_FLOW_PROJECT="your-project"
export MONKS_FLOW_WORKSPACE="your-workspace"
```

Then reference them in your configuration:

```json
{
  "contentSource": {
    "type": "assetPlanner",
    "baseUrl": "https://api.asset-planner.dev.monksflow.ai",
    "project": "{{env.MONKS_FLOW_PROJECT}}",
    "workspace": "{{env.MONKS_FLOW_WORKSPACE}}",
    "sheetId": "your-sheet-id",
    "apiKey": "{{env.ASSET_PLANNER_API_KEY}}"
  }
}
```

## Migration from Google Sheets

If you're migrating from Google Sheets to Asset Planner:

### Before (Google Sheets)
```json
{
  "contentSource": {
    "url": "https://docs.google.com/spreadsheets/d/abc123/edit",
    "tabName": "Sheet1",
    "apiKey": "google-api-key"
  }
}
```

### After (Asset Planner)
```json
{
  "contentSource": {
    "type": "assetPlanner",
    "baseUrl": "https://api.asset-planner.dev.monksflow.ai",
    "project": "your-project",
    "workspace": "your-workspace",
    "sheetId": "your-sheet-id",
    "apiKey": "asset-planner-api-key"
  }
}
```

## Troubleshooting

### Common Issues

1. **Authentication Error**
   - Verify your API key is correct
   - Check that the API key has access to the specified project and workspace

2. **Sheet Not Found**
   - Verify the sheet ID exists in the specified workspace
   - Check that the sheet is active and accessible

3. **Missing Headers**
   - Ensure `monks-flow-project` and `monks-flow-workspace` headers are properly set
   - Verify the project and workspace identifiers are correct

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
DEBUG=display-dev-server* dds --mode development
```

## Current Limitations

- The current implementation is a basic integration that fetches sheet structure
- Row data fetching needs to be completed based on the actual Asset Planner API documentation
- Some advanced Google Sheets features may not be available

## Contributing

If you encounter issues or want to improve the Asset Planner integration, please:

1. Check the Asset Planner API documentation for the latest endpoints
2. Test with actual Asset Planner data
3. Submit pull requests with improvements
