const getDataFromGoogleSpreadsheet = require('./getDataFromGoogleSpreadsheet');
const getDataFromAssetPlanner = require('./getDataFromAssetPlanner');
const getContentSourceType = require('./getContentSourceType');
const chalk = require('chalk');

/**
 * Fetches data from either Google Sheets or Asset Planner based on contentSource configuration
 * @param {Object} contentSource - Configuration object
 * @returns {Promise<{rows: Array, headerValues: Array}>} Sheet data
 */
module.exports = async function getDataFromContentSource(contentSource) {
  const sourceType = getContentSourceType(contentSource);

  switch (sourceType) {
    case 'googleSheets':
      console.log(`${chalk.blue('ℹ')} Using Google Sheets as content source`);
      return await getDataFromGoogleSpreadsheet(contentSource);
      
    case 'assetPlanner':
      console.log(`${chalk.blue('ℹ')} Using Asset Planner as content source`);
      return await getDataFromAssetPlanner(contentSource);
      
    default:
      throw new Error(`Unknown content source type. Please specify either Google Sheets (with url) or Asset Planner (with type: 'assetPlanner', baseUrl, project, workspace, sheetId) configuration.`);
  }
};
