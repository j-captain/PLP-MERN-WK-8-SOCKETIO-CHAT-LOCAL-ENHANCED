import { render, screen } from '@testing-library/react';
import Loading from '../../../src/components/Loading';

describe('Loading Component', () => {
  test('renders default loading spinner and message', () => {
    render(<Loading />);
    
    // Check for the spinner element
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
    
    // Check for default visible message
    expect(screen.getByText('Loading...', { selector: 'p' })).toBeInTheDocument();
    
    // Check for visually hidden text
    expect(screen.getByText('Loading...', { selector: '.sr-only' })).toBeInTheDocument();
  });

  test('renders custom message when provided', () => {
    const customMessage = 'Please wait...';
    render(<Loading message={customMessage} />);
    
    // Check for custom visible message
    expect(screen.getByText(customMessage, { selector: 'p' })).toBeInTheDocument();
    // Should not show default visible message
    expect(screen.queryByText('Loading...', { selector: 'p' })).not.toBeInTheDocument();
    // Screen reader text should still be present
    expect(screen.getByText('Loading...', { selector: '.sr-only' })).toBeInTheDocument();
  });

  test('has proper accessibility attributes', () => {
    render(<Loading />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
    expect(spinner).toHaveAttribute('aria-busy', 'true');
  });
});