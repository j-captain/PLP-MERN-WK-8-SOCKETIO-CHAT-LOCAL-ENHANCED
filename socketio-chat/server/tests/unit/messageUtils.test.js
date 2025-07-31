const { formatMessage } = require('../../utils/messageUtils');

describe('Message Utilities', () => {
  test('formatMessage creates correct message object', () => {
    const user = { id: '1', username: 'testUser' };
    const text = 'Hello world';
    const result = formatMessage(user, text);
    
    expect(result).toHaveProperty('id');
    expect(result.user).toEqual('testUser');
    expect(result.text).toBe('Hello world');
    // Updated to accept both 12-hour and 24-hour formats
    expect(result.time).toMatch(/\d{1,2}:\d{2}( [AP]M)?/);
  });
});