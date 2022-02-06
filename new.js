'use strict';

const path = require('path');
const fs = require('fs');

const target = process.env.npm_config_target;
if (!target) err('Usage: npm run new --target="PluginName" [--type="js|ts|jsx|tsx" "Description"]');
console.log(`Creating plugin '${target}'...`);

const dir = path.resolve('.', target);
if (fs.existsSync(dir)) err(`Plugin directory already exists: ${dir}`);

console.log(`Creating dir: ${dir} ...`);
fs.mkdirSync(dir);

const src = path.resolve(dir, 'src');
fs.mkdirSync(src);

const type = process.env.npm_config_type ?? 'tsx';
if (!['js', 'ts', 'jsx', 'tsx'].includes(type)) err(`Unknown source type: ${type}`);
const src_file = path.resolve(src, `${target}.plugin.${type}`);
console.log(`Creating src file: ${src_file} ...`);
const description = process.argv[2] ?? 'Description';
fs.writeFileSync(src_file, generate_src(type));

console.log(`Creating README.md ...`);
fs.writeFileSync(path.resolve(dir, 'README.md'), generate_readme());

console.log('Done!');

function err (message) {
    console.error(message);
    process.exit(1);
}

function generate_src (type) {
    let type_template = path.resolve(__dirname, `./templates/template.${type}`);
    if (!fs.existsSync(type_template)) type_template = path.resolve(__dirname, `./templates/template.js`);
    const template = fs.readFileSync(type_template, 'utf8');
    return template.replace(/\$NAME\$/g, target).replace(/\$DESC\$/g, description);
}

function generate_readme () {
    return (
`# ${target}

### ${description}
`);
}