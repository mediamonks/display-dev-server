const chalk = require('chalk');
const webpack = require('webpack');
const getTemplate = require('../util/getBuildTemplate');
const fs = require('fs-extra');
const path = require('path');
const globPromise = require('glob-promise');

module.exports = async function buildFiles(result, buildTarget) {
  const webpackPromiseArray = [];

  result.forEach(result => {
    const config = result.webpack;
    webpackPromiseArray.push(new Promise((resolve, reject) => {
        webpack(config).run((err, stats) => {

          if (err) {
            console.error(err.stack || err);
            if (err.details) {
              err.details.forEach((item, index) => {
                console.error(index, item);
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

          resolve();
        });
      }),
    );
  });

  await Promise.all(webpackPromiseArray);

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
  await fs.mkdir('./build/static/');
  const staticPreviewFiles = ['gsap.min.js', 'GSDevTools.min.js', 'main.js', 'material-design.css', 'material-design.js', 'style.css'];
  await staticPreviewFiles.forEach(filename => {
    fs.copyFile(path.join(__dirname, '../data/static/')+filename, './build/static/'+filename, (err) => {
      if (err) throw err;
    });
  });


  //return built index.html
  await fs.outputFile('./build/index.html', template(templateConfig));



  console.log('Removing temp .richmediarc...')
  result.forEach(result => {
    try {
      if (result.settings.willBeDeletedAfterServerCloses) {
        console.log('checking ' + result.settings.location)
        const fileData = fs.readFileSync(result.settings.location, {encoding: 'utf8'});
        const fileDataJson = JSON.parse(fileData);

        if (result.settings.uniqueHash === fileDataJson.uniqueHash) {
          console.log('valid. deleting ' + result.settings.location)
          fs.unlinkSync(result.settings.location);
        } else {
          console.log('not valid.')
        }
      }

    } catch (e) {
      console.log(e);
      console.log('Could not clean up file(s). Manual cleanup needed');
    }
  })

  return globPromise(`${buildTarget}/**/*`);

}
