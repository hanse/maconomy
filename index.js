const fetch = require('node-fetch');
const formurlencoded = require('form-urlencoded');

const RPC_URL = process.env.RPC_URL;

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
    macurl: RPC_URL,
    sessionid: sessionId
  });

  return fetch(RPC_URL, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }).then(res => res.json());
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
  }).then(json => {
    return {
      sessionId: json.sessionid,
      employeeName: json.EmployeeName,
      employeeNumber: json.EmployeeNumber,
      company: json.Company
    };
  });
}

function inputTheDate(sessionId, startDate, endDate) {
  return executeRpc(
    {
      inpObj: {
        inputTheDate: startDate,
        startDate: startDate,
        endDate: endDate,
        includeLineMetadata: true,
        lineFields:
          'JobNameVar,JobNumber,TaskName,TaskDescriptionVar,CustomerNameVar,Invoiceable,ApprovalStatus,CommentProjectManager,TheDate,NumberOf,DailyDescription,ActivityNumber,ActivityTextVar,PermanentLine',
        operation: 'getperiod',
        sessionid: sessionId,
        ...commonProps
      }
    },
    sessionId
  );
}

function recentlyUsedJobSearch(value, sessionId) {
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

function initializeTimesheetLine(projectId, date, sessionId) {
  return executeRpc(
    {
      inpObj: {
        Fields:
          'JobNameVar,JobNumber,TaskName,TaskDescriptionVar,CustomerNameVar,Invoiceable,ApprovalStatus,CommentProjectManager,TheDate,NumberOf,DailyDescription,ActivityNumber,ActivityTextVar,PermanentLine,LineCurrentApprovalStatusDescriptionVar',
        JobNumber: projectId,
        Favorite: '',
        StartDate: date,
        CurrentDate: date,
        operation: 'initializeTimeSheetLine',
        sessionid: sessionId,
        ...commonProps
      }
    },
    sessionId
  );
}

function taskSearch(value, projectId, sessionId) {
  return executeRpc(
    {
      inpObj: {
        SearchName: 'TaskSearch',
        Fields: [
          { Name: 'SearchText', Value: '' },
          { Name: 'JobNumber', Value: String(projectId) }
        ],
        operation: 'search',
        clean: false,
        calfocus: false,
        impersonate: false,
        maccharset: 'UTF-8',
        lang: 'en_GB_MCS',
        locale: 'en_US',
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
  text
}) {
  return executeRpc(
    {
      inpObj: {
        theDate: date,
        InstanceKey: '',
        Fields: {
          CustomerNumberVar: '90109',
          Favorite: '',
          JobNumber: projectId,
          TaskName: task,
          DailyDescription: '',
          NumberOf: `'${hours}'`,
          TaskDescriptionVar: text,
          ActivityNumber: '10300',
          ActivityTextVar: text,
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
          'JobNameVar,JobNumber,TaskName,TaskDescriptionVar,CustomerNameVar,Invoiceable,ApprovalStatus,CommentProjectManager,TheDate,NumberOf,DailyDescription,ActivityNumber,ActivityTextVar,PermanentLine',
        operation: 'savetimesheetentry',
        sessionid: sessionId,
        ...commonProps
      }
    },
    sessionId
  );
}

module.exports = {
  login,
  saveTimesheetEntry,
  recentlyUsedJobSearch,
  taskSearch,
  inputTheDate,
  initializeTimesheetLine
};
