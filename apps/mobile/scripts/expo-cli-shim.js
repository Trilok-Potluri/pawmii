#!/usr/bin/env node
// Forces Metro's server root to equal this app's project root instead of the
// monorepo root. Without this, Gradle's bundle step passes `--entry-file index.js`
// as a path relative to apps/mobile, but Metro resolves it against the monorepo
// root and fails with "Unable to resolve module ./index.js from D:\pet\pawmii/.".
process.env.EXPO_NO_METRO_WORKSPACE_ROOT = '1';

require('@expo/cli/build/bin/cli');
