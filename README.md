# Richmedia Temple Server [![Travis](https://img.shields.io/travis/mediamonks/richmedia-temple-server.svg)](https://travis-ci.org/mediamonks/richmedia-temple-server) [![npm](https://img.shields.io/npm/v/@mediamonks/richmedia-temple-server.svg?maxAge=2592000)](https://www.npmjs.com/package/@mediamonks/richmedia-temple-server) [![npm](https://img.shields.io/npm/dm/@mediamonks/richmedia-temple-server.svg?maxAge=2592000)](https://www.npmjs.com/package/@mediamonks/richmedia-temple-server)
Richmedia Temple Server is used as a tool to build and develop richmedia units.
See documentation https://assets-at-scale.gitbook.io/temple-suite/


<!-- [![Code Climate](https://img.shields.io/codeclimate/github/mediamonks/seng-boilerplate.svg?maxAge=2592000)](https://codeclimate.com/github/mediamonks/seng-boilerplate) -->
<!-- [![Coveralls](https://img.shields.io/coveralls/mediamonks/seng-boilerplate.svg?maxAge=2592000)](https://coveralls.io/github/mediamonks/seng-boilerplate?branch=master) -->

## Installation

```sh
yarn add @mediamonks/richmedia-temple-server
```

```sh
npm i -S @mediamonks/richmedia-temple-server
```

## Basic Usage

```js
// for building
node ./node_modules/@mediamonks/richmedia-temple-server/build.js

// for developing
node ./node_modules/@mediamonks/richmedia-temple-server/dev.js

// for client preview
node ./node_modules/@mediamonks/richmedia-temple-server/preview.js
```


maybe use [@mediamonks/generator-richmedia-temple](https://github.com/mediamonks/generator-richmedia-temple) for creating your setup automatically.

## Documentation

View the [documentation](http://mediamonks.github.io/richmedia-temple-server/).

## Contribute

View [CONTRIBUTING.md](./CONTRIBUTING.md)


## Changelog

View [CHANGELOG.md](./CHANGELOG.md)


## Authors

View [AUTHORS.md](./AUTHORS.md)


## LICENSE

[MIT](./LICENSE) © MediaMonks


## About this boilerplate

**Remove this section when cloning this boilerplate to a real project!**

### Folders

This boilerplate contains the following folders:
* **/coverage** - Contains the generated test code coverage, is sent to Code
Climate and Coveral.io.
* **/docs** - Contains the generated documentation by typedoc.
* **/lib** - Contains the built code from `src/lib`, will be published to npm.
* **/node_modules** - Contains the node modules generated by running `yarn`.
* **/src** - Contains the source code.
* **/test** - Contains the tests.
* **/vendor** - Can contain 3rd party code used in this project, when not
available on npm.

### Files

This boilerplate contains the following files:
* **.babelrc** - Contains babel configuration.
* **.codeclimate.yml** - The Code Climate configuration for this project.
* **.editorconfig** - Defines general formatting rules.
* **.eslintignore** - Lists patterns that should be ignored when running eslint.
* **.eslintrc.js** - Contains eslint configuration.
* **.gitignore** - These files should not end up in git.
* **.npmignore** - These files should not end up in npm.
* **.nvmrc** - Contains nodejs version to build this project with.
* **.nycrc** - Contains nyc code coverage configuration.
* **.prettierignore** - Lists patterns that should be ignored when running prettier.
* **.prettierrc** - Contains prettier formatting configuration.
* **.travis.yml** - Configuration for Travis CI.
* **AUTHORS.md** - Contains a list of all the authors that worked on this module.
* **CONTRIBUTING.md** - Contains information on how to contribute on this project.
* **index.d.ts** - The built Typescript definitions, referenced in the package.json.
Will be published to npm.
* **index.d.ts** - The built Typescript index, referenced in the package.json.
Will be published to npm.
* **LICENSE** - Our license file.
* **package.json** - To list the npm package information, all the dependencies,
and contains all the scripts that can be run.
* **README.MD** - This file, remove the about section when cloning this boilerplate.
* **tsconfig.build.json** - The TypeScript configuration file for building definitions.
* **tsconfig.json** - The TypeScript configuration file for this project.
* **tslint.json** - The linting rules for our TypeScript code.
* **yarn.lock** - Yarn lockfile to freeze module versions.

### Travis

This project uses [Travis](https://travis-ci.org) to build, test and
publish its code to npm. Travis is free for public Github repositories.

It runs on all commits, shows the build status for pull requests, and
publishes to npm when a new tag/release is created.

Travis only runs the `npm test` script, so have configured that script
to run everything we want Travis to check. Besides the unit tests, we
also run our validations and linters.

The travis configuration is placed in a `.travis.yml` file, consisting
of multiple sections.

1.  Defines the `node_js` [language](https://docs.travis-ci.com/user/languages/javascript-with-nodejs),
    and tells travis on which node versions to run the process.
2.  Before running, it needs to install some global dependencies, and
    when it processes some coverage results.
3.  It can do a [npm deploy](https://docs.travis-ci.com/user/deployment/npm),
    telling it to keep the generated artifacts and only publish when run
    on node 8 and when a tag was committed. It also contains the email
    address and api key of the npm user.
4.  Code Climate has a [travis plugin](https://docs.travis-ci.com/user/code-climate/)
    that automatically uploads the code coverage results.

Because we want to keep the npm api key secret, we add the token to the Travis Repo settings
where it will be stored secure:
https://docs.travis-ci.com/user/environment-variables/#Defining-Variables-in-Repository-Settings

Before we can do this, we must make sure that the repository is added
to Travis, because Travis needs the repository owner/name info to make
sure the encrypted values only work for that repository.

1.  Then make sure you are logged in to your npm account with the
    [adduser](https://docs.npmjs.com/cli/adduser) command:

    ```sh
    $ npm adduser
    ```

    To verify that you are logged in correctly you can check:

    ```sh
    $ npm whoami
    ```

3.  Now we need to [create a new token](https://docs.npmjs.com/getting-started/working_with_tokens):

    ```sh
    npm token create
    ```

    Copy the token value from the output to the Travis Environment Variable settings, and
    add it with the name `NPM_TOKEN`.
