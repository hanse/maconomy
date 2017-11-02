function transformLines(response) {
  const lines = response.Lines;
  return lines.map(line => {
    const fields = line.Fields;
    return {
      name: line.DisplayName,
      projectId: fields.JobNumber,
      task: fields.TaskName,
      taskDescription: fields.TaskDescriptionVar,
      customer: fields.CustomerNameVar,
      daily: fields.dailyFields.map(dailyField => ({
        date: dailyField.TheDate,
        description: dailyField.DailyDescription,
        hours: dailyField.NumberOf
      }))
    };
  });
}
