const chalk = require('chalk');
const fs = require('fs-extra');
const globPromise = require('glob-promise');
const webpack = require('webpack');
const Spinner = require('cli-spinner').Spinner;
const inquirer = require('inquirer');
const path = require('path');

const createConfigByRichmediarcList = require('./webpack/config/createConfigByRichmediarcList');
const saveChoicesInPackageJson = require('./util/saveChoicesInPackageJson');
const findRichmediaRC = require('./util/findRichmediaRC');
const parsePlaceholdersInObject = require('./util/parsePlaceholdersInObject');
const expandWithSpreadsheetData = require('./util/expandWithSpreadsheetData');
const devServer = require('./webpack/devServer');
const getTemplate = require('./util/getBuildTemplate');

module.exports = async function devBuild({mode = 'development', glob = './**/.richmediarc*', choices = null, stats = null}) {
  const buildTarget = './build';

  console.log(`${chalk.blue('i')} Searching for configs`);


  const spinner = new Spinner('processing.. %s');
  spinner.setSpinnerString('/-\\|');
  spinner.start();

  let configs = await findRichmediaRC(glob, ['settings.entry.js', 'settings.entry.html']);

  spinner.stop(true);

  if (configs.length === 0) {
    throw new Error('could not find a compatible .richmediarc with entry points configured');
  }


  console.log(`${chalk.green('✔')} Found ${configs.length} config(s)`);
  console.log(`${chalk.green('✔')} Taking a look if it has Spreadsheets`);


  // parse placeholders in content source so it works with spreadsheets
  configs.forEach(config => {
    if(config.data.settings.contentSource) {
      config.data.settings.contentSource = parsePlaceholdersInObject(config.data.settings.contentSource, config.data);
    }
  })

  configs = await expandWithSpreadsheetData(configs, mode);


  // parse placeholders for everything
  configs.forEach(config => {
    if (config.data) {
      config.data = parsePlaceholdersInObject(config.data, config.data);
    }
  });

  const questions = [];

  if (!choices) {
    let answers = {
      location: 'all',
    };

    if (mode === 'production') {
      const filesBuild = await globPromise(`${buildTarget}/**/*`);
      if (filesBuild.length > 0) {
          questions.push({
            type: 'confirm',
            name: 'emptyBuildDir',
            message: `Empty build dir? ${chalk.red(
              `( ${filesBuild.length} files in ${path.resolve(buildTarget)})`,
            )}`,
          });
      }
    }

    if (configs.length === 1) {
      console.log(`  Choosing ${configs[0].location}`);
      answers.location = configs[0].location;
    } else {
      questions.push({
        type: 'checkbox',
        name: 'location',
        message: 'Please select config(s) build:',
        choices: [
          {name: 'all', checked: false},
          ...configs.map(config => {
            let name = config.location;

            return {
              name,
              checked: false,
            };
          }),
        ],
        validate(answer) {
          if (answer.length < 1) {
            return `${chalk.red('✖ You must choose at least one.')} `;
          }
          return true;
        },
      })
    }

    if (mode === 'development') {
      questions.push({
        type: 'confirm',
        name: 'openLocation',
        message: 'Do you want a browser to open to your dev location?',
        default: true,
      });
    }

    answers = await inquirer.prompt(questions);

    await saveChoicesInPackageJson(mode === 'development' ? 'dev' : 'build', {
      glob,
      choices: answers,
      stats,
    });

    choices = answers;
  }

  if (choices.emptyBuildDir) {
    await fs.emptyDir(buildTarget);
  }

  //create list of configs based on choices
  let configsResult;
  if (choices.location.indexOf('all') > -1) {
    configsResult = configs;
  } else {
    configsResult = configs.filter(({location}) => {
      return choices.location.indexOf(location) > -1;
    });
  }

  //if the richmediarc location doesn't actually exist, assume its a config derived from google spreadsheets, so we write one to disk
  configsResult.forEach(config => {
    if (!fs.existsSync(config.location)) {
      const data = Buffer.from(JSON.stringify(config.data));
      fs.writeFileSync(config.location, data);
    }
  })

  let result = await createConfigByRichmediarcList(configsResult, {
    mode,
    stats: false,
  });

  if (mode === 'development') {

    result = result.map((webpack, index) => {
      return {
        webpack,
        settings: configsResult[index],
      };
    });

    await devServer(result, choices.openLocation);

  } else {

    return new Promise((resolve, reject) => {
      webpack(result).run((err, stats) => {

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
    })

      .then(async () => {
        const template = await getTemplate();

        console.log('Removing temp .richmediarc...')
        configsResult.forEach(config => {
          try {
            if (config.willBeDeletedAfterServerCloses) {
              console.log('checking ' + config.location)
              const fileData = fs.readFileSync(config.location, {encoding: 'utf8'});
              const fileDataJson = JSON.parse(fileData);

              if (config.uniqueHash === fileDataJson.uniqueHash) {
                console.log('valid. deleting ' + config.location)
                fs.unlinkSync(config.location);
              } else {
                console.log('not valid.')
              }
            }

          } catch (e) {
            console.log(e);
            console.log('Could not clean up file(s). Manual cleanup needed');
          }
        })

        const templateConfig = {
          banner: configsResult.map((richmediarc, index) => {

            const webpackConfig = result[index];

            let bundleName = /[^/\\]*$/.exec(webpackConfig.output.path)[0]
            // bundleName = getNameFromLocation(bundleName);
            // console.log(name);

            let width = richmediarc.data.settings.size.width;
            let height = richmediarc.data.settings.size.height;
            const isDevelopment = false;

            // if (item.data.settings.expandable) {
            //   width = item.data.settings.expandable.width;
            //   height = item.data.settings.expandable.height;
            //   title += "_EXP_" + width + "x" + height;
            // }

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
          fs.copyFile(path.join(__dirname, 'data/static/')+filename, './build/static/'+filename, (err) => {
            if (err) throw err;
          });
        });

        //return built index.html
        return fs.outputFile('./build/index.html', template(templateConfig));
      })
      .then(() => {
        return globPromise(`${buildTarget}/**/*`);
      });
  }
};
