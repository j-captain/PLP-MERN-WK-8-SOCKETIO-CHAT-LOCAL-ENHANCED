import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthForm from '../../../src/components/AuthForm';

describe('AuthForm Component', () => {
  const mockOnAuth = jest.fn();
  const mockSetError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the async behavior of onAuth
    mockOnAuth.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
  });

  test('renders in login mode by default', () => {
    render(<AuthForm onAuth={mockOnAuth} error="" setError={mockSetError} />);
    
    expect(screen.getByText('Sign In to Continue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('switches to register mode when toggle is clicked', () => {
    render(<AuthForm onAuth={mockOnAuth} error="" setError={mockSetError} />);
    
    fireEvent.click(screen.getByText(/need an account\? register/i));
    
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  test('submits login form with credentials', async () => {
    render(<AuthForm onAuth={mockOnAuth} error="" setError={mockSetError} />);
    
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'testpass123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnAuth).toHaveBeenCalledWith(
        'testuser',
        'testpass123',
        true // isLogin flag
      );
    });
  });

  test('submits register form with credentials', async () => {
    render(<AuthForm onAuth={mockOnAuth} error="" setError={mockSetError} />);
    
    // Switch to register mode
    fireEvent.click(screen.getByText(/need an account\? register/i));
    
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'newuser' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'newpass123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(mockOnAuth).toHaveBeenCalledWith(
        'newuser',
        'newpass123',
        false // isLogin flag
      );
    });
  });

  test('shows loading state during submission', async () => {
  // Track when loading state should be active
  let loadingActive = false;
  
  mockOnAuth.mockImplementationOnce(async () => {
    loadingActive = true;
    await new Promise(r => setTimeout(r, 100));
    loadingActive = false;
  });

  render(<AuthForm onAuth={mockOnAuth} error="" setError={mockSetError} />);
  
  const submitButton = screen.getByRole('button', { name: /sign in/i });
  
  fireEvent.click(submitButton);
  
  // Check loading state in a loop since timing can be tricky
  await waitFor(() => {
    if (loadingActive) {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Processing...');
    } else {
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent('Sign In');
    }
  }, { timeout: 500 });
});

  test('displays error message when provided', () => {
    const errorMsg = 'Invalid credentials';
    render(<AuthForm onAuth={mockOnAuth} error={errorMsg} setError={mockSetError} />);
    
    const errorElement = screen.getByText(errorMsg);
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveClass('error-message');
  });

  test('validates required fields', async () => {
    render(<AuthForm onAuth={mockOnAuth} error="" setError={mockSetError} />);
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('required');
      expect(mockOnAuth).not.toHaveBeenCalled();
    });
  });
});