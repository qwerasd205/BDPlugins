'use strict';

const esbuild = require('esbuild');
const { sassPlugin } = require('esbuild-sass-plugin');
const beautify = require('js-beautify').js;

const acorn = require('acorn');
const walk = require('acorn-walk');
const astring = require('astring');

const path = require('path');
const fs = require('fs');

console.log('\nBUILD\n');

function err (message) {
    console.error(message);
    process.exit(1);
}

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

const transformComments = (source, mark = true) => {
    let quoted = false;
    let comment = 0; // ENUM { 0 = NONE, 1 = LINE, 2 = MULTILINE }
    
    let i = 0;
    const insert = (s, d = 0) => {
        source = source.slice(0, i) + s + source.slice(i + d);
        i += s.length;
    }
    const onCommentStart = () => {
        if (mark) {
            i++;
            insert('!');
        } else {
            i++;
            if (source.charAt(i) === '!') {
                insert('', 1); // drop !
            }
        }
    }
    const insertBefore = (target, val) => {
        if (source.slice(i, i+target.length) === target) {
            insert(val);
            i += target.length;
        }
    }
    const skip = (target) => {
        if (source.slice(i, i+target.length) === target) {
            i += target.length;
        }
    }
    const isECMAScriptIdentifierChar = (c) => {
        return /[\p{ID_Continue}]/u.test(c);
    }
    for (; i < source.length; i++) {
        switch (comment) {
            case 0: // NOT IN COMMENT
                if (!quoted) {
                    if (mark) {
                        skip('/*@__PURE__*/');
                        skip('/*#__PURE__*/');
                        skip('/* @__PURE__ */');
                        skip('/* #__PURE__ */');
                    }
                    switch (source.charAt(i)) {
                        case '`':
                        case '"':
                        case "'":
                            quoted = source.charAt(i);
                            continue;
                        case '/':
                            switch (source.charAt(i+1)) {
                                case '/': // '//'
                                    i++; // skip second '/'
                                    comment = 1; // this is a line comment
                                    onCommentStart();
                                    continue;
                                case '*': // '/*'
                                    i++; // skip '*'
                                    comment = 2; // this is a multiline comment
                                    onCommentStart();
                                    continue;
                            }
                            continue;
                    }
                    if (mark && !isECMAScriptIdentifierChar(source.charAt(i - 1))) {
                        insertBefore('let', '/*!@let*/');
                        insertBefore('const', '/*!@const*/');
                        insertBefore('export let', '/*!@let*/');
                        insertBefore('export const', '/*!@const*/');
                    }
                } else { // quoted
                    switch (source.charAt(i)) {
                        case '\\':
                            i++; // skip the next char, it's escaped.
                            continue;
                        case quoted: // closing quote
                            quoted = false;
                            continue;
                    }
                }
                break;
            case 1: // LINE COMMENT
                if (i+1 === source.length || source.charAt(i+1) === '\n')
                    comment = 0;
                break;
            case 2: // MULTILINE COMMENT
                if (source.charAt(i) === '/' && source.charAt(i-1) === '*')
                    comment = 0;
                break;
        }
    }

    return source;
};

/**
 * @type esbuild.Plugin
 */
