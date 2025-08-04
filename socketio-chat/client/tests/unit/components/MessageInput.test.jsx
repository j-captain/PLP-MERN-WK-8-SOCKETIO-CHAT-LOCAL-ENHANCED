import { render, screen } from '@testing-library/react';
import MessageList from '../../../src/components/MessageList';

describe('MessageList', () => {
  const messages = [
    {
      sender: { username: 'Alice' },
      content: 'Hello there',
      createdAt: new Date().toISOString()
    },
    {
      sender: { username: 'Bob' },
      content: 'Hi Alice!',
      createdAt: new Date().toISOString()
    }
  ];

  test('renders messages with sender and timestamp', () => {
    render(<MessageList messages={messages} />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Hi Alice!')).toBeInTheDocument();
  });

  test('renders empty state', () => {
    render(<MessageList messages={[]} />);
    expect(screen.queryByTestId('message')).not.toBeInTheDocument();
  });
});