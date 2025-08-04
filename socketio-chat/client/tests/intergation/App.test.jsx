import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from '../../src/App';
import AuthPage from '../../src/pages/AuthPage';
import ChatPage from '../../src/pages/ChatPage';

// Mock child components
jest.mock('../../src/pages/AuthPage', () => () => <div>AuthPage Mock</div>);
jest.mock('../../src/pages/ChatPage', () => () => <div>ChatPage Mock</div>);

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key]),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('App Component', () => {
  const renderWithRouter = (initialPath = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithRouter();
    expect(screen.getByText('Enhanced SocketIO Chat App')).toBeInTheDocument();
  });

  it('redirects to chat when authenticated', () => {
    localStorage.setItem('chatUser', JSON.stringify({ username: 'testuser' }));
    renderWithRouter();
    expect(screen.getByText('ChatPage Mock')).toBeInTheDocument();
  });

  it('redirects to auth when not authenticated', () => {
    renderWithRouter('/chat');
    expect(screen.getByText('AuthPage Mock')).toBeInTheDocument();
  });

  it('handles authentication flow', async () => {
    // Use actual AuthPage for this test
    jest.unmock('../../src/pages/AuthPage');
    
    renderWithRouter();
    
    // Mock successful auth
    fireEvent.click(screen.getByTestId('login-button'));
    
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'chatUser',
        JSON.stringify({ username: 'testuser' })
      );
      expect(screen.getByText('ChatPage Mock')).toBeInTheDocument();
    });
  });

  it('handles logout', async () => {
    localStorage.setItem('chatUser', JSON.stringify({ username: 'testuser' }));
    renderWithRouter();
    
    fireEvent.click(screen.getByText('Logout'));
    
    await waitFor(() => {
      expect(localStorage.removeItem).toHaveBeenCalledWith('chatUser');
      expect(screen.getByText('AuthPage Mock')).toBeInTheDocument();
    });
  });

  it('displays header and footer', () => {
    renderWithRouter();
    expect(screen.getByText('Enhanced SocketIO Chat App')).toBeInTheDocument();
    expect(screen.getByText(/Made with ❤️ for seamless communication/i)).toBeInTheDocument();
  });
});