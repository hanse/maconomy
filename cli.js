#!/usr/bin/env node

const { promisify } = require('util');
const path = require('path');
const os = require('os');
const fs = require('mz/fs');
const program = require('commander');
const chalk = require('chalk');
const prompt = require('prompt');
const parse = require('date-fns/parse');
const format = require('date-fns/format');
const addDays = require('date-fns/add_days');
const api = require('./');
const { transformLines } = require('./transformers');

const { yellow, blue, green, red } = chalk;

const SESSION_FILE = path.resolve(os.homedir(), '.maconomy-session-id');

program
  .version(require('./package.json').version)
  .option('--debug', 'show json responses');

program.command('login').action(
  createAction(async () => {
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

    const {
      sessionId,
      employeeName,
      employeeNumber,
      company
    } = await api.login(username, password);

    await storeSession(sessionId);

    console.log(
      `Got session for #${yellow(employeeNumber)} ${employeeName} ${company}`
    );
  })
);

program.command('show [date]').action(
  createAction(
    withSessionId(async (sessionId, date) => {
      date = parse(date || new Date());

      const data = await api.getPeriod(
        sessionId,
        format(date, 'YYYY.MM.DD'),
        format(addDays(date, 7), 'YYYY.MM.DD')
      );

      program.debug && console.log(JSON.stringify(data, null, 2));

      const headers = ['Project', 'Task', 'Description'].concat(
        data.DayTotals.map(day => format(parse(day.TheDate), 'DD/MM'))
      );

      console.log(headers.join(' '));

      const lines = transformLines(data);
      lines.forEach(line => {
        const { name, projectId, task, taskDescription, daily } = line;

        console.log(
          `${projectId} ${task} ${taskDescription} ${daily
            .map(day => day.hours)
            .join(' ')}`
        );
      });
    })
  )
);

program
  .command('add <projectId> <task> <hours> <date> [text] [lineKey]')
  .action(
    createAction(
      withSessionId(async (sessionId, ...args) => {
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

        program.debug && console.log(result);
        console.log(
          green(`Entry added successfully to ${result.Line.InstanceKey}`)
        );
      })
    )
  );

program.parse(process.argv);

async function getSession(username, password) {
  let sessionId;

  try {
    sessionId = await fs.readFile(SESSION_FILE, 'utf8');
  } catch (error) {}

  return sessionId || null;
}

function storeSession(sessionId) {
  return fs.writeFile(SESSION_FILE, sessionId);
}

function createAction(action) {
  return async (...args) => {
    try {
      return await action(...args);
    } catch (error) {
      console.error(red(error));

      if (error.response) {
        console.error();
        console.error(JSON.stringify(error.response, null, 2));
      }
    }
  };
}

function withSessionId(action) {
  return async (...args) => {
    const sessionId = await getSession();
    if (!sessionId) {
      throw new Error(
        `Session ID is missing. You must login first using 'maconomy login'.`
      );
    }

    return action(sessionId, ...args);
  };
}
