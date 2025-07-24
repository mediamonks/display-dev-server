# Display Development Server
[![npm-version](https://img.shields.io/npm/v/@mediamonks/display-dev-server)](https://www.npmjs.com/package/@mediamonks/display-dev-server)
[![npm-downloads](https://img.shields.io/npm/dm/@mediamonks/display-dev-server)](https://www.npmjs.com/package/@mediamonks/display-dev-server)
[![github-contributors](https://img.shields.io/github/contributors/mediamonks/display-dev-server)](https://github.com/mediamonks/display-dev-server)
[![github-activity](https://img.shields.io/github/commit-activity/m/mediamonks/display-dev-server)](https://github.com/mediamonks/display-dev-server/commits/master)
[![libraries.io-dependencies](https://img.shields.io/librariesio/github/mediamonks/display-dev-server)](https://libraries.io/github/mediamonks/display-dev-server)

The Display Development Server is used as a tool to build and develop display ads.

## Installation

```sh
yarn add @mediamonks/display-dev-server
```

```sh
npm i @mediamonks/display-dev-server
```

## Basic Usage

```js
// for building
dds --mode production

// for developing
dds --mode development
```

The easiest way to get started is by using the yeoman template [@mediamonks/generator-display-templates](https://github.com/mediamonks/generator-display-templates)

## Documentation

View the [documentation](https://mediamonks.github.io/display-advertising-docs/).

## Content Sources

The Display Development Server supports external data sources for dynamic content generation:

### Google Sheets
```javascript
{
  "settings": {
    "contentSource": {
      "type": "googleSheets", // explicit type (optional for backward compatibility)
      "url": "https://docs.google.com/spreadsheets/d/your-sheet-id/edit",
      "tabName": "Sheet1",
      "apiKey": "your-google-api-key", // optional
      "idField": "id", // optional
      "filter": { "active": true } // optional
    }
  }
}
```

### Asset Planner ⭐ **NEW**
```javascript
{
  "settings": {
    "contentSource": {
      "type": "assetPlanner",
      "baseUrl": "https://api.asset-planner.dev.monksflow.ai",
      "project": "your-monks-flow-project",
      "workspace": "your-monks-flow-workspace", 
      "sheetId": "your-sheet-id",
      "apiKey": "your-api-key", // optional
      "idField": "id", // optional
      "filter": { "active": true } // optional
    }
  }
}
```

### Legacy Google Sheets (Backward Compatible)
```javascript
{
  "settings": {
    "contentSource": {
      "url": "https://docs.google.com/spreadsheets/d/your-sheet-id/edit",
      "tabName": "Sheet1",
      "apiKey": "your-google-api-key" // optional
    }
  }
}
```

### Asset Planner
```javascript
{
  "settings": {
    "contentSource": {
      "type": "assetPlanner",
      "baseUrl": "https://api.asset-planner.dev.monksflow.ai",
      "project": "your-monks-flow-project",
      "workspace": "your-monks-flow-workspace", 
      "sheetId": "your-sheet-id",
      "apiKey": "your-api-key", // optional
      "idField": "id", // optional
      "filter": { "active": true } // optional
    }
  }
}
```

The content source will dynamically generate variations of your display ads based on the data from the external source.

## 🆕 Latest Updates (v11.8.0)
### Enhanced Animation Controls
- ⌨️ Keyboard Controls
  - `Space` - Play/Pause animations
  - `R` - Reload all visible banners
  - `→` - Skip to end frame
  - `.` - Forward 250ms
- 🖱 Mouse click support for play/pause
- ⏱ Animation time tracker
- ⚙️ Configurable controls visibility via `controlsOff` setting

### Configuration
```javascript
{
  // Hide visual controls while maintaining keyboard shortcuts
  controlsOff: false
}

## Contribute

View [CONTRIBUTING.md](./CONTRIBUTING.md)

## LICENSE

[MIT](./LICENSE) © MediaMonks
