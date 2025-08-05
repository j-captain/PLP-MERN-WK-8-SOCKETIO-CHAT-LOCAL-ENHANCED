// Mock CSS imports first to prevent Jest errors
jest.mock('../../../src/styles/ChatPage.css', () => ({}));

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatPage from '../../../src/pages/ChatPage';
import { useSocket } from '../../../src/context/SocketContext';

// Enhanced SocketContext mock with TypeScript-like typing for better autocompletion
jest.mock('../../../src/context/SocketContext', () => ({
  useSocket: jest.fn(() => ({
    socket: {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    },
    isConnected: true,
    deleteMessage: jest.fn(),
    deletionState: {},
  })),
}));

describe('ChatPage Component', () => {
  const mockOnLogout = jest.fn();
  const username = 'testuser';
  let mockSocket;
  let mockMessageHandler;
  let mockRoomJoinedHandler;
  let mockTypingHandler;
  let mockRoomListHandler;

  beforeEach(() => {
    mockSocket = {
      emit: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'message') mockMessageHandler = callback;
        if (event === 'roomJoined') mockRoomJoinedHandler = callback;
        if (event === 'typing') mockTypingHandler = callback;
        if (event === 'roomList') mockRoomListHandler = callback;
      }),
      off: jest.fn(),
    };

    useSocket.mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      deleteMessage: jest.fn(),
      deletionState: {},
    });

    // Mock browser APIs
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should render without crashing and show user info', () => {
    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    
    expect(screen.getByRole('heading', { name: /chat rooms/i })).toBeInTheDocument();
    expect(screen.getByText(`${username} (You)`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('should display room list when received from socket', async () => {
    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    
    act(() => {
      mockRoomListHandler([{ name: 'general', userCount: 3 }]);
    });

    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should automatically join the first room', async () => {
    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    
    act(() => {
      mockRoomListHandler([{ name: 'general', userCount: 3 }]);
    });

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('joinRoom', {
        roomName: 'general',
        username
      });
    });
  });

  it('should display incoming messages correctly', async () => {
    render(<ChatPage username={username} onLogout={mockOnLogout} />);

    // First simulate joining a room
    act(() => {
      mockRoomJoinedHandler({ name: 'general' });
    });

    const testMessages = [
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

    // Simulate receiving messages
    act(() => {
      testMessages.forEach(msg => mockMessageHandler(msg));
    });

    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('otheruser')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('should send message when Enter is pressed', async () => {
    render(<ChatPage username={username} onLogout={mockOnLogout} />);

    // Simulate joining a room first
    act(() => {
      mockRoomJoinedHandler({ name: 'general' });
    });

    const messageInput = screen.getByPlaceholderText(/message in general/i);
    fireEvent.change(messageInput, { target: { value: 'New message' } });
    fireEvent.keyPress(messageInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(mockSocket.emit).toHaveBeenCalledWith('sendMessage', {
      content: 'New message'
    });
    expect(messageInput).toHaveValue('');
  });

  it('should show context menu on message right-click', async () => {
    render(<ChatPage username={username} onLogout={mockOnLogout} />);

    // Simulate joining a room first
    act(() => {
      mockRoomJoinedHandler({ name: 'general' });
    });

    const testMessage = { 
      _id: '1', 
      content: 'Test message', 
      username: 'otheruser', 
      time: new Date(), 
      room: 'general' 
    };

    // Simulate receiving message
    act(() => {
      mockMessageHandler(testMessage);
    });

    const messageElement = screen.getByText('Test message');
    fireEvent.contextMenu(messageElement);

    expect(screen.getByText(/delete for me/i)).toBeInTheDocument();
    expect(screen.getByText(/delete for everyone/i)).toBeInTheDocument();
  });

  it('should trigger logout when Sign Out is clicked', () => {
    render(<ChatPage username={username} onLogout={mockOnLogout} />);
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(mockOnLogout).toHaveBeenCalled();
  });

  // it('should show and hide typing indicator', async () => {
  //   render(<ChatPage username={username} onLogout={mockOnLogout} />);

  //   // Simulate joining a room first
  //   act(() => {
  //     mockRoomJoinedHandler({ name: 'general' });
  //   });

  //   // Simulate typing event
  //   act(() => {
  //     mockTypingHandler({ 
  //       username: 'otheruser', 
  //       room: 'general',
  //       isTyping: true 
  //     });
  //   });

    // Check for typing indicator using flexible matching
  //   const typingIndicator = await screen.findByText(/otheruser.*typing/i);
  //   expect(typingIndicator).toBeInTheDocument();

  //   // Advance timers to hide the indicator
  //   act(() => {
  //     jest.advanceTimersByTime(3000);
  //   });

  //   expect(screen.queryByText(/otheruser.*typing/i)).not.toBeInTheDocument();
  // });

  it('should handle room switching', async () => {
    render(<ChatPage username={username} onLogout={mockOnLogout} />);

    // Simulate receiving room list with multiple rooms
    act(() => {
      mockRoomListHandler([
        { name: 'general', userCount: 3 },
        { name: 'random', userCount: 2 }
      ]);
    });

    // Click on the 'random' room
    fireEvent.click(screen.getByText('random'));

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('joinRoom', {
        roomName: 'random',
        username
      });
    });
  });
});