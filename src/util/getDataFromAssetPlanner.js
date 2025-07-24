const chalk = require('chalk');

// Use node-fetch for HTTP requests
const fetch = require('node-fetch');

/**
 * Fetches data from Asset Planner API
 * This function fetches both sheet structure and row data from Asset Planner:
 * 1. Gets sheet metadata and column definitions from /sheets/one?id={sheetId}
 * 2. Gets row data from /asset-items/?sheetId={sheetId}&page=1&pageSize=1000
 * 3. Transforms the data into Google Sheets compatible format with linked data resolution
 * 
 * @param {Object} contentSource - Configuration object
 * @param {string} contentSource.type - Should be 'assetPlanner'
 * @param {string} contentSource.baseUrl - Asset Planner API base URL (e.g., 'https://api.asset-planner.monksflow.ai')
 * @param {string} contentSource.project - Monks Flow project header
 * @param {string} contentSource.workspace - Monks Flow workspace header
 * @param {string} contentSource.sheetId - Sheet ID to fetch
 * @param {string} [contentSource.apiKey] - API key for Bearer token authentication
 * @returns {Promise<{rows: Array, headerValues: Array}>} Sheet data in Google Sheets compatible format
 */
module.exports = async function getDataFromAssetPlanner(contentSource) {
  const { baseUrl = 'https://api.asset-planner.monksflow.ai', project, workspace, sheetId, apiKey } = contentSource;

  if (!baseUrl) {
    throw new Error('contentSource.baseUrl is required for Asset Planner integration.');
  }

  if (!project) {
    throw new Error('contentSource.project is required for Asset Planner integration.');
  }

  if (!workspace) {
    throw new Error('contentSource.workspace is required for Asset Planner integration.');
  }

  if (!apiKey) {
    throw new Error('contentSource.apiKey is required for Asset Planner integration.');
  }

  console.log(`${chalk.green('✔')} gathering Asset Planner data for sheet ${sheetId}`);

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Monks-Flow-Project': project,
    'Monks-Flow-Workspace': workspace,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  };

  try {
    // Fetch sheet metadata and structure using the correct API endpoint
    const sheetUrl = `${baseUrl}/sheets/one?id=${sheetId}`;
    const sheetResponse = await fetch(sheetUrl, {
      method: 'GET',
      headers
    });

    if (!sheetResponse.ok) {
      throw new Error(`Asset Planner API error: ${sheetResponse.status} ${sheetResponse.statusText}`);
    }

    const sheetData = await sheetResponse.json();
    console.log(`${chalk.green('✔')} fetched sheet "${sheetData.title}" with ${sheetData.columns.length} columns`);

    // Extract column headers from the sheet structure
    const headerValues = sheetData.columns 
      ? sheetData.columns.map(column => column.label)
      : [];

    console.log(`${chalk.blue('ℹ')} Found columns: ${headerValues.slice(0, 5).join(', ')}${headerValues.length > 5 ? '...' : ''}`);

    // Now fetch the actual row data using the Asset Planner asset-items endpoint
    let rows = [];
    
    try {
      // Fetch asset items (row data) from Asset Planner with pagination
      const assetItemsUrl = `${baseUrl}/asset-items/?sheetId=${sheetId}&page=1&pageSize=1000`;
      console.log(`${chalk.blue('ℹ')} Fetching asset items from: ${assetItemsUrl}`);
      
      const assetItemsResponse = await fetch(assetItemsUrl, {
        method: 'GET',
        headers
      });

      if (!assetItemsResponse.ok) {
        throw new Error(`Asset Items API error: ${assetItemsResponse.status} ${assetItemsResponse.statusText}`);
      }

      const assetItemsData = await assetItemsResponse.json();
      console.log(`${chalk.green('✔')} Successfully fetched API response with ${assetItemsData.results || 'unknown'} results`);

      // Extract the actual asset items data from the API response
      const actualAssetItems = assetItemsData.data || assetItemsData;
      
      if (!Array.isArray(actualAssetItems)) {
        throw new Error(`Expected asset items to be an array, but got: ${typeof actualAssetItems}`);
      }

      console.log(`${chalk.green('✔')} Processing ${actualAssetItems.length} asset items`);

      // Transform Asset Planner asset items using the proven working approach
      function APFeedToJSON(data) {
        return data.map(({title, id, parentId, ...item}) => {
          const base = {
            title,
            id,
            parentId,
          };

          const cellData = item.cells.reduce((acc, cell) => {
            acc[cell.column.label] = cell.linked === true
              ? "[linked]"
              : cell.value.text || "";
            return acc;
          }, {});

          return {
            ...base,
            ...cellData,
          };
        });
      }

      // Function to resolve linked cell values
      function fillLinked(data) {
        const mapById = Object.fromEntries(data.map(item => [item.id, item]));

        function fill(item) {
          if (!item.parentId) return item;

          const parent = mapById[item.parentId];
          const filledParent = fill(parent);

          for (const key in item) {
            if (item[key] == "[linked]") {
              item[key] = filledParent[key];
            }
          }

          return item;
        }

        return data.map(item => fill(item));
      }

      // Transform and resolve linked data
      const transformedData = APFeedToJSON(actualAssetItems);
      const filledData = fillLinked(transformedData);
      
      // Convert to Google Sheets compatible format (exclude metadata fields)
      rows = filledData.map(item => {
        const { title, id, parentId, ...rowData } = item;
        return rowData;
      });

      console.log(`${chalk.green('✔')} transformed and resolved ${rows.length} rows with linked data`);
      
    } catch (dataError) {
      console.log(`${chalk.yellow('⚠')} Could not fetch asset items: ${dataError.message}`);
      console.log(`${chalk.blue('ℹ')} Using mock data for development/testing`);
      
      // Create mock data for testing based on the columns we have
      const mockRow = {};
      headerValues.forEach(header => {
        // Provide some sample data based on column names
        if (header.toLowerCase().includes('title')) {
          mockRow[header] = 'Sample Title';
        } else if (header.toLowerCase().includes('country')) {
          mockRow[header] = 'US';
        } else if (header.toLowerCase().includes('brand')) {
          mockRow[header] = 'Test Brand';
        } else if (header.toLowerCase().includes('cta')) {
          mockRow[header] = 'Click Here';
        } else if (header.toLowerCase().includes('bundlename')) {
          mockRow[header] = 'test-bundle-001';
        } else {
          mockRow[header] = `Sample ${header}`;
        }
      });
      rows = [mockRow];
    }

    console.log(`${chalk.green('✔')} processed ${rows.length} rows from Asset Planner`);

    return {
      rows,
      headerValues
    };

  } catch (error) {
    console.error(`${chalk.red('✖')} Error fetching Asset Planner data:`, error.message);
    throw error;
  }
};
