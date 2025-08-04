import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatPage from '../../src/pages/ChatPage';
import { useSocket } from '../../src/context/SocketContext';

// Mock the SocketContext
jest.mock('../../src/context/SocketContext', () => ({
  useSocket: jest.fn(),
}));

describe('ChatPage', () => {
  const mockSocket = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };
  const mockOnLogout = jest.fn();
  const username = 'testuser';

  beforeEach(() => {
    useSocket.mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      deleteMessage: jest.fn(),
      deletionState: {},
    });

    // Mock the scrollIntoView method
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    expect(screen.getByText('Chat Rooms')).toBeInTheDocument();
    expect(screen.getByText('testuser (You)')).toBeInTheDocument();
  });

  it('displays room list when received', () => {
    const roomList = [{ name: 'general', userCount: 3 }];
    
    // Mock the socket.on implementation
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'roomList') {
        callback(roomList);
      }
    });

    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    
    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('joins initial room when room list is received', () => {
    const roomList = [{ name: 'general', userCount: 3 }];
    
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'roomList') {
        callback(roomList);
      }
    });

    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('joinRoom', {
      roomName: 'general',
      username
    });
  });

  it('displays messages when received', () => {
    const messages = [
      { 
        _id: '1', 
        content: 'Hello world', 
        username: 'otheruser', 
        time: new Date(), 
        room: 'general' 
      },
      { 
        _id: '2', 
        content: 'Hi there', 
        username, 
        time: new Date(), 
        room: 'general' 
      }
    ];
    
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'message') {
        callback(messages[0]);
      }
    });

    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    
    // Simulate receiving a message
    act(() => {
      mockSocket.on.mock.calls.find(call => call[0] === 'message')[1](messages[0]);
      mockSocket.on.mock.calls.find(call => call[0] === 'message')[1](messages[1]);
    });

    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('otheruser')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('sends message when input is submitted', () => {
    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    
    // Set current room
    act(() => {
      mockSocket.on.mock.calls.find(call => call[0] === 'roomJoined')[1]({ name: 'general' });
    });

    const input = screen.getByPlaceholderText('Message in general...');
    fireEvent.change(input, { target: { value: 'New message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

    expect(mockSocket.emit).toHaveBeenCalledWith('sendMessage', {
      content: 'New message'
    });
  });

  it('shows context menu on message right-click', () => {
    const messages = [{ 
      _id: '1', 
      content: 'Test message', 
      username: 'otheruser', 
      time: new Date(), 
      room: 'general' 
    }];
    
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'message') {
        callback(messages[0]);
      }
    });

    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    
    // Simulate receiving a message
    act(() => {
      mockSocket.on.mock.calls.find(call => call[0] === 'message')[1](messages[0]);
    });

    const messageElement = screen.getByText('Test message');
    fireEvent.contextMenu(messageElement);

    expect(screen.getByText('Delete for me')).toBeInTheDocument();
    expect(screen.getByText('Delete for everyone')).toBeInTheDocument();
  });

  it('handles logout', () => {
    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    
    fireEvent.click(screen.getByText('Sign Out'));
    
    expect(mockOnLogout).toHaveBeenCalled();
  });

  it('displays typing indicator', () => {
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'typing') {
        callback({ username: 'otheruser', room: 'general' });
      }
    });

    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    
    act(() => {
      mockSocket.on.mock.calls.find(call => call[0] === 'typing')[1]({ 
        username: 'otheruser', 
        room: 'general' 
      });
    });

    expect(screen.getByText('otheruser')).toBeInTheDocument();
    expect(screen.getAllByTestId('typing-indicator').length).toBeGreaterThan(0);
  });
});