// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

// Walk `dir` up to `maxDepth` levels deep looking for *.xcodeproj directories.
// Skips paths listed in `excludes` (absolute paths).
const find_xcodeproj = (dir, excludes=[], maxDepth=3)=>{
    const results = [];
    const walk = (current, depth)=>{
        if (depth > maxDepth)
            return;
        let entries;
        try {
            entries = fs.readdirSync(current, {withFileTypes: true});
        } catch(e) {
            return;
        }
        for (const entry of entries)
        {
            const full = path.join(current, entry.name);
            if (excludes.some(ex=>full.startsWith(ex)))
                continue;
            if (entry.isDirectory())
            {
                if (entry.name.endsWith('.xcodeproj'))
                    results.push(full);
                else
                    walk(full, depth+1);
            }
        }
    };
    walk(dir, 0);
    return results;
};

const open_project = pbxproj_path=>{
    const project = xcode.project(pbxproj_path);
    project.parseSync();
    // Newer Xcode projects (16+) using synchronized groups may omit PBXBuildFile.
    // The `xcode` package requires it to exist before calling addFramework.
    const objs = project.hash.project.objects;
    if (!objs['PBXBuildFile'])
        objs['PBXBuildFile'] = {};
    return project;
};

const save_project = (pbxproj_path, project)=>{
    fs.writeFileSync(pbxproj_path, project.writeSync());
};

// Add a framework with Embed & Sign. Idempotent — no-op if already present.
// fw_path: path to framework relative to xcodeproj parent (e.g. 'BrightSDK/brdsdk.xcframework')
const add_framework_embed_sign = (project, fw_path)=>{
    const result = project.addFramework(fw_path, {
        customFramework: true,
        embed: true,
        link: true,
    });
    return result !== false; // false = already present
};

// Add a Copy Files build phase. Idempotent — skips if a phase with the same name exists.
// folder_type: xcode folder type string e.g. 'wrapper'
// dst_path: destination subpath string e.g. 'Contents/Library/LoginItems'
const add_copy_files_phase = (project, file_paths, phase_name, folder_type, dst_path)=>{
    if (_has_build_phase(project, phase_name))
        return false;
    project.addBuildPhase(
        file_paths,
        'PBXCopyFilesBuildPhase',
        phase_name,
        project.getFirstTarget().uuid,
        folder_type,
        dst_path,
    );
    return true;
};

// Add a Shell Script build phase. Idempotent — skips if a phase with the same name exists.
// opts: { shellPath, shellScript, inputPaths, outputPaths }
const add_shell_script_phase = (project, phase_name, opts)=>{
    if (_has_build_phase(project, phase_name))
        return false;
    project.addBuildPhase(
        [],
        'PBXShellScriptBuildPhase',
        phase_name,
        project.getFirstTarget().uuid,
        {
            shellPath: opts.shellPath || '/bin/sh',
            shellScript: opts.shellScript || '',
            inputPaths: opts.inputPaths || [],
            outputPaths: opts.outputPaths || [],
        },
    );
    return true;
};

// Set a build setting on all configurations. Idempotent (overwrites existing value).
const set_build_setting = (project, key, value)=>{
    project.addBuildProperty(key, value);
};

// Returns true if a build phase with the given name is already attached to the first target.
const _has_build_phase = (project, phase_name)=>{
    const target = project.getFirstTarget();
    if (!target || !target.firstTarget)
        return false;
    const phases = target.firstTarget.buildPhases || [];
    return phases.some(p=>p.comment === phase_name);
};

module.exports = {
    find_xcodeproj,
    open_project,
    save_project,
    add_framework_embed_sign,
    add_copy_files_phase,
    add_shell_script_phase,
    set_build_setting,
};
