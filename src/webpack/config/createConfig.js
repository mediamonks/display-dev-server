const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
// const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const VirtualModulesPlugin = require('webpack-virtual-modules');
const HtmlWebpackInlineSVGPlugin = require('../plugin/HtmlWebpackInlineSVGPlugin');
const GenerateJsonPlugin = require('generate-json-webpack-plugin');

// const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const sanitizeFilename = require('sanitize-filename');
// var WriteJsonPlugin = require('write-json-webpack-plugin');

const DevEnum = require('../../data/DevEnum');
const isFile = require('../../util/isFile');
const isExternalURL = require('../../util/isExternalURL');
const getRichmediaRCSync = require('../../util/getRichmediaRCSync');
const parsePlaceholders = require('../../util/parsePlaceholders');
const flattenObjectToCSSVars = require('../../util/flattenObjectToCSSVars');
// const resolveRichmediaRCPathsToWebpackPaths = require('../../util/resolveRichmediaRCPathsToWebpackPaths');
const getOptimisationsFromConfig = require('../../util/options/getOptimisationsFromConfig');
const addConfigsAsWebpackDependencies = require('../../util/addConfigsAsWebpackDependencies');
// const RichmediaRCPlugin = require('../plugin/RichmediaRCPlugin');


const nodeModules = `${path.resolve(__dirname, '../../../node_modules')}/`;

/**
 *
 * @param {object} data
 * @param {object} data.richmediarc
 * @param {string} data.richmediarcFilepath
 * @param {string} data.outputPath
 * @param {object} data.options
 * @param {string} data.options.mode
 * @param {boolean} data.options.stats
 * @return {{mode: string, entry: *[], output: {path: *, filename: string}, externals: {TweenLite: string, TweenMax: string, TimelineLite: string, TimelineMax: string, Enabler: string, Monet: string}, resolve: {modules: string[], alias: {vendor: string}}, resolveLoader: {modules: string[], symlinks: boolean}, module: {rules: *[]}, plugins: *[], stats: {colors: boolean}, devtool: string}}
 */
