#!/usr/bin/env bun

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { $ } from "bun";

/**
 * This script reads all documents from the docs folder and injects them into Claude Code
 * along with a user-provided command. It formats the documents into a single prompt
 * and sends it to Claude Code using the --dangerously-skip-permissions flag.
 */

async function main() {
  // Get the command from command line arguments
  const userCommand = process.argv.slice(2).join(" ");
  
  if (!userCommand) {
    console.error("Usage: bun inject-docs-to-claude.ts <your command>");
    console.error("Example: bun inject-docs-to-claude.ts 'create a new user authentication system'");
    process.exit(1);
  }

  try {
    // Read all files from the docs directory
    const docsDir = join(process.cwd(), "docs");
    const files = await readdir(docsDir);
    
    // Filter for markdown files
    const mdFiles = files.filter(file => file.endsWith(".md"));
    
    if (mdFiles.length === 0) {
      console.error("No markdown files found in docs directory");
      process.exit(1);
    }

    console.log(`Found ${mdFiles.length} document(s) to inject:`);
    mdFiles.forEach(file => console.log(`  - ${file}`));
    console.log();

    // Read all document contents
    const documents: string[] = [];
    
    for (const file of mdFiles) {
      const filePath = join(docsDir, file);
      const content = await readFile(filePath, "utf-8");
      
      // Format each document with a header
      documents.push(`### Document: ${file}\n\n${content}`);
    }

    // Combine all documents into a single context
    const documentContext = documents.join("\n\n---\n\n");
    
    // Create the full prompt with context and command
    const fullPrompt = `I have the following project documentation that provides context about this codebase:

${documentContext}

---

Based on the above documentation and guidelines, please execute the following task:

${userCommand}`;

    console.log("Sending to Claude Code...\n");

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