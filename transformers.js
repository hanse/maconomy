function transformLines(response) {
  const lines = response.Lines;
  return lines.map(line => {
    const fields = line.Fields;
    return {
      key: line.InstanceKey,
      name: line.DisplayName,
      projectId: fields.JobNumber,
      task: fields.TaskName,
      taskDescription: fields.TaskDescriptionVar,
      entryText: fields.EntryText,
      customer: fields.CustomerNameVar,
      daily: fields.dailyFields.map(dailyField => ({
        date: dailyField.TheDate,
        description: dailyField.DailyDescription,
        hours: dailyField.NumberOf
      }))
    };
  });
}

module.exports = {
  transformLines
};
