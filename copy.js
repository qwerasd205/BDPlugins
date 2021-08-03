'use strict';

const path = require('path');
const fs = require('fs');

console.log('\nCOPY\n');

const overwrite = process.env.npm_config_overwrite;

const target = process.env.npm_config_target;
if (!target) err('Usage: npm run copy --target="PluginName"');

const dir = path.resolve('.', target);
if (!fs.existsSync(dir)) err(`Unknown plugin: ${target} (Can't find ${dir})`);
console.log(`Found dir: ${dir} ...`);

const plugin = path.resolve(dir, `${target}.plugin.js`);
if (!fs.existsSync(plugin)) err(`Couldn't find plugin file (you may need to \`npm run build\` it)`);
console.log(`Found plugin file: ${plugin}...`);

const dataFolder
    = process.env.APPDATA
    || (
        process.platform === 'darwin'
        ? path.join(process.env.HOME, 'Library', 'Application Support')
        : process.env.XDG_CONFIG_HOME
            ? process.env.XDG_CONFIG_HOME
            : path.join(process.env.HOME, ".config")
    );
const pluginsFolder = path.join(dataFolder, 'BetterDiscord', 'plugins');
if (!fs.existsSync(pluginsFolder)) err(`Couldn't find plugins folder (${pluginsFolder})`);

const destination = path.join(pluginsFolder, `${target}.plugin.js`);
if (!overwrite && fs.existsSync(destination))
    err(`${destination} already exists! Run again with --overwrite to copy anyway`);

console.log(`Copying ${plugin} to ${destination} ...`);
fs.copyFileSync(
    plugin,
    destination
);

console.log('Done!');

function err (message) {
    console.error(message);
    process.exit(1);
}