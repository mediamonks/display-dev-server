const loaderUtils = require('loader-utils');
const isExternalURL = require('../../util/isExternalURL');
const getRichmediaRC = require('../../util/getRichmediaRC');
const leafs = require('../../util/leafs');
const isFile = require('../../util/isFile');
const path = require('path');
const fs = require('fs-extra');

/**
 * Allows you to import external files into a json value.
 * Can be used for any value, in an object or array.
 */
module.exports = function RichmediaRCLoader(data) {
  const callback = this.async();
  const options = loaderUtils.getOptions(this);
  const loaderContext = this;

  const { configFilepath, config } = options;

  function addConfigsAsDependencies(filePath) {
    loaderContext.addDependency(filePath);

    try {
      const rawConfigJson = fs.readJSONSync(filePath);

      if (rawConfigJson.parent) {
        const newPath = path.resolve(path.dirname(filePath), rawConfigJson.parent);
        addConfigsAsDependencies(newPath);
      }

    } catch (e) {

    }
  }

  addConfigsAsDependencies(configFilepath); //recursively add richmediarc and sharedrc files as dependencies for webpack

  let prom = Promise.resolve(config);

  prom = prom.then(() => {
    return getRichmediaRC(configFilepath);
  });

  prom.then(data => {
    data = typeof data === 'string' ? JSON.parse(data) : data;
    data = JSON.parse(JSON.stringify(data));

    let ruuid = Date.now();
    const replaceItems = [];

    if (data && data.content) {
      leafs(data.content, (value, obj, name) => {
        if (isFile(value) && !isExternalURL(value)) {
          const id = `uuid_replace_${ruuid.toString(16)}`;

          replaceItems.push({
            key: loaderUtils.stringifyRequest(loaderContext, id),
            value: `require(${loaderUtils.stringifyRequest(loaderContext, `${value}`)})`,
          });

          this.addDependency(value);

          obj[name] = id;
        }
      });
    }

    //convert the settings paths to a relative path
    if (data && data.settings) {
      leafs(data.settings, (value, obj, name) => {
        if (isFile(value) && !isExternalURL(value)) {
          obj[name] = "./" + path.basename(value)
        }
      });
    }

    data = JSON.stringify(data)
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    data = replaceItems.reduce((prev, item) => {
      prev = prev.replace(item.key, item.value);
      return prev;
    }, data);

    callback(null, `module.exports = ${data};`);
  });
};
