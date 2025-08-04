// tests/unit/context/SocketContext.test.js
import React from 'react';
import { render, act } from '@testing-library/react';
import { io } from 'socket.io-client';
import { SocketProvider, useSocket } from '../../../src/context/SocketContext';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    auth: {},
    withCredentials: true
  };
  return {
    io: jest.fn(() => mockSocket)
  };
});

// Test component to consume the context
const TestComponent = () => {
  const { socket, isConnected, deleteMessage, deletionState } = useSocket();
  return (
    <div>
      <div data-testid="socket">{socket ? 'socket-exists' : 'no-socket'}</div>
      <div data-testid="connected">{isConnected ? 'connected' : 'disconnected'}</div>
      <div data-testid="deletion-state">{JSON.stringify(deletionState)}</div>
      <button onClick={() => deleteMessage('123', true)} data-testid="delete-button">
        Delete Message
      </button>
    </div>
  );
};

describe('SocketContext', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn((event, data, callback) => {
        if (event === 'deleteMessage') {
          callback({}); // Simulate successful deletion
        }
      }),
      disconnect: jest.fn(),
      auth: {},
      withCredentials: true
    };
    io.mockImplementation(() => mockSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not create socket without username', () => {
    render(
      <SocketProvider username={null}>
        <TestComponent />
      </SocketProvider>
    );

    expect(io).not.toHaveBeenCalled();
    expect(screen.getByTestId('socket')).toHaveTextContent('no-socket');
  });

  it('should create socket connection with username', () => {
    render(
      <SocketProvider username="testuser">
        <TestComponent />
      </SocketProvider>
    );

    expect(io).toHaveBeenCalledWith('http://localhost:5000', {
      auth: { username: 'testuser' },
      withCredentials: true
    });
    expect(screen.getByTestId('socket')).toHaveTextContent('socket-exists');
  });

  it('should update connection status', () => {
    render(
      <SocketProvider username="testuser">
        <TestComponent />
      </SocketProvider>
    );

    // Simulate connection events
    act(() => {
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();
    });
    expect(screen.getByTestId('connected')).toHaveTextContent('connected');

    act(() => {
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
      disconnectHandler();
    });
    expect(screen.getByTestId('connected')).toHaveTextContent('disconnected');
  });

  it('should handle message deletion', async () => {
    render(
      <SocketProvider username="testuser">
        <TestComponent />
      </SocketProvider>
    );

    fireEvent.click(screen.getByTestId('delete-button'));

    // Verify deletion state changes
    expect(JSON.parse(screen.getByTestId('deletion-state').textContent).toMatchObject({
      inProgress: true,
      error: null,
      success: false
    }));

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('deletion-state').textContent).toMatchObject({
        inProgress: false,
        error: null,
        success: true
      }));
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'deleteMessage',
      { messageId: '123', deleteForEveryone: true },
      expect.any(Function)
    );
  });

  it('should handle deletion errors', async () => {
    mockSocket.emit.mockImplementationOnce((event, data, callback) => {
      if (event === 'deleteMessage') {
        callback({ error: 'Deletion failed' });
      }
    });

    render(
      <SocketProvider username="testuser">
        <TestComponent />
      </SocketProvider>
    );

    fireEvent.click(screen.getByTestId('delete-button'));

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('deletion-state').textContent).toMatchObject({
        inProgress: false,
        error: 'Deletion failed',
        success: false
      }));
    });
  });

  it('should clean up socket on unmount', () => {
    const { unmount } = render(
      <SocketProvider username="testuser">
        <TestComponent />
      </SocketProvider>
    );

    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});