require('isomorphic-fetch');
const formurlencoded = require('form-urlencoded');

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
      .then(res => res.json())
      .then(json => {
        if (!json.ok) {
          const error = new Error(
            `Maconomy Error: ${json.Message || json.message || 'Unknown'}`
          );
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
          inputTheDate: startDate,
          startDate: startDate,
          endDate: endDate,
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

  function initializeTimesheetLine(sessionId, projectId, date) {
    return executeRpc(
      {
        inpObj: {
          Fields:
            'InstanceKey,JobNameVar,JobNumber,TaskName,TaskDescriptionVar,CustomerNameVar,Invoiceable,ApprovalStatus,CommentProjectManager,TheDate,NumberOf,DailyDescription,ActivityNumber,ActivityTextVar,PermanentLine,LineCurrentApprovalStatusDescriptionVar',
          JobNumber: projectId,
          Favorite: '',
          StartDate: '2017.11.13',
          CurrentDate: '2017.11.18',
          operation: 'initializeTimeSheetLine',
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
    customerId,
    hours,
    projectId,
    text,
    dailyDescription,
    lineKey
  }) {
    return executeRpc(
      {
        inpObj: {
          theDate: date,
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
            EntryDate: date,
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
          theDate: date,
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
          fromDate: fromDate,
          toDate: toDate,
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
    initializeTimesheetLine,
    deleteTimesheetEntry
  };
};
