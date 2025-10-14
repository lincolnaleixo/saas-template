#!/usr/bin/env node

/**
 * Opens the browser after Next.js dev server is ready
 */

import { exec } from 'child_process';

const URL = 'http://localhost:3000';
const DELAY_MS = 2000; // Wait 2 seconds for server to be ready

setTimeout(() => {
  const platform = process.platform;
  let command;

  if (platform === 'darwin') {
    command = `open ${URL}`;
  } else if (platform === 'win32') {
    command = `start ${URL}`;
  } else {
    command = `xdg-open ${URL}`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`Note: Could not automatically open browser. Please visit ${URL} manually.`);
    } else {
      console.log(`✓ Opened ${URL} in your browser`);
    }
  });
}, DELAY_MS);
