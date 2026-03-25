#!/usr/bin/env node

const cli = require('./doraemon-skills-lib');

cli.main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
});
