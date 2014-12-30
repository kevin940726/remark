#!/usr/bin/env node
'use strict';

/*
 * Dependencies.
 */

var mdast,
    fs,
    pack;

mdast = require('./');
fs = require('fs');
pack = require('./package.json');

/*
 * Detect if a value is expected to be piped in.
 */

var expextPipeIn;

expextPipeIn = !process.stdin.isTTY;

/*
 * Arguments.
 */

var argv;

argv = process.argv.slice(2);

/*
 * Command.
 */

var command;

command = Object.keys(pack.bin)[0];

/**
 * Help.
 */
function help() {
    return [
        '',
        'Usage: ' + command + ' [options] file',
        '',
        pack.description,
        '',
        'Options:',
        '',
        '  -h, --help            output usage information',
        '  -v, --version         output version number',
        '  -a, --ast             output AST information',
        '      --options         output available settings',
        '  -o, --option <option> specify settings',
        '',
        'Usage:',
        '',
        '# Pass `Readme.md` through mdast',
        '$ ' + command + ' Readme.md > Readme.md',
        '',
        '# Pass stdin through mdast, with options',
        '$ cat Readme.md | ' + command + ' -o ' +
            '"setex-headings, bullet: *" > Readme.md'
    ].join('\n  ') + '\n';
}

/**
 * Fail w/ help message.
 */
function fail() {
    process.stderr.write(help());
    process.exit(1);
}

/**
 * Log available options.
 *
 * @return {string}
 */
function getOptions() {
    return [
        '',
        '# Options',
        '',
        'Both camel- and dash-cased options are allowed.  Some options start',
        'with `prefer`, this can be ignored in the CLI.',
        '',
        '## [Parse](https://github.com/wooorm/mdast#mdastparsevalue-options)',
        '',
        '-  `gfm` (boolean, default: true)',
        '-  `tables` (boolean, default: true)',
        '-  `pedantic` (boolean, default: false)',
        '-  `breaks` (boolean, default: false)',
        '-  `footnotes` (boolean, default: false)',
        '',
        '## [Stringify](https://github.com/wooorm/mdast#' +
            'mdaststringifyast-options)',
        '',
        '-  `setex-headings` (boolean, default: false)',
        '-  `reference-links` (boolean, default: false)',
        '-  `reference-footnotes` (boolean, default: true)',
        '-  `fences` (boolean, default: false)',
        '-  `bullet` ("-", "*", or "+", default: "-")',
        '-  `horizontal-rule` ("-", "*", or "_", default: "*")',
        '-  `horizontal-rule-repetition` (number, default: 3)',
        '-  `horizontal-rule-spaces` (boolean, default: false)',
        '-  `strong` ("_", or "*", default: "*")',
        '-  `emphasis` ("_", or "*", default: "_")',
        '',
        'Settings are specified as follows:',
        '',
        '```',
        '$ ' + command + ' --option "some-option:some-value"',
        '# Multiple options:',
        '$ ' + command + ' --option "emphasis:*,strong:_"',
        '```'
    ].join('\n  ') + '\n';
}

/**
 * Transform a dash-cased string to camel-cased.
 *
 * @param {string} value
 * @return {string}
 */
function camelCase(value) {
    return value.toLowerCase().replace(/-([a-z])/gi, function ($0, $1) {
        return $1.toUpperCase();
    });
}

/*
 * Program.
 */

var index,
    expectOption,
    expectAST,
    options,
    files;

/**
 * Run the program.
 *
 * @param {string} value
 */
function program(value) {
    var ast;

    if (!value.length) {
        fail();
    } else {
        ast = mdast.parse(value, options);

        if (expectAST) {
            console.log(ast);
        } else {
            console.log(mdast.stringify(ast, options));
        }
    }
}

if (
    argv.indexOf('--help') !== -1 ||
    argv.indexOf('-h') !== -1
) {
    console.log(help());
} else if (
    argv.indexOf('--version') !== -1 ||
    argv.indexOf('-v') !== -1
) {
    console.log(pack.version);
} else if (
    argv.indexOf('--options') !== -1
) {
    console.log(getOptions());
} else {
    index = argv.indexOf('--ast');

    if (index === -1) {
        index = argv.indexOf('-a');
    }

    if (index !== -1) {
        expectAST = true;
        argv.splice(index, 1);
    }

    files = [];
    options = {};

    argv.forEach(function (argument) {
        if (argument === '--option' || argument === '-o') {
            expectOption = true;
        } else if (!expectOption) {
            files.push(argument);
        } else {
            argument
                .split(',')
                .map(function (value) {
                    var values;

                    values = value.split(':');

                    return [
                        camelCase(values.shift().trim()),
                        values.join(':').trim()
                    ];
                })
                .map(function (values) {
                    var key,
                        value;

                    key = values[0];
                    value = values[1];

                    if (
                        key === 'setexHeadings' ||
                        key === 'referenceLinks' ||
                        key === 'referenceFootnotes' ||
                        key === 'fences'
                    ) {
                        key = 'prefer' + key.charAt(0).toUpperCase() +
                            key.slice(1);
                    }

                    if (value === 'true') {
                        value = true;
                    } else if (value === 'false') {
                        value = false;
                    } else if (value === '') {
                        value = true;
                    } else if (Number(value) === Number(value)) {
                        value = Number(value);
                    }

                    return [key, value];
                })
                .forEach(function (values) {
                    options[values[0]] = values[1];
                });

            expectOption = false;
        }
    });

    if (expectOption) {
        fail();
    } else if (!expextPipeIn && !files.length) {
        fail();
    } else if (
        (expextPipeIn && files.length) ||
        (!expextPipeIn && files.length !== 1)
    ) {
        process.stderr.write('mdast currently expects one file.\n');
        process.exit(1);
    }

    if (files[0]) {
        fs.readFile(files[0], function (exception, content) {
            if (exception) {
                throw exception;
            }

            program(content.toString());
        });
    } else {
        process.stdin.resume();

        process.stdin.setEncoding('utf8');

        process.stdin.on('data', program);
    }
}