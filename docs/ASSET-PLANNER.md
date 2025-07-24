# Asset Planner Integration

The Display Development Server now supports Asset Planner as a content source for dynamic banner generation. This allows you to manage your banner data through the Asset Planner platform and automatically generate banner variations based on your data.

## Overview

Asset Planner integration allows you to:
- Connect to Asset Planner sheets via API
- Dynamically generate banner variations from your data
- Filter and process data from Asset Planner
- Use Asset Planner data to populate banner content

## Configuration

### Basic Configuration

```javascript
{
  "settings": {
    "contentSource": {
      "type": "assetPlanner",
      "baseUrl": "https://api.asset-planner.monksflow.ai",
      "project": "your-monks-flow-project",
      "workspace": "your-monks-flow-workspace",
      "sheetId": "your-sheet-id",
      "apiKey": "your-api-key"
    }
  }
}
```

### Configuration with Authentication

```javascript
{
  "settings": {
    "contentSource": {
      "type": "assetPlanner",
      "baseUrl": "https://api.asset-planner.monksflow.ai",
      "project": "your-monks-flow-project",
      "workspace": "your-monks-flow-workspace",
      "sheetId": "your-sheet-id",
      "apiKey": "your-api-key"
    }
  }
}
```

### Advanced Configuration with Filtering

```javascript
{
  "settings": {
    "contentSource": {
      "type": "assetPlanner",
      "baseUrl": "https://api.asset-planner.dev.monksflow.ai",
      "project": "your-monks-flow-project",
      "workspace": "your-monks-flow-workspace",
      "sheetId": "your-sheet-id",
      "apiKey": "your-api-key",
      "idField": "campaignId",
      "filter": [
        { "status": "active" },
        { "market": "US" }
      ]
    }
  }
}
```

## Configuration Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `string` | ✅ | Must be `"assetPlanner"` |
| `baseUrl` | `string` | ✅ | Asset Planner API base URL |
| `project` | `string` | ✅ | Monks Flow project identifier |
| `workspace` | `string` | ✅ | Monks Flow workspace identifier |
| `sheetId` | `string` | ✅ | ID of the Asset Planner sheet |
| `apiKey` | `string` | ❌ | API key for authentication |
| `idField` | `string` | ❌ | Field to use as unique identifier for rows |
| `filter` | `object\|array` | ❌ | Filter conditions to apply to data |

## Authentication

Asset Planner integration supports API key authentication. You can provide your API key in two ways:

1. **Configuration file**: Include `apiKey` in your contentSource configuration
2. **Environment variable**: Set `ASSET_PLANNER_API_KEY` environment variable

```bash
export ASSET_PLANNER_API_KEY="your-api-key"
```

## Filtering Data

You can filter the data from Asset Planner using the `filter` parameter:

### Single Filter
```javascript
"filter": { "status": "active" }
```

### Multiple Filters (AND condition)
```javascript
"filter": [
  { "status": "active" },
  { "market": "US" },
  { "campaign_type": "display" }
]
```

## Data Mapping

Asset Planner data is automatically mapped to your banner content. Column names from your Asset Planner sheet become available as variables in your banner:

### Asset Planner Sheet:
| title | image_url | cta_text | background_color |
|-------|-----------|----------|------------------|
| "Summer Sale" | "https://..." | "Shop Now" | "#ff6b35" |
| "Winter Deal" | "https://..." | "Buy Today" | "#4a90e2" |

### Banner Template Usage:
```html
<div style="background-color: {{background_color}}">
  <h1>{{title}}</h1>
  <img src="{{image_url}}" alt="{{title}}">
  <button>{{cta_text}}</button>
</div>
```

## Nested Object Support

You can use dot notation in column names to create nested objects:

### Asset Planner Sheet:
| content.title | content.subtitle | styles.background | styles.text.color |
|---------------|------------------|-------------------|-------------------|
| "Main Title" | "Subtitle" | "#ffffff" | "#000000" |

### Resulting Object:
```javascript
{
  content: {
    title: "Main Title",
    subtitle: "Subtitle"
  },
  styles: {
    background: "#ffffff",
    text: {
      color: "#000000"
    }
  }
}
```

## Linked Data Resolution

Asset Planner supports hierarchical data structures with linked cells. The integration automatically resolves linked cell values by inheriting from parent rows.

### How It Works

1. **Linked Cells**: When a cell is marked as "linked" in Asset Planner, it inherits its value from the parent row
2. **Automatic Resolution**: The integration automatically resolves these links and fills in the actual values
3. **Hierarchical Support**: Multi-level hierarchies are supported through recursive resolution

### Example

Consider this Asset Planner sheet structure:

| Row Type | title | country | brand |
|----------|-------|---------|-------|
| Master | "Global Campaign" | "US" | "Nike" |
| Child | "[linked]" | "[linked]" | "Adidas" |

After linked data resolution:

| Row Type | title | country | brand |
|----------|-------|---------|-------|
| Master | "Global Campaign" | "US" | "Nike" |
| Child | "Global Campaign" | "US" | "Adidas" |

The child row inherits `title` and `country` from its parent but overrides `brand` with its own value.

### Data Structure

Each row in Asset Planner contains:
- `title`: Row name/identifier
- `id`: Unique row ID
- `parentId`: Reference to parent row (for linked data)
- `cells`: Array of cell data with column mappings

The integration processes this structure to create flat objects compatible with the banner generation system.

## Error Handling

The integration includes comprehensive error handling:

- **Missing configuration**: Clear error messages for missing required parameters
- **API errors**: Detailed error messages for API communication issues
- **Data validation**: Validation of sheet structure and data format
- **Network issues**: Graceful handling of connection problems

## Migration from Google Sheets

If you're migrating from Google Sheets to Asset Planner:

1. **Export your data** from Google Sheets
2. **Import the data** into Asset Planner
3. **Update your configuration** to use Asset Planner format:

```javascript
// From this (Google Sheets)
{
  "contentSource": {
    "url": "https://docs.google.com/spreadsheets/d/abc123/edit",
    "tabName": "Sheet1"
  }
}

// To this (Asset Planner)
{
  "contentSource": {
    "type": "assetPlanner",
    "baseUrl": "https://api.asset-planner.dev.monksflow.ai",
    "project": "your-project",
    "workspace": "your-workspace",
    "sheetId": "your-sheet-id"
  }
}
```

## Troubleshooting

### Common Issues

**Cannot find sheet**: Verify that the `sheetId` is correct and the sheet exists in the specified project/workspace.

**Authentication failed**: Check that your API key is valid and has the necessary permissions.

**No data returned**: Verify that your sheet contains data and that any filters are not excluding all rows.

**Network timeout**: Check your internet connection and the Asset Planner service status.

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=display-dev-server:asset-planner npm start
```

## Support

For Asset Planner API documentation, visit: https://api.asset-planner.dev.monksflow.ai/swagger

For Display Development Server issues, please create an issue on GitHub: https://github.com/mediamonks/display-dev-server/issues
