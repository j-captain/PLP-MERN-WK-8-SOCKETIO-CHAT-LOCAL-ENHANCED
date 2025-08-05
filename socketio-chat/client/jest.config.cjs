module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@context/(.*)$': '<rootDir>/src/context/$1',  // Alias for context imports
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',      // Alias for pages imports
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  verbose: true,
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};