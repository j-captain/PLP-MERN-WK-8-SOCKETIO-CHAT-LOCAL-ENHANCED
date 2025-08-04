import React from 'react';
import { render } from '@testing-library/react';
import { io } from 'socket.io-client';
import main from '../../src/main';

jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  };
  return jest.fn(() => mockSocket);
});

describe('main.jsx', () => {
  beforeAll(() => {
    // Mock ReactDOM.createRoot
    global.document.getElementById = jest.fn(() => ({
      appendChild: jest.fn()
    }));
  });

  it('creates socket connection with correct configuration', () => {
    process.env.VITE_SERVER_URL = 'https://test-server.com';
    jest.isolateModules(() => {
      require('../../src/main');
    });

    expect(io).toHaveBeenCalledWith('https://test-server.com', {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket']
    });
  });

  it('uses default URL when VITE_SERVER_URL is not set', () => {
    delete process.env.VITE_SERVER_URL;
    jest.isolateModules(() => {
      require('../../src/main');
    });

    expect(io).toHaveBeenCalledWith(
      'https://plp-mern-wk-5-web-sockets-1.onrender.com',
      expect.any(Object)
    );
  });

  it('sets up development logging in dev environment', () => {
    process.env.NODE_ENV = 'development';
    jest.isolateModules(() => {
      require('../../src/main');
    });

    const mockSocket = io();
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
  });

  it('renders App with SocketContext provider', () => {
    const { container } = render(
      <React.StrictMode>
        <SocketContext.Provider value={io()}>
          <App />
        </SocketContext.Provider>
      </React.StrictMode>
    );
    
    expect(container).toBeInTheDocument();
  });
});