#!/usr/bin/env node
import { hideBin } from 'yargs/helpers';
import { runYargsCommand } from '../server/yargsHandler.ts';

const result = await runYargsCommand(hideBin(process.argv));
if (result.output) {
  if (result.exitCode !== 0) {
    console.error(result.output);
  } else {
    console.log(result.output);
  }
}
process.exit(result.exitCode);
