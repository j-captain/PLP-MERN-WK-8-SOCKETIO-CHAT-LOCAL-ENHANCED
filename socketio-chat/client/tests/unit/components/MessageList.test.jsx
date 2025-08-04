import { render, screen } from '@testing-library/react';
import UserList from '../../../src/components/UserList';

test('displays active users', () => {
  const users = ['Alice', 'Bob'];
  render(<UserList users={users} />);
  
  expect(screen.getByText('Active Users (2)')).toBeInTheDocument();
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('Bob')).toBeInTheDocument();
});