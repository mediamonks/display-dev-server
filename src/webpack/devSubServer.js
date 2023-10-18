const webpack = require('webpack');
const webpackHotMiddleware = require('webpack-hot-middleware');
const webpackDevMiddleware = require('webpack-dev-middleware');
const express = require('express');

const createConfigByRichmediarcList = require('./config/createConfigByRichmediarcList')

const getNameFromLocation = require('../util/getNameFromLocation');

/**
 *
 * @param {Array<{settings: {location, data}}>} configs
 * @param {{}} options
 * @param {number} port
 */
module.exports = async function devSubServer({configs, options, port}, cb) {
  const webpackConfigList = await createConfigByRichmediarcList(configs, options);
  const settingsList = configs;

  const app = express();

  await Promise.all(webpackConfigList.map((config, index) => {
    const hmrPath = '__webpack_hmr';
    const name = getNameFromLocation(settingsList[index].location);

    config.mode = 'development';

    config.output = {
      ...config.output,
      hotUpdateChunkFilename: '.hot/.hot-update.js',
      hotUpdateMainFilename: '.hot/.hot-update.json',
    };

    return new Promise(res => {
      const compiler = webpack(config, res);

      app.use(
        webpackDevMiddleware(compiler, {
          publicPath: `/${name}/`,
        }),
      );

      app.use(
        webpackHotMiddleware(compiler, {
          path: `/${name}/${hmrPath}`,
        }),
      );
    })
  }));

  app.listen(port, () => {});
  cb();
};
