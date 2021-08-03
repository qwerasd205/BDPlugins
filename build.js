'use strict';

const ts = require('typescript');
const path = require('path');
const fs = require('fs');

console.log('\nBUILD\n');

const target = process.env.npm_config_target;
if (!target) err('Usage: npm run build --target="PluginName"');
console.log(`Building plugin '${target}'...`);

const dir = path.resolve('.', target);
if (!fs.existsSync(dir)) err(`Unknown plugin: ${target} (Can't find ${dir})`);
console.log(`Found dir: ${dir} ...`);

const src = path.resolve(dir, 'src');
if (!fs.existsSync(src)) err(`Missing src folder`);
console.log(`Found src: ${src} ...`);

const src_file_name = fs.readdirSync(src).find(f => f.startsWith(`${target}.plugin.`));
if (!src_file_name) err(`Missing '.plugin' file in src folder (${src})`);
console.log(`Found .plugin file: ${src_file_name} ...`);

const type = src_file_name.split('.').slice(-1)[0];
if (!['js', 'ts', 'jsx', 'tsx'].includes(type)) err(`Unknown source type: ${type} (${src_file_name})`);
console.log(`Compiling ${src_file_name} as ${type}...`);

const src_file = path.resolve(
    src,
    src_file_name
);

compile(
    [
        src_file
    ],
    {
        target           : ts.ScriptTarget.ES2018,
        module           : ts.ModuleKind.ESNext,
        moduleResolution : ts.ModuleResolutionKind.NodeJs,
        declaration      : false,
        strict           : false,
        removeComments   : false,
        outDir           : dir,
        jsx              : type.endsWith('x') ? ts.JsxEmit.React : ts.JsxEmit.None,
        jsxFactory       : 'BdApi.React.createElement',
        typeRoots        : [
            './node_modules/@types',
            './typings'
        ]
    }
)

function err (message) {
    console.error(message);
    process.exit(1);
}

// Copied from -> https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
/**
 * @param {string[]} fileNames
 * @param {ts.CompilerOptions} options
 */
function compile (fileNames, options) {
    let program = ts.createProgram(fileNames, options);
    let emitResult = program.emit();

    let allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
    });

    let exitCode = emitResult.emitSkipped ? 1 : 0;
    console.log(`${!exitCode ? 'Success!' : 'Compile failed!'} Process exiting with code '${exitCode}'.`);
    process.exit(exitCode);
}