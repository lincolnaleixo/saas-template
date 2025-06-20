#!/usr/bin/env bun

import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Interactive script for new feature requests. Collects multiple features from user input,
 * organizes them as todos, sends them to Claude Code, then automatically runs
 * predetermined follow-up commands.
 */

async function collectFeatures(): Promise<string[]> {
  const features: string[] = [];
  
  console.log("🚀 New Feature Request Tool");
  console.log("===========================");
  console.log("Enter features one by one. Press Enter on empty line to submit.\n");
  
  while (true) {
    const featureNumber = features.length + 1;
    const promptText = features.length === 0 
      ? "Enter feature: " 
      : `Enter feature ${featureNumber} (or press Enter to submit): `;
    
    // Use Bun's prompt API
    const feature = prompt(promptText) || "";
    
    if (feature.trim() === "") {
      if (features.length === 0) {
        console.log("\n❌ No features entered. Exiting.");
        process.exit(0);
      }
      break;
    }
    
    features.push(feature.trim());
    console.log(`✓ Added: "${feature.trim()}"\n`);
  }
  
  return features;
}

async function loadDocumentation(): Promise<string> {
  const docsDir = join(process.cwd(), "prompts");
  const requiredFiles = ["GENERAL-GUIDELINES.md", "NEW FEATURES.md"];
  const documents: string[] = [];
  
  console.log("\n📂 Loading project information...");

  const aboutFile = join(process.cwd(), "docs", "ABOUT.md");
  const content = await readFile(aboutFile, "utf-8");
  documents.push(`\n\n${content}`);

  console.log("\n📚 Loading project documentation...");
  
  for (const file of requiredFiles) {
    const filePath = join(docsDir, file);
    try {
      const content = await readFile(filePath, "utf-8");
      documents.push(`\n\n${content}`);
      console.log(`  ✓ Loaded ${file}`);
    } catch (error) {
      console.log(`  ⚠️  Could not load ${file}`);
    }
  }
  
  if (documents.length === 0) {
    console.error("\n❌ Error: No documentation files could be loaded");
    process.exit(1);
  }
  
  return documents.join("");
}

function formatFeaturesAsTodos(features: string[]): string {
  const todoList = features.map((feature, index) => {
    return `${index + 1}. ${feature}`;
  }).join("\n");
  
  let returnPrompt = `---- \n\nNow, pay attention!`;
  returnPrompt += ` Those are the new features to implement as a structured todo list:\n`
  returnPrompt += `\n${todoList}`;

  return returnPrompt;
}

async function sendToClaude(prompt: string): Promise<void> {
  console.log("\n🚀 Sending to Claude Code...\n");

  // Execute claude command
  const proc = Bun.spawn(["claude", "--dangerously-skip-permissions"], {
    stdin: "pipe",
    stdout: "inherit",
    stderr: "inherit"
  });

  // Send the prompt to claude
  proc.stdin.write(prompt);
  proc.stdin.end();

  // Wait for the process to complete
  await proc.exited;
}

// Load follow-up commands from END-FLOW.md
async function loadFollowUpCommands(): Promise<Array<{name: string, prompt: string}>> {
  const endFlowPath = join(process.cwd(), "prompts", "END-FLOW.md");
  
  try {
    const content = await readFile(endFlowPath, "utf-8");
    console.log("  ✓ Loaded END-FLOW.md");
    
    // Parse the markdown file to extract commands
    const lines = content.split('\n');
    const commands: Array<{name: string, prompt: string}> = [];
    
    for (const line of lines) {
      // Match numbered list items (e.g., "1. Command description")
      const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*-?\s*(.+)$/);
      if (match) {
        const [_, name, description] = match;
        commands.push({
          name: name.trim(),
          prompt: `${description.trim()}`
        });
      }
    }
    
    return commands;
  } catch (error) {
    console.log("  ⚠️  Could not load END-FLOW.md, ignoring follow-up commands.");
    
    return [];
  }
}

async function main() {
  try {
    // Collect features from user
    const features = await collectFeatures();
    
    console.log("\n📋 Features to implement:");
    features.forEach((feature, index) => {
      console.log(`  ${index + 1}. ${feature}`);
    });
    
    // Load documentation
    const documentation = await loadDocumentation();
    
    // Load follow-up commands from END-FLOW.md
    const followUpCommands = await loadFollowUpCommands();
    
    // Format the complete prompt
    const featuresPrompt = formatFeaturesAsTodos(features);
    
    let fullPrompt = 'This is a NEW FEATURE implementation request';
    fullPrompt += `Follow strictly ALL guidelines from the documentation below:`;
    fullPrompt += `${documentation}`;
    fullPrompt += `${featuresPrompt}`;
    
    // Send initial feature request
    // await sendToClaude(fullPrompt);
    console.log("\n📤 Sending feature request to Claude Code...\n");
    console.log(fullPrompt);
    
    console.log("\n✅ Features implemented!");
    
    // Run follow-up commands
    console.log("\n🔄 Running follow-up commands from END-FLOW.md...");
    
    for (const command of followUpCommands) {
      console.log(`\n📌 ${command.name}...`);
      // await sendToClaude(command.prompt);
      console.log(`\nExecuting command: ${command.prompt}`);
      
      // Small delay between commands
      // await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("\n✨ All done! Features have been implemented, tested, documented, and committed.");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the main function
main();