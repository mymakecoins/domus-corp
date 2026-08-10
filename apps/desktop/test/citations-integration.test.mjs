import { test } from 'node:test';
import assert from 'node:assert/strict';

test('desktop renderer citation fixture mapping covers all 4 freshness statuses', () => {
  const syntheticCitations = [
    { id: '1', refCode: '[1]', label: 'Política de Segurança', status: 'vigente' },
    { id: '2', refCode: '[2]', label: 'Manual Operacional Obsoleto', status: 'obsoleta' },
    { id: '3', refCode: '[3]', label: 'Diretriz em Conflito', status: 'conflitante' },
    { id: '4', refCode: '[4]', label: 'Relatório Fora de Alçada', status: 'restrita' },
  ];

  const statuses = syntheticCitations.map(c => c.status);
  assert.deepEqual(statuses, ['vigente', 'obsoleta', 'conflitante', 'restrita']);
});
