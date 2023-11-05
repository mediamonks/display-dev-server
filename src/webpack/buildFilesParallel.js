const path = require("path");
const removeTempRichmediaRc = require("../util/removeTempRichmediaRc");

const cliProgress = require("cli-progress");

const workerFarm = require('worker-farm');

module.exports = async function buildFiles(result, options) {
  const webpackRun = workerFarm(
    {
      autoStart: true,
      maxRetries: 0,
      maxConcurrentCallsPerWorker: 1,
      maxConcurrentWorkers: options.parallel === true ? 4 : options.parallel
    },
    require.resolve('./webpackRun')
  );
  
  const startTime = new Date().getTime();
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(result.length, 0);

  const qualities = await Promise.all(result.map((result) => {
    delete result.settings.row
    return new Promise(res => webpackRun({ config: result.settings, options }, (quality) => {
      progressBar.increment()
      res(quality)
    }));
  }));

  workerFarm.end(webpackRun)

  progressBar.stop();
  console.log(`built in ${new Date().getTime() - startTime}ms`);

  // final clean up
  console.log("Removing temp .richmediarc...");
  await removeTempRichmediaRc(result);

  return {
    outputDir: path.resolve(options.outputDir),
    ads: qualities,
  };
};
