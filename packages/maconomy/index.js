require('isomorphic-fetch');
const formurlencoded = require('form-urlencoded');
const format = require('date-fns/format');
const parse = require('date-fns/parse');

const formatDate = date => format(parse(date), 'YYYY.MM.DD');

module.exports = function createClient({ rpcUrl }) {
  const commonProps = {
    clean: false,
    calfocus: false,
    impersonate: false,
    maccharset: 'UTF-8',
    lang: 'en_US',
    locale: 'en_US'
  };

  function executeRpc(request, sessionId) {
    const body = formurlencoded({
      requestobj: JSON.stringify(request),
      functionname: 'executerequest',
      macurl: rpcUrl,
      sessionid: sessionId
    });

    return fetch(rpcUrl, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
      .then(res => res.text())
      .then(text => {
        try {
          return JSON.parse(text);
        } catch (error) {
          throw new Error(`Could not parse JSON: ${text}. ${error.message}`);
        }
      })
      .then(json => {
        if (!json.ok) {
          const error = new Error(`Maconomy Error: ${json.Message || json.message || 'Unknown'}`);
          error.response = json;
          throw error;
        }

        return json;
      });
  }

  function login(username, password) {
    return executeRpc({
      inpObj: {
        username,
        password,
        includeScreenLayouts: false,
        operation: 'login',
        ...commonProps
      }
    });
  }

  function getPeriod(sessionId, startDate, endDate) {
    return executeRpc(
      {
        inpObj: {
          inputTheDate: formatDate(startDate),
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          includeLineMetadata: true,
          lineFields:
            'JobNameVar,JobNumber,TaskName,EntryText,TaskDescriptionVar,CustomerNameVar,Invoiceable,ApprovalStatus,CommentProjectManager,TheDate,NumberOf,DailyDescription,ActivityNumber,ActivityTextVar,PermanentLine',
          operation: 'getperiod',
          sessionid: sessionId,
          ...commonProps
        }
      },
      sessionId
    );
  }

  function recentlyUsedJobSearch(sessionId, value) {
    return executeRpc(
      {
        inpObj: {
          SearchName: 'RecentlyUsedJobsSearch',
          Fields: [{ Name: 'SearchText', Value: value }],
          operation: 'search',
          sessionid: sessionId,
          ...commonProps
        }
      },
      sessionId
    );
  }

  function taskSearch(sessionId, projectId, value) {
    return executeRpc(
      {
        inpObj: {
          SearchName: 'TaskSearch',
          Fields: [
            { Name: 'SearchText', Value: '' },
            { Name: 'JobNumber', Value: String(projectId) }
          ],
          operation: 'search',
          ...commonProps,
          sessionid: sessionId
        }
      },
      sessionId
    );
  }

  function saveTimesheetEntry({
    sessionId,
    date,
    task,
    hours,
    projectId,
    text,
    dailyDescription,
    lineKey
  }) {
    return executeRpc(
      {
        inpObj: {
          theDate: formatDate(date),
          InstanceKey: lineKey || '',
          Fields: {
            Favorite: '',
            JobNumber: projectId,
            TaskName: task,
            DailyDescription: dailyDescription || '',
            NumberOf: `'${hours}'`,
            EntryText: text,
            PermanentLine: 'false',
            InternalJob: 'true',
            LineCurrentApprovalStatusDescriptionVar: '',
            LineCurrentApprovalStatusVar: '',
            CommentProjectManager: '',
            Invoiceable: 'false',
            ApprovalStatus: '',
            EntryDate: formatDate(date),
            createfavorite: 'undefined'
          },
          reopenIfSubmitted: false,
          DisplayFields:
            'JobNameVar,EntryText,JobNumber,TaskName,TaskDescriptionVar,CustomerNameVar,Invoiceable,ApprovalStatus,CommentProjectManager,TheDate,NumberOf,DailyDescription,ActivityNumber,ActivityTextVar,PermanentLine',
          operation: 'savetimesheetentry',
          sessionid: sessionId,
          ...commonProps
        }
      },
      sessionId
    );
  }

  function deleteTimesheetEntry(sessionId, lineKey, date) {
    return executeRpc(
      {
        inpObj: {
          theDate: formatDate(date),
          InstanceKey: lineKey || '',
          reopenIfSubmitted: false,
          operation: 'deletetimesheetentry',
          ...commonProps,
          sessionid: sessionId
        }
      },
      sessionId
    );
  }

  function getTimesheetPeriods(sessionId) {
    return executeRpc(
      {
        inpObj: {
          operation: 'gettimesheetperiods',
          ...commonProps,
          sessionid: sessionId
        }
      },
      sessionId
    );
  }

  function getTimesheetTotals(sessionId, fromDate, toDate) {
    return executeRpc(
      {
        inpObj: {
          fromDate: formatDate(fromDate),
          toDate: formatDate(toDate),
          operation: 'gettimesheettotals',
          ...commonProps,
          sessionid: sessionId
        }
      },
      sessionId
    );
  }

  return {
    login,
    saveTimesheetEntry,
    recentlyUsedJobSearch,
    taskSearch,
    getPeriod,
    deleteTimesheetEntry,
    getTimesheetTotals,
    getTimesheetPeriods
  };
};
