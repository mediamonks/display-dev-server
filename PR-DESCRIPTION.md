# Asset Planner Integration for Display.Monks Development Server

## Overview
This PR adds Asset Planner as a content source for the Display.Monks Development Server, enabling banner projects to fetch data from Asset Planner API in addition to existing Google Sheets support.

## 🚀 Key Features

### ✅ Asset Planner API Integration
- **Production API Support**: Connects to `https://api.asset-planner.monksflow.ai`
- **Bearer Token Authentication**: Secure JWT-based authentication
- **Sheet Structure Fetching**: Retrieves column definitions via `/sheets/one?id={sheetId}`
- **Asset Data Fetching**: Retrieves row data via `/asset-items?sheetId={sheetId}`
- **Pagination Support**: Handles large datasets (1000 items per page)

### ✅ Content Source Flexibility  
- **Dual Support**: Works with both Google Sheets and Asset Planner
- **Automatic Detection**: Intelligently detects content source type from configuration
- **Unified Interface**: Single API for both content sources through `getDataFromContentSource`
- **Backward Compatibility**: Existing Google Sheets projects continue to work unchanged

### ✅ Advanced Data Processing
- **Cell Value Extraction**: Correctly processes Asset Planner's nested cell structure (`cell.value.text`)
- **Linked Data Resolution**: Automatically resolves hierarchical data relationships with "[linked]" placeholders
- **Data Transformation**: Converts Asset Planner format to Google Sheets compatible structure
- **Multi-level Inheritance**: Supports complex parent-child data hierarchies

### ✅ Configuration & Validation
- **Updated JSON Schema**: Added Asset Planner properties to configuration schema
- **Type Safety**: Validates Asset Planner configurations at runtime
- **Clear Error Messages**: Provides helpful feedback for configuration issues

## 📋 Configuration Format

### Asset Planner Configuration
```json
{
  "settings": {
    "contentSource": {
      "type": "assetPlanner", 
      "baseUrl": "https://api.asset-planner.monksflow.ai",
      "project": "project-uuid",
      "workspace": "workspace-uuid", 
      "documentId": "document-id",
      "sheetId": "sheet-id",
      "apiKey": "jwt-bearer-token"
    }
  }
}
```

### Google Sheets Configuration (Unchanged)
```json
{
  "settings": {
    "contentSource": {
      "type": "googleSheets",
      "url": "https://docs.google.com/spreadsheets/d/SHEET_ID",
      "tabName": "Sheet1", 
      "apiKey": "google-api-key"
    }
  }
}
```

## 🔧 Technical Implementation

### New Files Added
- `src/util/getDataFromAssetPlanner.js` - Asset Planner API client with authentication and data processing
- `src/util/getContentSourceType.js` - Intelligent content source detection logic
- `src/util/getDataFromContentSource.js` - Unified router for both content sources
- `docs/ASSET-PLANNER.md` - Complete integration documentation and usage guide
- `examples/.richmediarc.assetplanner.json` - Asset Planner configuration example
- `examples/.richmediarc.googlesheets.json` - Google Sheets configuration example

### Core Files Modified
- `src/util/expandWithSpreadsheetData.js` - Added Asset Planner support to data expansion workflow
- `src/webpack/devServer.js` - Updated reload endpoints to handle Asset Planner configurations  
- `src/webpack/devServerParallel.js` - Updated parallel dev server with Asset Planner support
- `src/schema/richmediarc.schema.json` - Added Asset Planner configuration schema
- `package.json` - Added `node-fetch` dependency for API requests

### Key Algorithms
1. **Content Source Detection**: Automatically identifies Asset Planner vs Google Sheets based on configuration properties
2. **Asset Planner Data Fetching**: Two-step process to fetch sheet structure then asset items
3. **Linked Data Resolution**: Recursive algorithm to resolve "[linked]" values from parent rows
4. **Data Transformation**: Converts Asset Planner's nested structure to flat key-value pairs

## 🧪 Testing & Verification

### Real Data Testing
- ✅ **BMW Project Integration**: Tested with real BMW Asset Planner project
- ✅ **Data Accuracy**: Verified 65 columns and 3 rows of real banner data (not mock data)
- ✅ **Cell Value Extraction**: Confirmed correct extraction of text values from Asset Planner format
- ✅ **Linked Data**: Validated hierarchical data resolution across parent-child relationships

### Compatibility Testing  
- ✅ **Backward Compatibility**: Existing Google Sheets projects remain fully functional
- ✅ **Schema Validation**: All configurations pass JSON schema validation
- ✅ **Dev Server**: Both regular and parallel dev servers work with Asset Planner
- ✅ **Dynamic Reload**: Hot reload functionality works with Asset Planner data updates

## 📚 Documentation

### Complete Documentation Package
- **Integration Guide**: `docs/ASSET-PLANNER.md` with step-by-step setup instructions
- **Configuration Examples**: Real-world examples for both content source types
- **API Reference**: Detailed documentation of Asset Planner API endpoints used
- **Migration Guide**: Instructions for moving from Google Sheets to Asset Planner
- **Troubleshooting**: Common issues and solutions

### Updated Project Documentation
- **README.md**: Added Asset Planner documentation links and feature overview
- **CHANGELOG.md**: Documented all changes and new features
- **Schema Documentation**: Updated JSON schema with comprehensive Asset Planner support

## 🔍 Issues Resolved

### Problem: Dynamic Data Reload Compatibility
**Issue**: The `/reload_dynamic_data` endpoint used Google Sheets-specific property destructuring
**Solution**: Updated endpoint to handle both content source types with proper cache key generation

### Problem: Cell Value Extraction  
**Issue**: Asset Planner uses nested cell structure different from Google Sheets
**Solution**: Implemented `cell.value.text` extraction pattern with fallback handling

### Problem: Linked Data Resolution
**Issue**: Asset Planner supports hierarchical data with "[linked]" placeholders
**Solution**: Implemented recursive resolution algorithm using `fillLinked` function

## 🚦 Breaking Changes
**None** - This is a purely additive feature that maintains full backward compatibility with existing Google Sheets configurations.

## 📦 Dependencies Added
- `node-fetch@^2.6.7` - For making HTTP requests to Asset Planner API

## 🎯 Testing Instructions

### Test Asset Planner Integration
1. Create `.richmediarc` with Asset Planner configuration (see examples)
2. Add valid Asset Planner credentials (baseUrl, project, workspace, sheetId, apiKey)
3. Run `npx display-dev-server`
4. Verify banner data loads from Asset Planner instead of showing placeholder values

### Test Backward Compatibility
1. Use existing Google Sheets `.richmediarc` configuration
2. Run `npx display-dev-server` 
3. Verify Google Sheets functionality remains unchanged

## ✅ Checklist
- [x] Asset Planner API integration implemented
- [x] Content source type detection working
- [x] Linked data resolution implemented  
- [x] Schema validation updated
- [x] Dev server endpoints updated
- [x] Documentation complete
- [x] Examples provided
- [x] Backward compatibility maintained
- [x] Real data testing completed
- [x] No breaking changes introduced

## 🎉 Impact
This integration significantly expands the Display.Monks Development Server's capabilities by adding support for Asset Planner as a modern content management solution while maintaining all existing Google Sheets functionality. Teams can now choose the content source that best fits their workflow and gradually migrate to Asset Planner when ready.
