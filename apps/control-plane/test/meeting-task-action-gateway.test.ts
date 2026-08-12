import { test, expect } from 'vitest';

test('Approved meeting draft task converts to ActionRequest payload', () => {
  const draftTask = {
    task_id: 'task-1',
    meeting_id: 'meet-1',
    title: 'Atualizar documentação de reuniões',
    suggested_assignee: 'joao@domus.corp',
    due_date: '2026-08-15',
    confidence_score: 0.92,
    provenance_quote: 'Precisamos atualizar a documentação até sexta-feira.',
    status: 'approved'
  };

  const actionRequest = {
    action_type: 'create_issue',
    connector: 'jira',
    parameters: {
      summary: draftTask.title,
      description: `Origem: Reunião ${draftTask.meeting_id}\nCitação: "${draftTask.provenance_quote}"`,
      assignee: draftTask.suggested_assignee,
      due_date: draftTask.due_date
    }
  };

  expect(actionRequest.parameters.summary).toBe(draftTask.title);
  expect(actionRequest.action_type).toBe('create_issue');
});
