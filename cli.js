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
const startOfWeek = require('date-fns/start_of_week');
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

program
  .command('login')
  .description('start a new session')
  .action(
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

      const {
        sessionId,
        employeeName,
        employeeNumber,
        company
      } = transformLogin(response);

      await storeSession(sessionId);

      console.log(
        `Got session for #${yellow(employeeNumber)} ${employeeName} ${company}`
      );
    })
  );

program
  .command('show [date]')
  .description('show the timesheet for the given date')
  .action(createAction(withSessionId(show)));

program
  .command('add <projectId> <task> <hours> <date> [text] [lineKey]')
  .description('add a line to the timesheet')
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

program
  .command('delete <lineKey> [date]')
  .description('delete a line from the timesheet')
  .action(
    createAction(
      withSessionId(async (sessionId, lineKey, date) => {
        const response = await api.deleteTimesheetEntry(
          sessionId,
          toTimeSheetLineId(lineKey),
          date || new Date()
        );
        program.debug && log(response);
        await show(sessionId);
      })
    )
  );

program
  .command('delete-all [date]')
  .description('wipe the current timesheet (very destructive)')
  .action(createAction(withSessionId(deleteAll)));

program
  .command('search [query]')
  .description('search for recently used projects')
  .action(
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

program
  .command('tasks <projectId> [query]')
  .description('list tasks available to specific project')
  .action(
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

program
  .command('import')
  .description('import timesheets in various formats from stdin')
  .option('--format <format>', 'format to convert from (currently csv only)')
  .option('--start-date [startDate]', 'the date of the first column')
  .option('--keep', 'keep existing lines when importing')
  .action(
    createAction(
      withSessionId(async (sessionId, options) => {
        const { parse } = require('csv-string');
        const lines = parse(await readStream(process.stdin));

        const add = async (projectId, task, hours, date, text, lineKey) => {
          const response = await api.saveTimesheetEntry({
            sessionId,
            projectId,
            hours: String(hours),
            date: String(date),
            task: String(task),
            text,
            lineKey: toTimeSheetLineId(lineKey)
          });

          return fromTimeSheetLineId(
            response.Line ? response.Line.InstanceKey : null
          );
        };

        const date = options.startDate
          ? parse(options.startDate)
          : startOfWeek(new Date(), { weekStartsOn: 1 });

        if (!options.keep) {
          await deleteAll(sessionId, date);
        }

        for (const line of lines) {
          const [projectId, task, ...rest] = line;
          const [firstDayOfWeek, ...otherDays] = rest.slice(0, 7);
          const text = rest[7];
          const lineId = await add(projectId, task, firstDayOfWeek, date, text);

          await Promise.all(
            otherDays.map((otherDay, index) => {
              const newDate = addDays(date, index + 1);
              return add(projectId, task, otherDay, newDate, text, lineId);
            })
          );
        }

        await show(sessionId, date);
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

function readStream(stdin = process.stdin) {
  return new Promise(resolve => {
    stdin.setEncoding('utf8');
    let chunks = '';

    stdin.on('data', chunk => {
      chunks += chunk;
    });

    stdin.on('end', () => {
      resolve(chunks);
    });
  });
}

async function show(sessionId, date) {
  date = parse(date || new Date());

  const data = await api.getPeriod(sessionId, date, addDays(date, 7));

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

async function deleteAll(sessionId, date) {
  date = parse(date || new Date());

  const data = await api.getPeriod(sessionId, date, addDays(date, 7));

  const lines = transformLines(data);

  const lineKeys = lines
    .map(line => fromTimeSheetLineId(line.key))
    .filter(Boolean);

  await Promise.all(
    lineKeys.map(lineKey => {
      return api.deleteTimesheetEntry(
        sessionId,
        toTimeSheetLineId(lineKey),
        date
      );
    })
  );
}
