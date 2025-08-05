import { render, screen } from '@testing-library/react';
import MessageList from '../../../src/components/MessageList';

// Mock scrollIntoView
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

describe('MessageList', () => {
  const mockMessages = [
    {
      sender: { username: 'Alice' },
      content: 'Hello there!',
      createdAt: new Date()
    },
    {
      sender: { username: 'Bob' },
      content: 'Hi Alice!',
      createdAt: new Date()
    }
  ];

  test('renders messages correctly', () => {
    render(<MessageList messages={mockMessages} />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Hi Alice!')).toBeInTheDocument();
  });

  test('renders message timestamps', () => {
    render(<MessageList messages={mockMessages} />);
    const timeString = new Date(mockMessages[0].createdAt).toLocaleTimeString();
    expect(screen.getAllByText(timeString)[0]).toBeInTheDocument();
  });
});