# Changelog

## [Unreleased]
### Added
- Asset Planner integration as alternative content source
  - Support for Asset Planner API as data source alongside Google Sheets
  - New `contentSource.type` field to specify source type ("assetPlanner" or "googleSheets")
  - Backward compatibility with existing Google Sheets configurations
  - Unified data fetching through `getDataFromContentSource` utility
  - Schema validation for Asset Planner configuration
  - Example configurations and documentation

### Enhanced
- Content source detection and type validation
- Schema definition for contentSource configurations
- Error handling for external API integrations

## [11.9.0] - 2025-02-07
### Changed
- Updated media handling and preview functionality
- Version alignment in package.json and package-lock.json

### Fixed
- Version inconsistency between package files

## [11.8.0] - 2024-09-10

### Added
- Enhanced animation control features:
  - Keyboard shortcuts for play/pause (Space)
  - Reload functionality (R key)
  - Skip to end (Right arrow)
  - Forward 250ms (. key)
  - Mouse click controls
  - Animation time tracker
- New configuration option `controlsOff` to toggle visual controls

### Changed
- Improved animation control accessibility for non-technical users
- Enhanced preview interface with time tracking display

## [11.7.0] - 2024-03-27

### Added
- Custom info chips for banner metadata
- GSDevTools keyboard toggle (G+S)
- SASS support
- Favicon and brand logo integration

### Improved
- URL parameter handling
- SVG optimization settings

### Technical
- Updated GitHub Actions workflow
- Improved CI/CD pipeline configuration