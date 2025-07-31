import { render, screen } from '@testing-library/react';
import Message from '../../src/components/Message';

describe('Message Component', () => {
  test('displays message content correctly', () => {
    const mockMessage = {
      user: 'testUser',
      text: 'Test message',
      time: '10:00 AM'
    };
    
    render(<Message message={mockMessage} />);
    expect(screen.getByText('testUser')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
  });
});