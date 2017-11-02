#!/usr/bin/env node

const { promisify } = require('util');
const fs = require('mz/fs');
const meow = require('meow');
const chalk = require('chalk');
const prompt = require('prompt');
const api = require('./');

const cli = meow('Usage: maconomy');

const { yellow, blue, green, red } = chalk;

const SESSION_FILE = '.maconomy-session-id';

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
  const action = input.shift();
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

      if (input.length < 4) {
        console.log('Usage: maconomy add projectId task hours date text');
        process.exit(0);
      }

      const [projectId, task, hours, date, text] = input.map(String);

      return api
        .saveTimesheetEntry({
          sessionId,
          projectId,
          hours,
          date,
          task,
          text
        })
        .then(
          result =>
            result.ok
              ? console.log(green('Entry added successfully'))
              : console.error(result)
        );
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
  }
}

main();
