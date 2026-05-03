const fs = require('fs');
const os = require('os');
const path = require('path');
const lib_xcode = require('../src/lib_xcode.js');

const FIXTURE_PBXPROJ = path.join(__dirname, 'fixtures', 'test.xcodeproj', 'project.pbxproj');

function make_tmp_pbxproj() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xcode-test-'));
    const pbxproj = path.join(dir, 'project.pbxproj');
    fs.copyFileSync(FIXTURE_PBXPROJ, pbxproj);
    return {dir, pbxproj};
}

describe('lib_xcode', () => {
    describe('find_xcodeproj', () => {
        test('finds .xcodeproj inside workdir', () => {
            const fixtures_dir = path.join(__dirname, 'fixtures');
            const found = lib_xcode.find_xcodeproj(fixtures_dir, []);
            expect(found.length).toBe(1);
            expect(found[0]).toMatch(/test\.xcodeproj$/);
        });

        test('respects excludes list', () => {
            const fixtures_dir = path.join(__dirname, 'fixtures');
            const xcodeproj = path.join(fixtures_dir, 'test.xcodeproj');
            const found = lib_xcode.find_xcodeproj(fixtures_dir, [xcodeproj]);
            expect(found.length).toBe(0);
        });

        test('returns empty array when no project exists', () => {
            const found = lib_xcode.find_xcodeproj(os.tmpdir(), []);
            expect(found.every(p => !p.endsWith('test.xcodeproj'))).toBe(true);
        });
    });

    describe('open_project', () => {
        test('parses project without error', () => {
            const project = lib_xcode.open_project(FIXTURE_PBXPROJ);
            expect(project).toBeDefined();
            expect(project.getFirstTarget()).toBeDefined();
        });

        test('initializes missing PBXBuildFile section', () => {
            const project = lib_xcode.open_project(FIXTURE_PBXPROJ);
            expect(project.pbxBuildFileSection()).toBeDefined();
        });
    });

    describe('add_framework_embed_sign', () => {
        test('adds xcframework reference to pbxproj', () => {
            const {pbxproj} = make_tmp_pbxproj();
            const project = lib_xcode.open_project(pbxproj);

            const added = lib_xcode.add_framework_embed_sign(project, 'BrightSDK/brdsdk.xcframework');
            lib_xcode.save_project(pbxproj, project);

            expect(added).toBe(true);
            const content = fs.readFileSync(pbxproj, 'utf-8');
            expect(content).toContain('brdsdk.xcframework');
        });

        test('is idempotent — returns false on second call', () => {
            const {pbxproj} = make_tmp_pbxproj();
            const project = lib_xcode.open_project(pbxproj);

            const first = lib_xcode.add_framework_embed_sign(project, 'BrightSDK/brdsdk.xcframework');
            const second = lib_xcode.add_framework_embed_sign(project, 'BrightSDK/brdsdk.xcframework');

            expect(first).toBe(true);
            expect(second).toBe(false);
        });
    });

    describe('set_build_setting', () => {
        test('writes build setting to all configurations', () => {
            const {pbxproj} = make_tmp_pbxproj();
            const project = lib_xcode.open_project(pbxproj);

            lib_xcode.set_build_setting(project, 'FRAMEWORK_SEARCH_PATHS', '"$(inherited)" BrightSDK');
            lib_xcode.save_project(pbxproj, project);

            const content = fs.readFileSync(pbxproj, 'utf-8');
            expect(content).toContain('FRAMEWORK_SEARCH_PATHS');
        });
    });

    describe('add_copy_files_phase', () => {
        test('adds a PBXCopyFilesBuildPhase entry', () => {
            const {pbxproj} = make_tmp_pbxproj();
            const project = lib_xcode.open_project(pbxproj);

            const added = lib_xcode.add_copy_files_phase(
                project,
                ['BrightSDK/net_updater.app'],
                'Copy net_updater.app',
                'wrapper',
                'Contents/Library/LoginItems'
            );
            lib_xcode.save_project(pbxproj, project);

            expect(added).toBe(true);
            const content = fs.readFileSync(pbxproj, 'utf-8');
            expect(content).toContain('Copy net_updater.app');
            expect(content).toContain('LoginItems');
        });

        test('is idempotent — second call returns false', () => {
            const {pbxproj} = make_tmp_pbxproj();
            const project = lib_xcode.open_project(pbxproj);

            const first = lib_xcode.add_copy_files_phase(project, [], 'Copy net_updater.app', 'wrapper', '');
            const second = lib_xcode.add_copy_files_phase(project, [], 'Copy net_updater.app', 'wrapper', '');

            expect(first).toBe(true);
            expect(second).toBe(false);
        });
    });

    describe('add_shell_script_phase', () => {
        test('adds a PBXShellScriptBuildPhase entry', () => {
            const {pbxproj} = make_tmp_pbxproj();
            const project = lib_xcode.open_project(pbxproj);

            const added = lib_xcode.add_shell_script_phase(project, 'Resign net_updater.app', {
                shellPath: '/bin/sh',
                shellScript: 'echo resign',
                inputPaths: [],
                outputPaths: [],
            });
            lib_xcode.save_project(pbxproj, project);

            expect(added).toBe(true);
            const content = fs.readFileSync(pbxproj, 'utf-8');
            expect(content).toContain('Resign net_updater.app');
        });

        test('is idempotent — second call returns false', () => {
            const {pbxproj} = make_tmp_pbxproj();
            const project = lib_xcode.open_project(pbxproj);

            const first = lib_xcode.add_shell_script_phase(project, 'Resign net_updater.app', {shellPath: '/bin/sh', shellScript: 'x'});
            const second = lib_xcode.add_shell_script_phase(project, 'Resign net_updater.app', {shellPath: '/bin/sh', shellScript: 'x'});

            expect(first).toBe(true);
            expect(second).toBe(false);
        });
    });
});
