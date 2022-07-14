const chalk = require('chalk');
const webpack = require('webpack');

const fs = require('fs-extra');
const path = require('path');
const globPromise = require('glob-promise');
const cliProgress = require('cli-progress');


const getTemplate = require('../util/getPreviewTemplate');
const removeTempRichmediaRc = require('../util/removeTempRichmediaRc');

module.exports = async function buildFiles(result, buildTarget, chunkSize = 10) {
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(result.length, 0);
  let buildResult = [];

  function webpackRun(config) {
    return new Promise(resolve => {
      webpack(config.webpack).run((err, stats) => {
        if (err) {
          console.error(err.stack || err);
          if (err.details) {
            err.details.forEach((item, index) => {
              console.error(index, item.message);
            });
          }
          return;
        }

        const info = stats.toJson();

        if (stats.hasErrors()) {
          info.errors.forEach((item, index) => {
            console.log(chalk.red(item.message));
          });
        }

        if (stats.hasWarnings()) {
          info.warnings.forEach(item => {
            console.log(chalk.green(item.message));
          });
        }
        resolve(config);
      });
    });
  }

  const resultChunks = result.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index/chunkSize)
    if(!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [] // start a new chunk
    }
    resultArray[chunkIndex].push(item)
    return resultArray
  }, []);


  for (const [index, resultChunk] of resultChunks.entries()) {
    const promiseArray = resultChunk.map( result => {
      return webpackRun(result);
    });

    const newResults = await Promise.all(promiseArray);
    buildResult = buildResult.concat(newResults);

    progressBar.update(buildResult.length);
  }

  progressBar.stop();

  const template = await getTemplate();
  const templateConfig = {
    banner: result.map((result) => {

      let bundleName = /[^/\\]*$/.exec(result.webpack.output.path)[0]
      let width = result.settings.data.settings.size.width;
      let height = result.settings.data.settings.size.height;
      const isDevelopment = false;

      return {
        src: `./${bundleName}/`,
        name: bundleName,
        title: bundleName,
        width,
        height,
        isDevelopment,
      };
    }),
  };

  // move static files to folder
  await fs.mkdir(`./${buildTarget}/static/`);
  const staticPreviewFiles = ['gsap.min.js', 'GSDevTools.min.js', 'main.js', 'material-design.css', 'material-design.js', 'style.css'];
  await staticPreviewFiles.forEach(filename => {
    fs.copyFile(path.join(__dirname, `../data/static/`)+filename, `./${buildTarget}/static/${filename}`, (err) => {
      if (err) throw err;
    });
  });

  //return built index.html
  await fs.outputFile(`./${buildTarget}/index.html`, template(templateConfig));

  console.log('Removing temp .richmediarc...')
  removeTempRichmediaRc(result);

  return {
    buildTarget: path.resolve(buildTarget),
    ads: buildResult
  }
}
