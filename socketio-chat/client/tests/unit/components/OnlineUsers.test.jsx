import { render, screen, fireEvent } from '@testing-library/react';
import OnlineUsers from '../../../src/components/OnlineUsers';
import { useSocket } from '../../../src/context/SocketContext';

jest.mock('../../../src/context/SocketContext');

describe('OnlineUsers', () => {
  const mockOnSelect = jest.fn();
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn()
  };

  beforeEach(() => {
    useSocket.mockReturnValue(mockSocket);
  });

  test('renders user list', () => {
    const users = [
      { _id: '1', username: 'Alice', online: true },
      { _id: '2', username: 'Bob', online: false }
    ];
    
    // Simulate socket.io event
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'user_list') callback(users);
    });

    render(<OnlineUsers onSelectUser={mockOnSelect} />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  test('handles user selection', () => {
    const users = [{ _id: '123', username: 'Alice', online: true }];
    mockSocket.on.mockImplementation((event, callback) => callback(users));

    render(<OnlineUsers onSelectUser={mockOnSelect} />);
    fireEvent.click(screen.getByText('Alice'));
    
    expect(mockOnSelect).toHaveBeenCalledWith('123');
  });
});