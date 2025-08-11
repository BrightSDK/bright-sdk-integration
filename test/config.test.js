const fs = require('fs');
const path = require('path');

describe('Configuration Loading', () => {
  const configPath = path.join(__dirname, '..', 'config.json');

  beforeEach(() => {
    // Clear require cache to ensure fresh imports
    delete require.cache[require.resolve('../src/platforms.js')];
  });

  test('should load configuration from config.json', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    expect(config).toHaveProperty('urls');
    expect(config).toHaveProperty('files');
    expect(config).toHaveProperty('defaults');

    expect(config.urls).toHaveProperty('helper_latest');
    expect(config.urls).toHaveProperty('sdk_versions');
    expect(config.files).toHaveProperty('helper_name');
    expect(config.files).toHaveProperty('api_name');
  });

  test('should have valid URLs in configuration', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    expect(config.urls.helper_latest).toMatch(/^https:\/\//);
    expect(config.urls.sdk_versions).toMatch(/^https:\/\//);
    expect(config.urls.helper_latest).toContain('githubusercontent.com');
  });

  test('should have reasonable default values', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    expect(config.files.helper_name).toBe('brd_api.helper.js');
    expect(config.files.api_name).toBe('brd_api.js');
    expect(config.defaults.use_helper).toBe(true);
  });
});
