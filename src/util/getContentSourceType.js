const isGoogleSpreadsheetUrl = require('./isGoogleSpreadsheetUrl');

/**
 * Determines the type of content source based on configuration
 * @param {Object} contentSource - Configuration object
 * @returns {string} - 'googleSheets', 'assetPlanner', or 'unknown'
 */
module.exports = function getContentSourceType(contentSource) {
  if (!contentSource) {
    return 'unknown';
  }

  // Check if it's explicitly marked as Asset Planner
  if (contentSource.type === 'assetPlanner') {
    return 'assetPlanner';
  }

  // Check if it has Asset Planner specific properties
  if (contentSource.baseUrl && contentSource.project && contentSource.workspace && contentSource.sheetId) {
    return 'assetPlanner';
  }

  // Check if it's a Google Sheets URL
  if (contentSource.url && isGoogleSpreadsheetUrl(contentSource.url)) {
    return 'googleSheets';
  }

  // Check if it's explicitly marked as Google Sheets
  if (contentSource.type === 'googleSheets') {
    return 'googleSheets';
  }

  // Default to Google Sheets for backward compatibility if URL is present
  if (contentSource.url) {
    return 'googleSheets';
  }

  return 'unknown';
};
