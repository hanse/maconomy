const createClient = require('../');

const SESSION_ID = 123;

test('login(username, password)', async () => {
  await expectRequestToMatchSnapshot(client => client.login('demo', 'demo'));
});

test('getPeriod(sessionId, startDate, endDate)', async () => {
  await expectRequestToMatchSnapshot(client =>
    client.getPeriod(SESSION_ID, '2018.02.05', '2018.02.10')
  );
});

test('recentlyUsedJobSearch(sessionId, query)', async () => {
  await expectRequestToMatchSnapshot(client =>
    client.recentlyUsedJobSearch(SESSION_ID, '1095123')
  );
});

test('taskSearch(sessionId, projectId, value)', async () => {
  await expectRequestToMatchSnapshot(client =>
    client.taskSearch(SESSION_ID, '1095123', '92')
  );
});

test('saveTimesheetEntry({sessionId,date,task,hours,projectId,text,dailyDescription,lineKey}', async () => {
  await expectRequestToMatchSnapshot(client =>
    client.saveTimesheetEntry({
      sessionId: SESSION_ID,
      date: '2018.02.05',
      task: '9202',
      hours: '5.5',
      projectId: '1095123',
      text: 'CS-1',
      dailyDescription: 'CS-1',
      lineKey: 'a-b-c'
    })
  );
});

test('deleteTimesheetEntry(sessionId, lineKey, date)', async () => {
  await expectRequestToMatchSnapshot(client =>
    client.taskSearch(SESSION_ID, 'a-b-c', '2018.02.05')
  );
});

test('getTimesheetPeriods(sessionId)', async () => {
  await expectRequestToMatchSnapshot(client =>
    client.getTimesheetPeriods(SESSION_ID)
  );
});

test('getTimesheetTotals(sessionId, fromDate, toDate)', async () => {
  await expectRequestToMatchSnapshot(client =>
    client.getTimesheetPeriods(SESSION_ID, '2018.01.01', '2018.02.01')
  );
});

async function expectRequestToMatchSnapshot(fn) {
  const originalFetch = global.fetch;

  global.fetch = jest.fn().mockImplementation(async () => {
    return {
      json: async () => ({ ok: true })
    };
  });

  const client = createClient({ rpcUrl: 'localhost:8000' });

  await fn(client);
  expect(global.fetch.mock.calls).toMatchSnapshot();

  global.fetch = originalFetch;
}
