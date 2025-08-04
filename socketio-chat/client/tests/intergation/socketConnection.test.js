import { renderHook } from '@testing-library/react-hooks';
import { useSocket } from '../../hooks/useSocket';
import { Server } from 'mock-socket';

describe('Socket Connection', () => {
  let mockServer;
  const URL = 'ws://localhost:5000';

  beforeAll(() => {
    mockServer = new Server(URL);
  });

  afterAll(() => {
    mockServer.stop();
  });

  test('connects to socket server', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useSocket(URL));
    await waitForNextUpdate();
    expect(result.current.isConnected).toBe(true);
  });
});