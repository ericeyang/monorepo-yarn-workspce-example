import path from 'path';
import minimist from 'minimist';

import { getPackages } from '@lerna/project';
import filterPackages from '@lerna/filter-packages';
import batchPackages from '@lerna/batch-packages';

import babel from 'rollup-plugin-babel';

/**
 * Get a list of the non-private sorted packages with Lerna v3
 * @see https://github.com/lerna/lerna/issues/1848
 * @param {string}[scope] - packages to only build (if you don't
 *    want to build everything)
 * @param {string}[ignore] - packages to not build
 * @return {Promise<Package[]>} List of packages
 */
async function getSortedPackages(scope, ignore) {
  const packages = await getPackages(__dirname);
  const filtered = filterPackages(packages, scope, ignore, false);

  return batchPackages(filtered).reduce((arr, batch) => arr.concat(batch), []);
}

const plugins = [
  babel({
    exclude: 'node_modules/**',
    presets: ['@babel/preset-env'],
    plugins: ['@babel/plugin-proposal-class-properties'],
  }),
];

async function main() {
  const config = [];

  // Support --scope and --ignore globs if passed in via commandline
  const { scope, ignore } = minimist(process.argv.slice(2));
  const packages = await getSortedPackages(scope, ignore);
  packages.forEach((pkg) => {
    /* Absolute path to package directory */
    const basePath = path.relative(__dirname, pkg.location);
    /* "main" field from package.json file. */
    const { main, input } = pkg.toJSON();
    /* Push build config for this package. */
    config.push({
      input: path.join(basePath, input || 'src/index.js'),
      output: [
        {
          file: path.join(basePath, main || 'dist/index.js'),
          format: 'cjs',
          sourcemap: true,
        } /* Add any other configs (for esm or iife format?) */,
      ],
      watch: {
        include: path.join(basePath, 'src/**'),
      },
      plugins
    });
  });
  return config;
}

export default main();
