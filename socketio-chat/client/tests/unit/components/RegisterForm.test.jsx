import { render, screen, fireEvent } from '@testing-library/react';
import RegisterForm from '../../../src/components/RegisterForm';

describe('RegisterForm', () => {
  const mockSuccess = jest.fn();
  const mockCancel = jest.fn();

  test('submits registration data', () => {
    render(<RegisterForm onSuccess={mockSuccess} onCancel={mockCancel} />);
    
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'newuser' }
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByText('Register'));

    expect(mockSuccess).toHaveBeenCalled();
  });

  test('shows error message', () => {
    render(<RegisterForm onSuccess={mockSuccess} onCancel={mockCancel} />);
    
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'short' }
    });
    fireEvent.click(screen.getByText('Register'));

    expect(screen.getByText(/must be at least 6 characters/i)).toBeInTheDocument();
  });

  test('handles cancel', () => {
    render(<RegisterForm onSuccess={mockSuccess} onCancel={mockCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCancel).toHaveBeenCalled();
  });
});