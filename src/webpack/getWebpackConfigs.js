const chalk = require("chalk");
const fs = require("fs-extra");
const globPromise = require("glob-promise");
const Spinner = require("cli-spinner").Spinner;
const inquirer = require("inquirer");
const path = require("path");
const leafs = require('../util/leafs')

const createConfigByRichmediarcList = require("./config/createConfigByRichmediarcList");
const saveChoicesInPackageJson = require("../util/saveChoicesInPackageJson");
const findRichmediaRC = require("../util/findRichmediaRC");
const parsePlaceholdersInObject = require("../util/parsePlaceholdersInObject");
const expandWithSpreadsheetData = require("../util/expandWithSpreadsheetData");
const isExternalURL = require("../util/isExternalURL");

const axios = require('axios');
const mime = require('mime');
const {v4: uuidv4} = require('uuid');


// download external images and turn them into local dependencies
const convertExternalImageUrlsToLocalPaths = async (data) => {

  const all = [];
  leafs(data, async (value, obj, name) => {

    if (isExternalURL(value)) {
      const isGDrive = value.includes('https://drive.google.com/file/d/') || value.includes('https://drive.google.com/open?id=');

      if (isGDrive) {
        all.push(new Promise(async resolve => {
          const id = value.includes('https://drive.google.com/file/d/') ? value.split('/')[5] : value.replace('https://drive.google.com/open?id=', '').split('&')[0];

          const params = {
            url: `https://www.googleapis.com/drive/v3/files/${id}`,
            method: 'GET',
            params: {
              key: apiKey
            }
          }

          const fileData = await axios(params);
          fs.mkdirpSync(path.resolve(process.cwd(), '_temp'));
          const downloadPath = path.resolve(process.cwd(), '_temp', fileData.data.name);

          params.responseType = 'stream';
          params.params.alt = 'media';
          const result = await axios(params);

          await new Promise((resolve) => {
            const writer = fs.createWriteStream(downloadPath);
            result.data.pipe(writer);
            writer.on('finish', resolve);
          });

          obj[name] = downloadPath;
          resolve();
        }))
      } else {

        all.push(new Promise(async resolve => {

          const originalImageFile = await axios({
            url: value,
            method: 'GET',
            responseType: 'stream',
          });

          const contentType = originalImageFile.headers['content-type'];
          const extension = mime.getExtension(contentType);

          if (['png', 'jpeg', 'jpg', 'svg'].includes(extension)) {

            const originalImageFile = await axios({
              url: value,
              method: 'GET',
              responseType: 'stream',
            });


            fs.mkdirpSync(path.resolve(process.cwd(), '_temp'));
            const downloadPath = path.resolve(process.cwd(), '_temp', `image.${extension}`);

            await new Promise((resolve) => {
              const writer = fs.createWriteStream(downloadPath);
              originalImageFile.data.pipe(writer);
              writer.on('finish', resolve);
            });

            obj[name] = downloadPath;
            console.log('image downloaded')
            resolve();

          } else {
            console.log('not a image')
            resolve();
          }
        }))
      }
    }
  });

  await Promise.all(all);

  return data;
}



