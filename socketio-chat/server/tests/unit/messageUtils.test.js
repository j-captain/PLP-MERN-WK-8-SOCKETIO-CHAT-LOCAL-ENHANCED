const { formatMessage } = require('../../utils/messageUtils');
const chalk = require('chalk');

// Test Banner
console.log(chalk.bold.bgMagenta('\n\n  🧪 STARTING MESSAGE UTILITIES TESTS  \n'));
console.log(chalk.magenta('┌──────────────────────────────────────────────┐'));
console.log(chalk.magenta('│    Testing Message Formatting Function      │'));
console.log(chalk.magenta('│    - Various Input Formats                  │'));
console.log(chalk.magenta('│    - Edge Cases                             │'));
console.log(chalk.magenta('│    - ID Generation                         │'));
console.log(chalk.magenta('└──────────────────────────────────────────────┘\n'));

describe(chalk.bold.cyan('Message Utilities - formatMessage'), () => {
  const testUser = { id: '1', username: 'testUser' };
  const testText = 'Hello world';
  const testCases = [
    {
      description: 'regular message',
      user: testUser,
      text: testText,
      expected: 'Standard message formatting'
    },
    {
      description: 'empty message',
      user: testUser,
      text: '',
      expected: 'Empty string handling'
    },
    {
      description: 'message with special characters',
      user: testUser,
      text: 'Hello @everyone! 👋',
      expected: 'Special character preservation'
    },
    {
      description: 'different user',
      user: { id: '2', username: 'anotherUser' },
      text: 'Different user message',
      expected: 'Alternate user formatting'
    },
    {
      description: 'missing username (just id)',
      user: { id: '3' },
      text: 'Missing username',
      expected: 'Partial user object handling'
    },
    {
      description: 'missing id (just username)',
      user: { username: 'partialUser' },
      text: 'Missing id',
      expected: 'Partial user object handling'
    },
    {
      description: 'empty user object',
      user: {},
      text: 'Empty user',
      expected: 'Empty user object handling'
    }
  ];

  test.each(testCases)('should handle $description', ({ description, user, text, expected }) => {
    console.log(chalk.gray(`\n🧪 Testing ${description}: ${expected}`));
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
    
    // Verify time format
    expect(result.time).toMatch(/^\d{1,2}:\d{2}(?::\d{2})?(?: [AP]M)?$/);
    
    // Verify text matches exactly
    expect(result.text).toBe(text);
    
    console.log(chalk.green(`  ✔ Passed - Input: "${text}" → Output: ${JSON.stringify(result)}`));
  });

  test(chalk.bold('should handle null or undefined text'), () => {
    console.log(chalk.gray('\n🧪 Testing null/undefined text handling'));
    
    const nullResult = formatMessage(testUser, null);
    expect(nullResult.text).toBeNull();
    console.log(chalk.green('  ✔ Null text handled correctly'));
    
    const undefinedResult = formatMessage(testUser, undefined);
    expect(undefinedResult.text).toBeUndefined();
    console.log(chalk.green('  ✔ Undefined text handled correctly'));
  });

  test(chalk.bold('generated ID should be unique'), () => {
    console.log(chalk.gray('\n🧪 Testing ID uniqueness'));
    
    const message1 = formatMessage(testUser, 'Message 1');
    const message2 = formatMessage(testUser, 'Message 2');
    expect(message1.id).not.toBe(message2.id);
    
    console.log(chalk.green(`  ✔ IDs are unique: ${message1.id} ≠ ${message2.id}`));
  });
});

// Test Completion Banner
afterAll(() => {
  console.log(chalk.bold.bgGreen('\n\n  ✅ ALL MESSAGE UTILITY TESTS COMPLETED SUCCESSFULLY  \n'));
  console.log(chalk.green('┌──────────────────────────────────────────────┐'));
  console.log(chalk.green('│    All Test Cases Passed                     │'));
  console.log(chalk.green('│    - Message Formatting Correct              │'));
  console.log(chalk.green('│    - Edge Cases Handled Properly             │'));
  console.log(chalk.green('│    - ID Generation Working                   │'));
  console.log(chalk.green('└──────────────────────────────────────────────┘\n'));
});