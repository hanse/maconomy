#!/usr/bin/env node

const { promisify } = require('util');
const path = require('path');
const os = require('os');
const fs = require('mz/fs');
const program = require('commander');
const chalk = require('chalk');
const prompt = require('prompt');
const Table = require('cli-table');
const parse = require('date-fns/parse');
const format = require('date-fns/format');
const addDays = require('date-fns/add_days');
const createClient = require('./');
const { transformLogin, transformLines } = require('./transformers');
const log = response => console.log(JSON.stringify(response, null, 2));

const { yellow, blue, green, red } = chalk;

const SESSION_FILE = path.resolve(os.homedir(), '.maconomy-session-id');

const rpcUrl = process.env.MACONOMY_RPC_URL;

if (!rpcUrl) {
  console.error(red('MACONOMY_RPC_URL env variable is not defined.'));
  process.exit(1);
}

const api = createClient({ rpcUrl });

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

    const response = await api.login(username, password);

    program.debug && log(response);

    const { sessionId, employeeName, employeeNumber, company } = transformLogin(
      response
    );

    await storeSession(sessionId);

    console.log(
      `Got session for #${yellow(employeeNumber)} ${employeeName} ${company}`
    );
  })
);

program.command('show [date]').action(createAction(withSessionId(show)));

program
  .command('add <projectId> <task> <hours> <date> [text] [lineKey]')
  .action(
    createAction(
      withSessionId(async (sessionId, ...args) => {
        const [projectId, task, hours, date, text, lineKey] = args;

        const response = await api.saveTimesheetEntry({
          sessionId,
          projectId,
          hours: String(hours),
          date: String(date),
          task: String(task),
          text,
          lineKey: toTimeSheetLineId(lineKey)
        });

        program.debug && log(response);
        const line = response.Line ? response.Line.InstanceKey : null;
        await show(sessionId, date);
      })
    )
  );

program.command('delete <lineKey> [date]').action(
  createAction(
    withSessionId(async (sessionId, lineKey, date) => {
      const response = await api.deleteTimesheetEntry(
        sessionId,
        toTimeSheetLineId(lineKey),
        format(date || new Date(), 'YYYY.MM.DD')
      );
      program.debug && log(response);
      await show(sessionId);
    })
  )
);

program.command('search [query]').action(
  createAction(
    withSessionId(async (sessionId, query) => {
      const response = await api.recentlyUsedJobSearch(sessionId, query);
      const items = response.SearchData.map(item => ({
        projectId: item.KeyValue,
        name: item.DisplayValue
      }));

      program.debug && log(response);
      items.forEach(({ projectId, name }) => {
        console.log(`${projectId} ${name}`);
      });
    })
  )
);

program.command('tasks <projectId> [query]').action(
  createAction(
    withSessionId(async (sessionId, projectId, query) => {
      const response = await api.taskSearch(sessionId, projectId, query);
      const items = response.SearchData.map(item => ({
        projectId: item.KeyValue,
        name: item.DisplayValue
      }));

      program.debug && log(response);
      items.forEach(({ projectId, name }) => {
        console.log(`${projectId} ${name}`);
      });
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

function fromTimeSheetLineId(timeSheetLineId) {
  return timeSheetLineId ? timeSheetLineId.replace('TimeSheetLine', '') : '';
}

function toTimeSheetLineId(key) {
  return key ? `TimeSheetLine${key}` : '';
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

async function show(sessionId, date) {
  date = parse(date || new Date());

  const data = await api.getPeriod(
    sessionId,
    format(date, 'YYYY.MM.DD'),
    format(addDays(date, 7), 'YYYY.MM.DD')
  );

  program.debug && console.log(JSON.stringify(data, null, 2));

  const headers = [
    'Project',
    'Task',
    'Description',
    ...data.DayTotals.map(day => format(parse(day.TheDate), 'DD/MM')),
    'Text',
    'Key'
  ];

  const table = new Table({ head: headers });

  const lines = transformLines(data);
  lines.forEach(line => {
    const {
      key,
      name,
      projectId,
      task,
      entryText,
      taskDescription,
      daily
    } = line;

    table.push([
      projectId,
      task,
      taskDescription,
      ...daily.map(day => (day.hours === '0.00' ? '' : day.hours)),
      entryText,
      fromTimeSheetLineId(key)
    ]);
  });

  console.log(table.toString());
  console.log(
    `Week ${data.weekNumber}${data.part.trim()}: ${
      data.submitted === 'N' ? yellow('Not submitted') : green('Submitted')
    }`
  );
}
