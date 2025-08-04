import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocketProvider } from '../../context/SocketContext';
import ChatPage from '../../pages/ChatPage';

describe('Chat Connection', () => {
  test('establishes socket connection and sends messages', async () => {
    render(
      <SocketProvider>
        <ChatPage />
      </SocketProvider>
    );

    // Test connection
    await waitFor(() => {
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    // Test message sending
    const testMessage = 'Integration test message';
    await userEvent.type(screen.getByPlaceholderText('Type a message...'), testMessage);
    await userEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText(testMessage)).toBeInTheDocument();
    });
  });
});