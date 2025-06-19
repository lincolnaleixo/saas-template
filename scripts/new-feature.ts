#!/usr/bin/env bun

import { readFile } from "fs/promises";
import { join } from "path";
import { $ } from "bun";

/**
 * This script is specifically for new feature requests. It reads only the essential
 * documentation files (ABOUT.md, GUIDELINES.md, NEW FEATURES.md) and injects them
 * into Claude Code along with the feature request command.
 */

async function main() {
  // Get the command from command line arguments
  const userCommand = process.argv.slice(2).join(" ");
  
  if (!userCommand) {
    console.error("Usage: bun scripts/new-feature.ts <your feature request>");
    console.error("Example: bun scripts/new-feature.ts 'create a user authentication system with JWT tokens'");
    process.exit(1);
  }

  try {
    // Define the specific files we need for new features
    const docsDir = join(process.cwd(), "docs");
    const requiredFiles = ["ABOUT.md", "GUIDELINES.md", "NEW FEATURES.md"];
    
    console.log("Loading project documentation for new feature development...");
    console.log("Files to inject:");
    requiredFiles.forEach(file => console.log(`  - ${file}`));
    console.log();

    // Read the specific document contents
    const documents: string[] = [];
    
    for (const file of requiredFiles) {
      const filePath = join(docsDir, file);
      try {
        const content = await readFile(filePath, "utf-8");
        
        // Format each document with a header
        documents.push(`### Document: ${file}\n\n${content}`);
      } catch (error) {
        console.error(`Warning: Could not read ${file}. Make sure it exists in the docs directory.`);
        // Continue with other files even if one is missing
      }
    }
    
    if (documents.length === 0) {
      console.error("Error: No documentation files could be read from the docs directory");
      process.exit(1);
    }

    // Combine all documents into a single context
    const documentContext = documents.join("\n\n---\n\n");
    
    // Create the full prompt with context and command
    const fullPrompt = `I have the following project documentation that provides context about this codebase:

${documentContext}

---

This is a NEW FEATURE REQUEST. Based on the above documentation and guidelines, please implement the following feature:

${userCommand}

Important: Follow all the guidelines specified in the documentation, especially regarding real implementations (no mock data), proper file organization, and the tech stack.`;

    console.log("Sending new feature request to Claude Code...\n");

    // Execute claude command with the full prompt
    // Using spawn to handle the interactive nature of claude
    const proc = Bun.spawn(["claude", "--dangerously-skip-permissions"], {
      stdin: "pipe",
      stdout: "inherit",
      stderr: "inherit"
    });

    // Send the prompt to claude
    proc.stdin.write(fullPrompt);
    proc.stdin.end();

    // Wait for the process to complete
    await proc.exited;

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run the main function
main();