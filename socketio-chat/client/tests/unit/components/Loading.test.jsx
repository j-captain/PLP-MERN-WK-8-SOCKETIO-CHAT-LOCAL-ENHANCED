import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '../../../src/components/LoginForm';

test('submits credentials', () => {
  const mockSubmit = jest.fn();
  render(<LoginForm onSubmit={mockSubmit} />);
  
  fireEvent.change(screen.getByLabelText(/username/i), { 
    target: { value: 'testuser' } 
  });
  fireEvent.change(screen.getByLabelText(/password/i), { 
    target: { value: 'password123' } 
  });
  fireEvent.click(screen.getByText(/login/i));
  
  expect(mockSubmit).toHaveBeenCalledWith({
    username: 'testuser',
    password: 'password123'
  });
});