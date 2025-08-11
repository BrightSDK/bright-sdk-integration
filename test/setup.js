// Test setup file
const fs = require('fs');
const path = require('path');

// Test setup utilities

// Simple mock utilities that don't interfere with Jest's own mocking
const mockFs = () => {
    // This is a placeholder function since we're using jest.mock() instead
    // The actual mocking is done in each test file using jest.mock()
};

const restoreFs = () => {
    // This is a placeholder function since Jest handles mock restoration
    // The actual restoration is done by jest.clearAllMocks() in beforeEach
};

module.exports = {
    mockFs,
    restoreFs,
};
