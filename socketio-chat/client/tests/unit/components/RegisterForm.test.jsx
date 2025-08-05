import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterForm from '../../../src/components/RegisterForm';

// Mock the fetch API
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true })
  })
);

describe('RegisterForm', () => {
  const mockSuccess = jest.fn();
  const mockCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  test('renders the registration form', () => {
    render(<RegisterForm onSuccess={mockSuccess} onCancel={mockCancel} />);
    
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('submits registration data successfully', async () => {
    render(<RegisterForm onSuccess={mockSuccess} onCancel={mockCancel} />);
    
    // Fill out the form
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'securepassword123' }
    });
    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      // Verify API call was made correctly
      expect(fetch).toHaveBeenCalledWith('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'securepassword123'
        })
      });
      
      // Verify success callback
      expect(mockSuccess).toHaveBeenCalledWith('testuser');
    });

    // Verify loading state was handled
    expect(screen.getByTestId('register-button')).not.toBeDisabled();
  });

  test('shows error message when password is too short', async () => {
    render(<RegisterForm onSuccess={mockSuccess} onCancel={mockCancel} />);
    
    // Fill out form with invalid password
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'short' }
    });
    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      // Check for error message
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Password must be at least 6 characters');
      expect(errorMessage).toHaveClass('text-red-500');
    });

    // Verify no API call was made
    expect(fetch).not.toHaveBeenCalled();
    // Verify button is re-enabled
    expect(screen.getByTestId('register-button')).not.toBeDisabled();
  });

  test('shows API error message when registration fails', async () => {
    // Mock failed API response
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        text: () => Promise.resolve('Username already taken')
      })
    );

    render(<RegisterForm onSuccess={mockSuccess} onCancel={mockCancel} />);
    
    // Fill out form with valid data
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'existinguser' }
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'validpassword123' }
    });
    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      // Check for API error message
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Username already taken');
      expect(errorMessage).toHaveClass('text-red-500');
    });

    // Verify success callback wasn't called
    expect(mockSuccess).not.toHaveBeenCalled();
    // Verify button is re-enabled
    expect(screen.getByTestId('register-button')).not.toBeDisabled();
  });

  test('handles cancel button click', () => {
    render(<RegisterForm onSuccess={mockSuccess} onCancel={mockCancel} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    
    // Verify cancel callback was called
    expect(mockCancel).toHaveBeenCalledTimes(1);
    
    // Verify no API calls were made
    expect(fetch).not.toHaveBeenCalled();
  });

  test('disables register button during submission and re-enables after', async () => {
    // Mock API response with delay
    let resolveFetch;
    const fetchPromise = new Promise(resolve => {
      resolveFetch = resolve;
    });
    fetch.mockImplementationOnce(() => fetchPromise);

    render(<RegisterForm onSuccess={mockSuccess} onCancel={mockCancel} />);
    
    const registerButton = screen.getByTestId('register-button');
    
    // Fill out form
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(registerButton);

    // Button should be disabled during submission
    expect(registerButton).toBeDisabled();
    expect(registerButton).toHaveTextContent('Registering...');

    // Resolve the fetch promise
    resolveFetch({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalled();
    });

    // Button should be re-enabled after submission
    expect(registerButton).not.toBeDisabled();
    expect(registerButton).toHaveTextContent('Register');
  });

  test('shows validation error when both fields are empty', async () => {
    render(<RegisterForm onSuccess={mockSuccess} onCancel={mockCancel} />);
    
    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      // Check for HTML5 validation messages
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      expect(usernameInput).toBeInvalid();
      expect(passwordInput).toBeInvalid();
    });

    // Verify no API call was made
    expect(fetch).not.toHaveBeenCalled();
    // Verify no custom error message is shown (relying on browser validation)
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  test('clears error message when form is edited after error', async () => {
    render(<RegisterForm onSuccess={mockSuccess} onCancel={mockCancel} />);
    
    // Trigger error
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'short' }
    });
    fireEvent.click(screen.getByText('Register'));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    // Fix the password
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'longenoughpassword' }
    });

    // Wait for error to clear
    await waitFor(() => {
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    // Verify we can submit successfully after fixing
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );
    
    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(mockSuccess).toHaveBeenCalled();
    });
  });
});