module.exports = function createConfig({
                                         richmediarc,
                                         richmediarcFilepath,
                                         outputPath,

                                         options: {mode = DevEnum.DEVELOPMENT, stats = false} = {
                                           mode: DevEnum.DEVELOPMENT,
                                           stats: false,
                                         },
                                       }) {


  let devtool = false;
  const entry = [];

  if (mode === DevEnum.PRODUCTION) {
    devtool = false;
  } else if (mode === DevEnum.DEVELOPMENT) {
    devtool = 'inline-source-map';
  }

  let namedHashing = richmediarc.settings.useOriginalFileNames ? '[name].[ext]' : "[name]_[contenthash].[ext]";

  let optimizations = getOptimisationsFromConfig(richmediarc);


  let browserCompiler = richmediarc.settings.browserSupport ? richmediarc.settings.browserSupport : ['ie 11', 'last 2 versions', 'safari >= 7'];

  // override browser support
  if (richmediarc.settings.browserCompiler) {
    browserCompiler = richmediarc.settings.browserCompiler;
  }

  // entry.push('@babel/polyfill');
  // entry.push('whatwg-fetch');
  entry.push(richmediarc.settings.entry.js);

  // check for trailing slash.
  outputPath = outputPath.replace(/\/$/, '');

  // get everything after the last slash. trailing slash is removed at the beginning of the code. ^^
  // added .html is there for compatibility with workspace.
  let bundleName = /[^/\\]*$/.exec(outputPath)[0];

  // check if there is a custom bundleName
  if (richmediarc.settings.bundleName) {
    bundleName = parsePlaceholders(richmediarc.settings.bundleName, richmediarc);
    bundleName = sanitizeFilename(bundleName);
  }

  if (path.isAbsolute(bundleName)) {
    throw new Error('bundleName in richmediarc can not be a absolute path.');
  }

  outputPath = path.join(outputPath, '../', bundleName);

  const config = {
    mode,
    entry: {
      main: entry,
    },

    target: `browserslist:${browserCompiler.toString()}`,

    output: {
      //filename: './[name].js',
      filename: richmediarc.settings.useOriginalFileNames ? '[name].js' : "[name]_[contenthash].js",
      path: outputPath,
      // library: 'someLibName',
      // libraryTarget: 'commonjs',
      iife: false
    },
    externals: {
      // gsap external
      TweenLite: 'TweenLite',
      TweenMax: 'TweenMax',
      TimelineLite: 'TimelineLite',
      TimelineMax: 'TimelineMax',

      // doubleclick and monet external
      Enabler: 'Enabler',
      Monet: 'Monet',
    },
    resolve: {
      symlinks: true,
      modules: ['node_modules', nodeModules],
    },

    resolveLoader: {
      symlinks: true,
      modules: ['node_modules', nodeModules],
    },

    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: namedHashing,
                esModule: false
              },
            },
            {
              loader: 'extract-loader',
              options: {
                publicPath: ''
              },
            },
            {
              loader: 'css-loader',
              options: {
                esModule: false
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: function(loader) {
                  addConfigsAsWebpackDependencies(richmediarcFilepath, loader);
                  const data = getRichmediaRCSync(richmediarcFilepath);
                  const cssVariables = flattenObjectToCSSVars(data);
                  Object.keys(cssVariables).forEach(function (name) {
                    const val = cssVariables[name];
                    if (isFile(val) && !isExternalURL(val)) {
                      cssVariables[name] = path.relative(
                        path.dirname(loader.resourcePath),
                        cssVariables[name],
                      );
                    }
                  });

                  const postcssOptionsObj = {
                    plugins: [
                      ["postcss-calc"],
                      ["postcss-import"],
                      [
                        "postcss-css-variables",
                        {
                          variables: cssVariables
                        },
                      ],
                      [
                        "postcss-preset-env",
                        {
                          stage: 2,
                          features: {
                            'nesting-rules': true
                          },
                          browsers: browserCompiler,
                        },
                      ],
                      ["postcss-nested"],
                    ],
                  }

                  if (optimizations.css) {
                    postcssOptionsObj.plugins.push(["cssnano"]);
                  }

                  return postcssOptionsObj;
                }
              },
            },
          ],
        },
        {
          test: /\.sketch$/,
          use: [
            {
              loader: 'sketch-loader',
            },
          ],
        },
        {
          test: /\.(mp4|svg)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: namedHashing,
                esModule: false
              },
            },
          ],
        },
        {
          test: /\.(jpe?g|png|gif)$/i,
          use: function() {
            const imageLoadersArray = [
              {
                loader: 'file-loader',
                options: {
                  name: namedHashing,
                  esModule: false
                },
              },
            ]

            if (optimizations.image) {
              imageLoadersArray.push({
                loader: ImageMinimizerPlugin.loader,
                options: {
                  minimizer: {
                    implementation: ImageMinimizerPlugin.imageminMinify,
                    options: {
                      plugins: [
                        "imagemin-gifsicle",
                        "imagemin-mozjpeg",
                        "imagemin-pngquant"
                      ],
                    },
                  },
                },
              })
            }

            return imageLoadersArray;
          }
        },

        {
          test: /\.js$/,
          // adding exception to libraries coming from @mediamonks namespace.
          exclude: /(?!(node_modules\/@mediamonks)|(node_modules\\@mediamonks))node_modules/,
          use: function () {
              return [
                {
                  loader: 'babel-loader',
                  options: {
                    presets: [
                      [
                        require.resolve('@babel/preset-env'),
                        {
                          useBuiltIns: 'usage',
                          corejs: 3,
                          targets: {
                            browsers: browserCompiler,
                          },
                        },
                      ],
                    ],
                    plugins: [
                      require.resolve(`@babel/plugin-proposal-class-properties`),
                      require.resolve(`@babel/plugin-syntax-dynamic-import`),
                      require.resolve(`@babel/plugin-transform-async-to-generator`),
                      // require.resolve(`@babel/plugin-transform-arrow-functions`),
                      // require.resolve(`@babel/plugin-transform-spread`),
                      [
                        require.resolve(`@babel/plugin-proposal-decorators`), {decoratorsBeforeExport: true}
                      ],
                    ],
                  },
                },
                {
                  loader: path.resolve(path.join(__dirname, '../loader/CustomJSLoader.js')),
                  options: {
                    config: richmediarc,
                    configFilepath: richmediarcFilepath,
                  },
                },
              ];
            }


        },
        {
          test: /richmediaconfig/,
          use: {
            loader: path.resolve(path.join(__dirname, '../loader/RichmediaRCLoader.js')),
            options: {
              configFilepath: richmediarcFilepath,
              config: richmediarc,
            },
          },
        },
        // {
        //   test: /.richmediarc$/,
        //   exclude: /node_modules/,
        //   type: 'javascript/dynamic',
        //   use: {
        //     loader: path.resolve(path.join(__dirname, '../loader/RichmediaRCLoader.js')),
        //     options: {},
        //   },
        // },
        {
          test: /\.(eot)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: namedHashing,
              },
            },
          ],
        },
        {
          test: /\.(ttf|woff|woff2)$/,
          use: [
            richmediarc.settings.fontsBase64 ? {
              loader: 'url-loader'
              } : {
              loader: 'file-loader',
                options: {
                  // name: `[name]${namedHashing}.[ext]`,
                  name: namedHashing,
                }
            },
            {
              loader: path.resolve(path.join(__dirname, '../loader/RichmediaFontLoader.js')),
              options: {
                configFilepath: richmediarcFilepath,
                config: richmediarc,
              },
            },
          ],
        },
        {
          test: /\.(hbs)$/,
          use: [
            {
              loader: path.resolve(path.join(__dirname, '../loader/FromHandlebarsToRawLoader.js')),
              options: {
                configLoaderName: "richmediaconfig"
              }
            },
            // {loader: 'handlebars-loader'},
            {
              loader: 'handlebars-loader',
              options: {
                helperDirs: path.join(__dirname, '../../util/handlebars/helpers'),
              }
            },
            {
              loader: 'extract-loader',
              options: {
                publicPath: '',
              }
            },
            {
              loader: 'html-loader',
              options: {
                minimize: optimizations.html,
                esModule: false,

                // attrs: [':src', ':href', 'netflix-video:source', ':data-src', ':data'],
              },
            }
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: richmediarc.settings.entry.html,
        minify: optimizations.html,
        filename: './index.html',
      }),
      new HtmlWebpackInlineSVGPlugin({
        runPreEmit: true
      }),
      new webpack.DefinePlugin({
        DEVELOPMENT: JSON.stringify(mode === DevEnum.DEVELOPMENT),
        PRODUCTION: JSON.stringify(mode === DevEnum.PRODUCTION),
      }),

      new VirtualModulesPlugin({
        'node_modules/richmediaconfig': `module.exports = "DUDE"`,
      }),



      // new CircularDependencyPlugin({
      //   // exclude detection of files based on a RegExp
      //   exclude: /node_modules/,
      //   // add errors to webpack instead of warnings
      //   failOnError: true,
      //   // set the current working directory for displaying module paths
      //   cwd: process.cwd(),
      // }),
      //
      // new Visualizer({
      //   filename: './statistics.html',
      // }),
    ],
    stats: {
      colors: true,
    },
    devtool,
  };

  /**
   * When there is a static folder use it in webpack config
   */
  const staticPath = path.resolve(path.dirname(richmediarcFilepath), './static');

  if (fs.existsSync(staticPath)) {
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [{from: staticPath, to: ''}],
      }),
    );
  }

  if (richmediarc.settings.type === "adform") {
    let clickTags = richmediarc.settings.clickTags || {"clickTAG": "http://www.adform.com"}
    let obj = {
      "version": "1.0",
      "title": richmediarc.settings.bundleName || bundleName,
      "description": "",
      "width" : richmediarc.settings.size.width,
      "height": richmediarc.settings.size.height,
      "events": {
        "enabled": 1,
        "list": { }
      },
      "clicktags": {
        ...clickTags
      },
      "source": "index.html"
    }

    config.plugins.push(
      new GenerateJsonPlugin('manifest.json', obj),
    )
  }

  // if (stats === true) {
  //   config.plugins.push(new BundleAnalyzerPlugin());
  // }

  config.optimization = {
    minimize: true,
    minimizer: []
  };


  if (optimizations.js) {
    config.optimization.splitChunks = {
      chunks: 'async',
    };

    config.optimization.minimizer.push(new TerserPlugin());

  } else {
    // standard implementation, no minifying, but removing comments
    config.optimization.minimizer.push(new TerserPlugin({
      terserOptions: {
        compress: false,
        mangle: false,
        module: true,
        format: {
          comments: false,
          beautify: true,
          indent_level: 2
        },
      },
      extractComments: false,
    }),);
  }


  if (mode === DevEnum.DEVELOPMENT) {
    config.watch = true;
    // config.plugins.push(new webpack.HotModuleReplacementPlugin());
  }

  if (mode === DevEnum.PRODUCTION) {
    config.plugins.push(
      new ZipPlugin({
        path: path.join(outputPath, '../'),
        filename: `./${bundleName}`,

        fileOptions: {
          mtime: new Date(),
          mode: 0o100664,
          compress: true,
          forceZip64Format: false,
        },

        zipOptions: {
          forceZip64Format: false,
        },
      }),
    );
  }

  // config.plugins.push(
  //   new SimpleProgressWebpackPlugin({
  //     format: 'compact',
  //   }),
  // );

  // throw new Error('STOP hammer time')

  return config;
};
