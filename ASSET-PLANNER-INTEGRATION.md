# Asset Planner Integration - Quick Start Guide

## Overview
The Display Development Server now supports Asset Planner as a content source, allowing you to generate dynamic banner variations from Asset Planner data.

## Quick Configuration

### For Asset Planner:
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

### For Google Sheets (still supported):
```json
{
  "settings": {
    "contentSource": {
      "type": "googleSheets",
      "url": "https://docs.google.com/spreadsheets/d/your-sheet-id/edit",
      "tabName": "Sheet1",
      "apiKey": "your-google-api-key"
    }
  }
}
```

## Usage
1. Configure your `.richmediarc` file with the appropriate contentSource
2. Run the development server: `dds --mode development`
3. The server will automatically fetch data and generate banner variations

## Features
- ✅ Asset Planner API integration
- ✅ Google Sheets backward compatibility  
- ✅ Automatic content source detection
- ✅ Data filtering and processing
- ✅ Error handling and validation
- ✅ Schema validation
- ✅ Nested object support via dot notation

## Files Modified/Created
- `src/util/getDataFromAssetPlanner.js` - Asset Planner API client
- `src/util/getContentSourceType.js` - Content source type detection
- `src/util/getDataFromContentSource.js` - Unified data fetching
- `src/util/expandWithSpreadsheetData.js` - Updated to support both sources
- `src/webpack/devServer.js` - Updated to use unified data fetcher
- `src/webpack/devServerParallel.js` - Updated to use unified data fetcher
- `src/schema/richmediarc.schema.json` - Updated with contentSource schema
- `docs/ASSET-PLANNER.md` - Comprehensive documentation

## Next Steps
1. Test with actual Asset Planner API endpoints
2. Adjust API data mapping based on real response format
3. Add authentication handling as needed
4. Consider adding more Asset Planner specific features
