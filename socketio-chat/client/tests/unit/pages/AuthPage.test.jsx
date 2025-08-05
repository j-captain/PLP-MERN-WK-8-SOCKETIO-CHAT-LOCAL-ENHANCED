import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPage from '../../../src/pages/Authpage'; // Update this path if needed
import AuthForm from '../../../src/components/AuthForm'; 
import '@testing-library/jest-dom';

// Mock the AuthForm component
jest.mock('../../../src/components/AuthForm', () => {
  return function MockAuthForm({ onAuth, error, setError }) {
    return (
      <div>
        <button 
          onClick={() => onAuth('testuser', 'password', true)}
          data-testid="login-button"
        >
          Login
        </button>
        <button 
          onClick={() => onAuth('testuser', 'password', false)}
          data-testid="register-button"
        >
          Register
        </button>
        {error && <div data-testid="error-message">{error}</div>}
      </div>
    );
  };
});

describe('AuthPage', () => {
  const mockOnAuthSuccess = jest.fn();

  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AuthPage onAuthSuccess={mockOnAuthSuccess} />);
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
    expect(screen.getByTestId('register-button')).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    render(<AuthPage onAuthSuccess={mockOnAuthSuccess} />);
    
    fireEvent.click(screen.getByTestId('login-button'));
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password' }),
        credentials: 'include'
      });
      expect(mockOnAuthSuccess).toHaveBeenCalledWith('testuser');
    });
  });

  it('handles successful registration', async () => {
    render(<AuthPage onAuthSuccess={mockOnAuthSuccess} />);
    
    fireEvent.click(screen.getByTestId('register-button'));
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password' }),
        credentials: 'include'
      });
      expect(mockOnAuthSuccess).toHaveBeenCalledWith('testuser');
    });
  });

  it('handles authentication error', async () => {
    const errorMessage = 'Invalid credentials';
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        text: () => Promise.resolve(errorMessage),
      })
    );

    render(<AuthPage onAuthSuccess={mockOnAuthSuccess} />);
    
    fireEvent.click(screen.getByTestId('login-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
      expect(mockOnAuthSuccess).not.toHaveBeenCalled();
    });
  });
});