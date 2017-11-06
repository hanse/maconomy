#!/usr/bin/env node

const { promisify } = require('util');
const path = require('path');
const os = require('os');
const fs = require('mz/fs');
const meow = require('meow');
const chalk = require('chalk');
const prompt = require('prompt');
const parse = require('date-fns/parse');
const format = require('date-fns/format');
const addDays = require('date-fns/add_days');
const api = require('./');
const { transformLines } = require('./transformers');

const cli = meow('Usage: maconomy');

const { yellow, blue, green, red } = chalk;

const SESSION_FILE = path.resolve(os.homedir(), '.maconomy-session-id');

async function getSession(username, password) {
  let sessionId;

  try {
    sessionId = fs.readFileSync(SESSION_FILE, 'utf8');
  } catch (error) {}

  return sessionId || null;
}

function storeSession(sessionId) {
  fs.writeFileSync(SESSION_FILE, sessionId);
}

function assertSession(sessionId) {
  if (!sessionId) {
    throw new Error('Session ID is missing. You must login first.');
  }
}

async function run(input, flags) {
  const [action, ...args] = input;
  switch (action) {
    case 'login': {
      prompt.start();
      const { username, password } = await promisify(prompt.get)({
        properties: {
          username: {
            required: true
          },
          password: {
            hidden: true,
            required: true
          }
        }
      });

      try {
        const {
          sessionId,
          employeeName,
          employeeNumber,
          company
        } = await api.login(username, password);

        storeSession(sessionId);

        console.log(
          `Got session for #${yellow(
            employeeNumber
          )} ${employeeName} ${company}`
        );
      } catch (error) {
        throw new Error('Login failed');
      }

      return;
    }

    case 'add': {
      const sessionId = await getSession();
      assertSession(sessionId);

      if (args.length < 4) {
        console.log('Usage: maconomy add projectId task hours date text');
        process.exit(0);
      }

      const [projectId, task, hours, date, text, lineKey] = args.map(String);

      const result = await api.saveTimesheetEntry({
        sessionId,
        projectId,
        hours,
        date,
        task,
        text,
        lineKey
      });

      console.log(result);
      console.log();
      console.log(
        green(`Entry added successfully to ${result.Line.InstanceKey}`)
      );
      return;
    }

    case 'show': {
      const sessionId = await getSession();
      assertSession(sessionId);

      const date = parse(args[0] || new Date());

      const data = await api.getPeriod(
        sessionId,
        format(date, 'YYYY.MM.DD'),
        format(addDays(date, 4), 'YYYY.MM.DD')
      );

      const lines = transformLines(data);

      console.log(JSON.stringify(data, null, 2));

      lines.forEach(line => {
        const { name, projectId, task, taskDescription, daily } = line;

        console.log(
          `${projectId} ${task} ${taskDescription} ${daily
            .map(day => day.hours)
            .join(' ')}`
        );
      });

      break;
    }

    default:
      console.log(cli.help.trim());
  }
}

async function main() {
  try {
    await run(cli.input.slice(), cli.flags);
  } catch (error) {
    console.error(red(error.message));

    if (error.response) {
      console.error();
      console.error(JSON.stringify(error.response, null, 2));
    }
  }
}

main();
