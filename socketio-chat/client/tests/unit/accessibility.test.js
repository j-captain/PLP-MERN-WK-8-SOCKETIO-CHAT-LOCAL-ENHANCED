// For accessibility testing using jest-exe
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import App from '../../src/App';

describe('Accessibility', () => {
  test('App should have no accessibility violations', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});