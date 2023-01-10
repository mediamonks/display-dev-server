const chalk = require("chalk");
const fs = require("fs-extra");
const globPromise = require("glob-promise");
const Spinner = require("cli-spinner").Spinner;
const inquirer = require("inquirer");
const path = require("path");

const createConfigByRichmediarcList = require("./webpack/config/createConfigByRichmediarcList");
const saveChoicesInPackageJson = require("./util/saveChoicesInPackageJson");
const findRichmediaRC = require("./util/findRichmediaRC");
const parsePlaceholdersInObject = require("./util/parsePlaceholdersInObject");
const expandWithSpreadsheetData = require("./util/expandWithSpreadsheetData");
const devServer = require("./webpack/devServer");
const buildFiles = require("./webpack/buildFiles");
const deepmerge = require("deepmerge");

module.exports = async function ({ mode = "development", glob = "./**/.richmediarc*", choices = null, stats = null, buildTarget = "./build", configOverride = {} }) {
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
    // check if there is a config override for the feed (from options)
    if (configOverride.settings?.contentSource) {
      console.log("Found a contentSource override!!");
      config.data.settings.contentSource = {
        url: configOverride.settings.contentSource.url,
      };
    }

    if (config.data.settings.contentSource) {
      config.data.settings.contentSource = parsePlaceholdersInObject(config.data.settings.contentSource, config.data);
    }
  });

  configs = await expandWithSpreadsheetData(configs, mode);

  // parse placeholders for everything
  configs.forEach((config) => {
    if (config.data) {
      config.data = parsePlaceholdersInObject(config.data, config.data);
    }
  });

  if (configOverride.settings) {
    console.log(`config override settings found`);
    configs.forEach((config) => {
      config.data.settings = deepmerge(config.data.settings, configOverride.settings);
    });
  }

  const questions = [];

  if (!choices) {
    let answers = {
      location: "all",
    };

    if (mode === "production") {
      const filesBuild = await globPromise(`${buildTarget}/**/*`);
      if (filesBuild.length > 0) {
        questions.push({
          type: "confirm",
          name: "emptyBuildDir",
          message: `Empty build dir? ${chalk.red(`( ${filesBuild.length} files in ${path.resolve(buildTarget)})`)}`,
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
          { name: "all", checked: false },
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
    await fs.emptyDir(buildTarget);
  }

  //create list of configs based on choices
  let configsResult;
  if (choices.location.indexOf("all") > -1) {
    configsResult = configs;
  } else {
    configsResult = configs.filter(({ location }) => {
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

  let result = await createConfigByRichmediarcList(configsResult, {
    mode,
    stats: false,
    buildTarget,
  });

  result = result.map((webpack, index) => {
    return {
      webpack,
      settings: configsResult[index],
    };
  });

  if (mode === "development") {
    await devServer(result, choices.openLocation);
  } else {
    return await buildFiles(result, buildTarget);
  }
};
