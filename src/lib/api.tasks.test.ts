import { tasksApi } from './api';
const mockGetUser = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
const query = { eq: mockEq, select: () => query, maybeSingle: mockMaybeSingle };
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: () => mockGetUser() },
  from: () => ({ insert: (payload: unknown) => mockInsert(payload), update: (payload: unknown) => mockUpdate(payload) }),
} }));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'organization-owner' } } });
  mockSingle.mockResolvedValue({ data: { id: 'task' }, error: null });
  mockMaybeSingle.mockResolvedValue({ data: { id: 'task' }, error: null });
  mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) });
  mockUpdate.mockReturnValue(query);
  mockEq.mockReturnValue(query);
});

it('sets the company from the authenticated owner when creating a task', async () => {
  await tasksApi.create({ title: 'Install kitchen' });
  expect(mockInsert).toHaveBeenCalledWith({ title: 'Install kitchen', company_id: 'organization-owner' });
});
it('overrides forged organization IDs on task creation', async () => {
  await tasksApi.create({ title: 'Install kitchen', company_id: 'other-organization' });
  expect(mockInsert).toHaveBeenCalledWith({ title: 'Install kitchen', company_id: 'organization-owner' });
});
it('does not allow changing organization ownership when editing a task', async () => {
  await tasksApi.update('task', { title: 'Paint walls', company_id: 'other-organization' });
  expect(mockUpdate).toHaveBeenCalledWith({ title: 'Paint walls' });
  expect(mockEq).toHaveBeenCalledWith('company_id', 'organization-owner');
});
it('does not send a task insert when signed out', async () => {
  mockGetUser.mockResolvedValue({ data: { user: null } });
  await expect(tasksApi.create({ title: 'Paint walls' })).rejects.toThrow('Not authenticated');
  expect(mockInsert).not.toHaveBeenCalled();
});
