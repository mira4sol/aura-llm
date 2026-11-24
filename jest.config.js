module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  transform: {
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo-file-system$': '<rootDir>/jest.mocks/expo-file-system.js',
  },
  transformIgnorePatterns: ['node_modules/(?!(marked)/)'],
};