module.exports = async function (options) {
  // {mode = "development", glob = "./**/.richmediarc*", choices = null, stats = null, outputDir = "./build", configOverride = {}}
  let {mode, glob, choices, stats, outputDir} = options;
  console.log(`${chalk.blue("i")} Searching for configs`);

  const spinner = new Spinner("processing.. %s");
  spinner.setSpinnerString("/-\\|");
  spinner.start();

  let configs = await findRichmediaRC(glob, ["settings.entry.js", "settings.entry.html"]);

  spinner.stop(true);

  if (configs.length === 0) {
    throw new Error("could not find a compatible .richmediarc with entry points configured");
  }

  /* only return configs that don't have uniqueHash (uniqueHash means it's a temporary config from googlesheets)
  this is to prevent additional configs being parsed, for example if you run build while running dev in another terminal */
  configs = configs.filter((config) => {
    return !config.data.uniqueHash;
  });

  console.log(`${chalk.green("✔")} Found ${configs.length} config(s)`);
  console.log(`${chalk.green("✔")} Taking a look if it has Spreadsheets`);

  // parse placeholders in content source so it works with spreadsheets
  configs.forEach((config) => {
    if (config.data.settings.contentSource) {
      config.data.settings.contentSource = parsePlaceholdersInObject(config.data.settings.contentSource, config.data);
    }
  });

  console.log('Config before spreadsheet')
  console.log(configs[0].data.content.images)

  configs = await expandWithSpreadsheetData(configs, mode);

  // parse placeholders for everything
  configs.forEach((config) => {
    if (config.data) {
      config.data = parsePlaceholdersInObject(config.data, config.data);
    }
  });

  console.log('Config after spreadsheet')
  console.log(configs[0].data.content.images)

  const questions = [];

  if (!choices) {
    let answers = {
      location: "all",
    };

    if (mode === "production") {
      const filesBuild = await globPromise(`${outputDir}/**/*`);
      if (filesBuild.length > 0) {
        questions.push({
          type: "confirm",
          name: "emptyBuildDir",
          message: `Empty build dir? ${chalk.red(`( ${filesBuild.length} files in ${path.resolve(outputDir)})`)}`,
        });
      }
    }

    if (configs.length === 1) {
      console.log(`  Choosing ${configs[0].location}`);
      answers.location = configs[0].location;
    } else {
      questions.push({
        type: "checkbox",
        name: "location",
        message: "Please select config(s) build:",
        choices: [
          {name: "all", checked: false},
          ...configs.map((config) => {
            let name = config.location;

            return {
              name,
              checked: false,
            };
          }),
        ],
        validate(answer) {
          if (answer.length < 1) {
            return `${chalk.red("✖ You must choose at least one.")} `;
          }
          return true;
        },
      });
    }

    if (mode === "development") {
      questions.push({
        type: "confirm",
        name: "openLocation",
        message: "Do you want a browser to open to your dev location?",
        default: true,
      });
    }

    answers = {
      ...answers,
      ...(await inquirer.prompt(questions)),
    };

    await saveChoicesInPackageJson(mode === "development" ? "dev" : "build", {
      glob,
      choices: answers,
      stats,
    });

    choices = answers;
  }

  if (choices.emptyBuildDir) {
    await fs.emptyDir(outputDir);
  }

  //create list of configs based on choices
  let configsResult;
  if (choices.location.indexOf("all") > -1) {
    configsResult = configs;
  } else {
    configsResult = configs.filter(({location}) => {
      return choices.location.indexOf(location) > -1;
    });
  }

  //if the richmediarc location doesn't actually exist, assume its a config derived from google spreadsheets, so we write one to disk
  configsResult.forEach((config) => {
    let writeConfig = false;
    if (!fs.existsSync(config.location)) {
      writeConfig = true;
    } else {
      try {
        const configData = fs.readJsonSync(config.location);
        if (configData.uniqueHash) {
          // this means it's a file marked for deletion (but somehow stayed behind)
          writeConfig = true;
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (writeConfig) {
      const data = Buffer.from(JSON.stringify(config.data));
      fs.writeFileSync(config.location, data);
    }
  });


  console.log(configsResult[0].data.content.images.backgrounds)


  fs.writeFileSync('/tmp/ad.json', JSON.stringify(configsResult[0].data, null, 2));

  // deal with external images in configs
  await Promise.all(configsResult.map(config => {
    return new Promise(async resolve => {
      config.data = await convertExternalImageUrlsToLocalPaths(config.data);
      resolve();
    })
  }))

  console.log(configsResult[0].data.content.images.backgrounds)

  let result = await createConfigByRichmediarcList(configsResult, {
    mode,
    stats: false,
    outputDir,
  });

  result = result.map((webpack, index) => {
    return {
      webpack,
      settings: configsResult[index],
    };
  });

  return {
    result, choices
  }
};
