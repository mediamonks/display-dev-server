const chalk = require("chalk");
const extendObject = require("./extendObject");
const createObjectFromJSONPath = require("./createObjectFromJSONPath");
const crypto = require("crypto");
const getDataFromContentSource = require("./getDataFromContentSource");

module.exports = async function expandWithSpreadsheetData(configs, mode) {
  // add support for google sheets.
  // detect if contentSource is available in

  const hasSameLocation = (location) => {
    for (let i = 0; i < newConfigList.length; i++) {
      const newConfigListElement = newConfigList[i];
      if (newConfigListElement.location === location) {
        return true;
      }
    }
  };

  /**
   *
   * @param {string} location
   * @param {object} contentSource
   * @param {object} row
   * @param {number} index
   * @param {number} offset
   * @return {string}
   */
  const getUniqueLocation = (location, contentSource, row, index, offset = 0) => {
    // Update the location naming to be more generic
    const sourceType = contentSource.type || 'googlesheet';
    location = location.replace("richmediarc", sourceType === 'assetPlanner' ? 'assetplanner' : 'googlesheet');

    if (contentSource.idField) {
      let name = `${location}.${row[contentSource.idField]}`;

      if (offset > 0) {
        name = `${name}_${offset}`;
      }

      if (hasSameLocation(name)) {
        return getUniqueLocation(location, contentSource, row, index, offset + 1);
      } else {
        return name;
      }
    }

    return `${location}.row_${index}`;
  };

  const cacheSpreadSheets = {};

  // fetch and pre-process
  await Promise.all(
    configs
      .map((config) => config.data?.settings?.contentSource)
      .filter((contentSource) => contentSource !== undefined)
      .map((contentSource) => {
        // Create a cache key based on the content source type and configuration
        if (contentSource.type === 'assetPlanner') {
          const { baseUrl, project, workspace, sheetId, apiKey } = contentSource;
          return JSON.stringify({ type: 'assetPlanner', baseUrl, project, workspace, sheetId, apiKey });
        } else {
          // Fallback to Google Sheets format for backward compatibility
          const { url, tabName, apiKey } = contentSource;
          return JSON.stringify({ type: 'googleSheets', url, tabName, apiKey });
        }
      })
      .filter((x, i, a) => a.indexOf(x) == i) // unique
      .map(JSON.parse)
      .map(async (cacheKey) => {
        // Reconstruct contentSource from cache key
        const contentSource = { ...cacheKey };
        delete contentSource.type; // Remove type as it's just for caching
        
        const spreadsheetData = await getDataFromContentSource(contentSource);

        const staticRowObjects = spreadsheetData.rows.map((row) => {
          const staticRow = spreadsheetData.headerValues.reduce((prev, name) => {
            prev[name] = row[name];
            return prev;
          }, {});

          let staticRowObject = {};
          for (const key in staticRow) {
            if (staticRow.hasOwnProperty(key)) {
              let obj = createObjectFromJSONPath(key, staticRow[key]);
              extendObject(staticRowObject, obj);
            }
          }

          return staticRowObject;
        });

        const cacheKeyString = JSON.stringify(cacheKey);
        cacheSpreadSheets[cacheKeyString] = {
          spreadsheetData,
          staticRowObjects,
        };
      })
  );

  const newConfigList = [];

  // filter and push
  configs.forEach((config) => {
    const { data, location } = config;
    const contentSource = data?.settings?.contentSource;

    if (!contentSource) {
      return newConfigList.push({ data, location });
    }

    // Create cache key for lookup
    let cacheKey;
    if (contentSource.type === 'assetPlanner') {
      const { baseUrl, project, workspace, sheetId, apiKey } = contentSource;
      cacheKey = JSON.stringify({ type: 'assetPlanner', baseUrl, project, workspace, sheetId, apiKey });
    } else {
      const { url, tabName, apiKey } = contentSource;
      cacheKey = JSON.stringify({ type: 'googleSheets', url, tabName, apiKey });
    }

    const { spreadsheetData, staticRowObjects } = cacheSpreadSheets[cacheKey];

    spreadsheetData.rows.forEach((row, index) => {
      const staticRowObject = staticRowObjects[index];

      // check if the row data passes the filter. return if not
      if (contentSource.filter) {
        const filters = [];
        if (contentSource.filter instanceof Array) {
          filters.push(...contentSource.filter);
        } else {
          filters.push(contentSource.filter);
        }

        // for loop so i can break or return immediately
        for (let j = 0; j < filters.length; j++) {
          const filter = filters[j];
          for (const key in filter) {
            if (filter.hasOwnProperty(key) && staticRowObject[key] && staticRowObject[key] !== filter[key]) {
              return;
            }
          }
        }
      }

      const content = extendObject({}, data.content || {}, staticRowObject);

      const uniqueLocation = getUniqueLocation(location, contentSource, row, index);

      let newObj = {
        data: {
          ...JSON.parse(JSON.stringify(data)),
          content,
          uniqueHash: uniqueLocation,
        },
        location: uniqueLocation,
        willBeDeletedAfterServerCloses: true,
        row,
        uniqueHash: uniqueLocation,
        mode,
      };

      newConfigList.push(newObj);
    });
  });

  console.log(`${chalk.green("✔")} adding ${newConfigList.length} items for development`);

  return newConfigList;
};
