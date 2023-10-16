const path = require('path');
const fs = require('fs-extra');
const express = require('express');
const portfinder = require('portfinder');
const util = require('util');
const chalk = require('chalk');
const open = require('open');

const extendObject = require('../util/extendObject');
const createObjectFromJSONPath = require('../util/createObjectFromJSONPath');
const getDataFromGoogleSpreadsheet = require('../util/getDataFromGoogleSpreadsheet');
const removeTempRichmediaRc = require('../util/removeTempRichmediaRc');

const getNameFromLocation = require('../util/getNameFromLocation');

const workerFarm = require('worker-farm');

/**
 *
 * @param {Array<{webpack: *, settings: {location, data}}>} configs
 * @param {boolean} openLocation
 * @param {{}} options
 */
module.exports = async function devServer(configs, openLocation = true, options) {

  const N_SUBSERVERS = options.parallel === true ? 4 : options.parallel

  const settingsList = configs.map(({ settings }) => settings);
  const port = await portfinder.getPortPromise();
  
  const devSubServer = workerFarm(
    {
      maxRetries: 0,
      autoStart: true,
      maxConcurrentCallsPerWorker: 1,
      maxConcurrentWorkers: N_SUBSERVERS
    },
    require.resolve('./devSubServer')
  );

  const httpLocation = `http://localhost:${port}`;

  console.log(`${chalk.blue('i')} Server running. Please go to ${httpLocation}
${chalk.grey.bold('-------------------------------------------------------')}
`);

  const app = express();

  app.listen(port, () => {});

  const ports = await new Promise(res => portfinder.getPorts(N_SUBSERVERS, {}, (err, ports) => res(ports)))

  await Promise.all(settingsList
  // spread work evenly into chunks
  .reduce((acc, v, i) => {
    acc[i % N_SUBSERVERS].push(v)
    return acc
  }, Array.from({length: N_SUBSERVERS}, () => []))
  // if we have empty chunks (less than N_SUBSERVERS banners)
  .filter(e => e.length)
  // map to promises
  .map(async (chunk, i) => {
    // delete row since it's an object with constructor and we can't carry it to the thread
    chunk = chunk.map(({row, ...config}) => config)

    const port = ports[i]

    chunk.forEach(config => {
      const name = getNameFromLocation(config.location);
      app.use(`/${name}/`, (req, res, next) => {
        res.redirect(`http://localhost:${port}/${name}/`)
      })
    })

    return new Promise(res => devSubServer({configs: chunk, options, port}, res))
  }));
  
  app.use('/', express.static(path.join(__dirname, '../preview/dist')));
  
  openLocation && open(httpLocation);

  app.get('/data/ads.json', (req, res) => {
    res.json({
      isGoogleSpreadsheetBanner: typeof configs[0].settings.data.settings.contentSource !== 'undefined',
      ads: settingsList.map(e => {
        const assetName = getNameFromLocation(e.location)
        const bundleName = e.data.settings.bundleName || getNameFromLocation(e.location)
        const url = `${httpLocation}/${assetName}/index.html`
        return {
          url,
          ...e.data.settings.size,
          bundleName,
          output: {
            html: {
              url,
            },
          },
        }
      })
    })
  })

  app.get("/reload_dynamic_data", async function (req, res) {
    const contentSource = configs[0].settings.data.settings.contentSource;
    const spreadsheetData = await getDataFromGoogleSpreadsheet(contentSource);

    configs.forEach(config => {
      let row = spreadsheetData.rows[config.settings.row.rowNumber-2]; //for example, row number 2 is array element 0

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

      // filter out everything that is not needed.
      if (config.settings.data.settings.contentSource.filter) {
        const filters = [];
        if (config.settings.data.settings.contentSource.filter instanceof Array) {
          filters.push(...config.settings.data.settings.contentSource.filter);
        } else {
          filters.push(config.settings.data.settings.contentSource.filter);
        }

        // for loop so i can break or return emmediatly
        for (let j = 0; j < filters.length; j++) {
          const filter = filters[j];
          for (const key in filter) {
            if (filter.hasOwnProperty(key) && staticRowObject[key] && staticRowObject[key] !== filter[key]) {
              return;
            }
          }
        }
      }

      // new content object with updated content from sheet
      let content = extendObject({}, (config.settings.data.content || {}), staticRowObject)

      // next 4 lines is reading existing richmediarc from the disk, updating the content object, and then writing the new file to disk again
      const configFile = fs.readFileSync(config.settings.location, {encoding:'utf8', flag:'r'})
      const configFileJson = JSON.parse(configFile);

      if (!util.isDeepStrictEqual(configFileJson.content, content)) { //compare 'new' content with old content. If anything has changed, write a new file
        configFileJson.content = content;
        fs.writeFileSync(config.settings.location, Buffer.from(JSON.stringify(configFileJson)));
      }
    })

    res.send('ok');
  });

  // eslint-disable-next-line
  process.stdin.resume(); //so the program will not close instantly

  function exitHandler(options, exitCode) {
    if (options.cleanup) removeTempRichmediaRc(configs);
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
  }

  //do something when app is closing
  process.on('exit', exitHandler.bind(null,{cleanup:true}));

  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, {exit:true}));

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
  process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
};