const specialProcessing = {
    name: 'specialProcessing',
    setup (build) {
        const fs = require('fs');

        if (build.initialOptions.write) {
            throw 'Must be run without write option enabled -- plugin will handle writing itself.';
        }

        build.onLoad({ filter: /\.[jt]sx?$/ }, async (args) => {
            let text = await fs.promises.readFile(args.path, 'utf-8');

            if (!args.path.endsWith('utils/functional.ts')) {
                text = transformComments(text); // add ! to keep comments
            }

            return {
                contents: text,
                loader: args.path.split('.').pop()
            }
        });

        build.onEnd(async (result) => {
            let text = result.outputFiles[0].text;
            
            text = transformComments(result.outputFiles[0].text, false); // remove ! used to keep comments

            const comments = [];

            const AST = acorn.parse(text, {
                onComment  : comments,
                ranges     : true,
                ecmaVersion: '2021'
            });

            AST.comments = [];

            let found_meta = false;

            comments.forEach(c => {
                const n = walk.findNodeAfter(AST, c.range[0], () => true)?.node ?? AST;
                if (!n.comments) n.comments = [];
                if (n !== AST && c.type === 'Block') {
                    switch (c.value) {
                        case '@let':
                            if (!n.kind) throw `Orphaned declarator annotation D: ${c}`;
                            n.kind = 'let';
                            return;
                        case '@const':
                            if (!n.kind) throw `Orphaned declarator annotation D: ${c}`;
                            if (n.declarations.some(d => d.init == null)) {
                                console.warn('Const declarator annotation for node with no init?!\n', n.declarations.filter(d => d.init == null));
                                return;
                            }
                            n.kind = 'const';
                            return;
                    }
                }
                if (!found_meta && c.type === 'Block' && c.value.startsWith('*\n * @name')) { // hoist the META
                    AST.comments.unshift(c);
                    found_meta = true;
                    return;
                }
                n.comments.push(c);
            });

            const reindent = (state, text, indent, lineEnd) => {
                /*
                Writes into `state` the `text` string reindented with the provided `indent`.
                */
                const lines = text.split('\n')
                const end = lines.length - 1
                state.write(lines[0].trim())
                if (end > 0) {
                    state.write(lineEnd)
                    for (let i = 1; i < end; i++) {
                        state.write(indent + lines[i].trim() + lineEnd)
                    }
                    state.write(indent + lines[end].trim())
                }
            }

            const formatComments = (state, comments, indent, lineEnd) => {
                /*
                Writes into `state` the provided list of `comments`, with the given `indent` and `lineEnd` strings.
                Line comments will end with `"\n"` regardless of the value of `lineEnd`.
                Expects to start on a new unindented line.
                */
                const { length } = comments
                for (let i = 0; i < length; i++) {
                    const comment = comments[i];
                    if (comment.type[0] === 'L') {
                        // Line comment
                        state.write(indent);
                        state.write('// ' + comment.value.trim() + '\n', comment);
                    } else {
                        // Block comment
                        state.write('/*');
                        reindent(state, comment.value, indent, lineEnd);
                        state.write('*/' + lineEnd);
                    }
                }
            }

            const formatSequence = (state, nodes) => {
                /*
                Writes into `state` a sequence of `nodes`.
                */
                state.write('(');
                const multi_line = nodes.length > 5;
                let p;
                if (nodes.length > 0) {
                    const  elements  = nodes,
                            { length } = elements;
                    if (multi_line) {
                        state.write(state.lineEnd);
                        state.write(state.indent.repeat(++state.indentLevel));
                        p = state.output.length;
                    }
                    for (let i = 0; ;) {
                        const element = elements[i];
                        if (element != null) {
                            state.generator[element.type](element, state);
                        }
                        if (++i < length) {
                            state.write(', ');
                            if (state.output.length - p >= 24) {
                                state.write(state.lineEnd);
                                state.write(state.indent.repeat(state.indentLevel));
                                p = state.output.length;
                            }
                        } else {
                            if (element == null) {
                                state.write(', ');
                            }
                            break;
                        }
                    }
                }
                if (multi_line) {
                    state.write(state.lineEnd);
                    state.write(state.indent.repeat(--state.indentLevel));
                }
                state.write(')');
            };

            const generator = Object.assign({}, astring.GENERATOR, {
                Literal (node, state) { // prefer single quotes
                    if (typeof node.value !== 'string') return astring.GENERATOR.Literal.bind(this)(node, state);
                    const text = node.value;
                    const s = JSON.stringify(text);
                    if (text.includes("'")) {
                        state.write(s, state);
                    } else {
                        state.write("'" + s.slice(1, s.length - 1).replace(/\\"/g, '"') + "'", state);
                    }
                },
                ObjectExpression (node, state) { // objects with <= 2 non-shorthand simple keys can be one line
                    const old_indent  = state.indent;
                    const old_lineEnd = state.lineEnd;
                    if (
                        node.properties.every(p => 
                            ['Literal', 'Identifier'].includes(p.value.type)
                            || (
                                p.value.type === 'ObjectExpression'
                                && p.value.properties.length <= 3
                                && p.value.properties.every(pp => ['Literal', 'Identifier'].includes(pp.value.type))
                            )
                        ) && node.properties.filter(p => !p.shorthand).length <= 2
                    ) {
                        state.indent  = '';
                        state.lineEnd = '';
                    }
                    astring.GENERATOR.ObjectExpression.bind(this)(node, state);
                    state.indent  = old_indent;
                    state.lineEnd = old_lineEnd;
                },
                CallExpression (node, state) { // put .then and .catch stuff on new lines.
                    if (node.callee.type === 'MemberExpression') {
                        if (node.callee.property.type === 'Identifier' && ['then', 'catch'].includes(node.callee.property.name)) {
                            state._THENCATCHCALL = true;
                        }
                    }
                    const precedence = state.expressionsPrecedence[node.callee.type]
                    if (
                        precedence === 17 ||
                        precedence < state.expressionsPrecedence.CallExpression
                    ) {
                        state.write('(');
                        this[node.callee.type](node.callee, state);
                        state.write(')');
                    } else {
                        this[node.callee.type](node.callee, state);
                    }
                    if (node.optional) {
                        state.write('?.');
                    }
                    formatSequence(state, node['arguments']);
                },
                MemberExpression (node, state) { // put .then and .catch stuff on new lines.
                    if (state._THENCATCHCALL) {
                        state._THENCATCHCALL = false;
                        const indent = state.indent.repeat(state.indentLevel++);
                        const precedence = state.expressionsPrecedence[node.object.type];
                        if (
                            precedence === 17 ||
                            precedence < state.expressionsPrecedence.MemberExpression
                        ) {
                            state.write('(');
                            this[node.object.type](node.object, state);
                            state.write(')');
                        } else {
                            this[node.object.type](node.object, state);
                        }
                        state.write(state.lineEnd);
                        state.write(indent);
                        if (node.computed) {
                            if (node.optional) {
                                state.write('?.');
                            }
                            state.write('[');
                            this[node.property.type](node.property, state);
                            state.write(']');
                        } else {
                            if (node.optional) {
                                state.write('?.');
                            } else {
                                state.write('.');
                            }
                            this[node.property.type](node.property, state);
                        }
                        state.indentLevel--;
                    } else {
                        astring.GENERATOR.MemberExpression.bind(this)(node, state);
                    }
                },
                VariableDeclarator (node, state) { // add comments to declarators
                    this[node.id.type](node.id, state)
                    if (node.init != null) {
                        state.write(' = ');
                        if (node.comments) formatComments(state, node.comments, state.indent, '');
                        this[node.init.type](node.init, state)
                    }
                },
                ArrayExpression (node, state) { // format big arrays nicely
                    state.write('[');
                    const multi_line = node.elements.length > 5;
                    let p;
                    if (node.elements.length > 0) {
                        const { elements } = node,
                              { length   } = elements;
                        if (multi_line) {
                            state.write(state.lineEnd);
                            state.write(state.indent.repeat(++state.indentLevel));
                            p = state.output.length;
                        }
                        for (let i = 0; ;) {
                            const element = elements[i];
                            if (element != null) {
                                this[element.type](element, state);
                            }
                            if (++i < length) {
                                state.write(', ');
                                if (state.output.length - p >= 36) {
                                    state.write(state.lineEnd);
                                    state.write(state.indent.repeat(state.indentLevel));
                                    p = state.output.length;
                                }
                            } else {
                                if (element == null) {
                                    state.write(', ');
                                }
                                break;
                            }
                        }
                    }
                    if (multi_line) {
                        state.write(state.lineEnd);
                        state.write(state.indent.repeat(--state.indentLevel));
                    }
                    state.write(']');
                }
            });

            text = astring.generate(AST, {
                indent: '    ',
                comments: true,
                generator,
            });

            text = beautify(text, {
                indent_char               : ' ',
                indent_size               : 4,
                preserve_newlines         : true,
                max_preserve_newlines     : 2,
                keep_array_indentation    : true,
                break_chained_methods     : false,
                indent_scripts            : 'normal',
                brace_style               : 'collapse,preserve-inline',
                space_before_conditional  : true,
                space_after_anon_function : true,
                space_after_named_function: true,
                unescape_strings          : true,
                jslint_happy              : true,
                end_with_newline          : false,
                indent_empty_lines        : false,
                wrap_line_length          : 0
            });

            text = text.replace(/`@@([a-z]+)@@/gi, '/*$1*/`');

            await fs.promises.writeFile(result.outputFiles[0].path, text, 'utf-8');
        });
    }
}


compile(
    [
        src_file
    ],
    {
        outdir: dir,
    }
)

/**
 * @param {string[]} entryPoints
 * @param {esbuild.BuildOptions} options
 */
async function compile (entryPoints, options) {
    /**
     * @type esbuild.BuildOptions
     */
    const baseOptions = {
        entryPoints,

        bundle       : true,
        minify       : false,
        treeShaking  : true,
        keepNames    : false,
        legalComments: 'inline',

        define: {
            PLUGIN_NAME: `'${target}'`
        },
        external: [
            'electron',
            'fs',
            'http', 'https', 'request'
        ],

        plugins: [
            specialProcessing,
            sassPlugin({
                type: 'css-text',
                transform: css => {
                    return {
                        contents: `/*!@const*/export const css = s => \`@@CSS@@\n${css.replace(/`/g, "\\$1").replace(/\#\_\:([^ ,>\+\:\[\]\{\)]+)/g, "${s.$1}")}\`;`,
                        loader: 'js'
                    };
                }
            }),
        ],
        loader: {
            '.svg' : 'dataurl',
            '.png' : 'dataurl',
            '.jpg' : 'dataurl',
            '.jpeg': 'dataurl',
            '.css' : 'text',
        },

        write    : false,
        sourcemap: false,
        target   : 'es2021',
        platform : 'node',
        jsx      : 'transform',
        tsconfig : './tsconfig.json',

        logLevel: 'silent',
        metafile: true
    }

    const bundle = await esbuild.build(Object.assign(
        options,
        baseOptions
    ));

    if (bundle.warnings.length) {
        process.stdout.write(
            esbuild.formatMessagesSync(
                bundle.warnings,
                {
                    kind: 'warning',
                    color: true
                }
            ).join('\n\n')
        );
    }

    if (bundle.errors.length) {
        process.stderr.write(
            esbuild.formatMessagesSync(
                bundle.errors,
                {
                    kind: 'error',
                    color: true
                }
            ).join('\n\n')
        );
    }

    process.stdout.write(
        esbuild.analyzeMetafileSync(
            bundle.metafile,
            {
                verbose: true,
                color: true
            }
        ) + '\n'
    );

    let exitCode = bundle.errors.length ? 1 : 0;

    console.log(`${!exitCode ? 'Success!' : 'Compile failed!'} Process exiting with code '${exitCode}'.`);
    process.exit(exitCode);
}