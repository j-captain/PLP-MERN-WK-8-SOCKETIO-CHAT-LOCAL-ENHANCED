const { formatMessage } = require('../../utils/messageUtils');

describe('Message Utilities - formatMessage', () => {
  const testUser = { id: '1', username: 'testUser' };
  const testText = 'Hello world';
  const testCases = [
    {
      description: 'regular message',
      user: testUser,
      text: testText
    },
    {
      description: 'empty message',
      user: testUser,
      text: ''
    },
    {
      description: 'message with special characters',
      user: testUser,
      text: 'Hello @everyone! 👋'
    },
    {
      description: 'different user',
      user: { id: '2', username: 'anotherUser' },
      text: 'Different user message'
    },
    {
      description: 'missing username (just id)',
      user: { id: '3' },
      text: 'Missing username'
    },
    {
      description: 'missing id (just username)',
      user: { username: 'partialUser' },
      text: 'Missing id'
    },
    {
      description: 'empty user object',
      user: {},
      text: 'Empty user'
    }
  ];

  test.each(testCases)('should handle $description', ({ user, text }) => {
    const result = formatMessage(user, text);
    
    // Verify basic structure
    expect(result).toEqual(expect.objectContaining({
      id: expect.any(String),
      user: user.username || undefined,
      text: text,
      time: expect.any(String)
    }));
    
    // Verify ID is not empty
    expect(result.id).toBeTruthy();
    
    // Verify time format (accepts both 12-hour and 24-hour formats)
    expect(result.time).toMatch(/^\d{1,2}:\d{2}(?::\d{2})?(?: [AP]M)?$/);
    
    // Verify text matches exactly
    expect(result.text).toBe(text);
  });

  test('should handle null or undefined text', () => {
    const nullResult = formatMessage(testUser, null);
    expect(nullResult.text).toBeNull();
    
    const undefinedResult = formatMessage(testUser, undefined);
    expect(undefinedResult.text).toBeUndefined();
  });

  test('generated ID should be unique', () => {
    const message1 = formatMessage(testUser, 'Message 1');
    const message2 = formatMessage(testUser, 'Message 2');
    expect(message1.id).not.toBe(message2.id);
  });
});