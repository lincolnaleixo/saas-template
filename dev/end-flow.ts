#!/usr/bin/env bun

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Script to generate end-flow prompt files for post-implementation checklists.
 */


// Load follow-up commands from END-FLOW.md
async function loadFollowUpCommands(): Promise<string> {
  const endFlowPath = join(process.cwd(), "prompts", "END-FLOW.md");
  
  try {
    const content = await readFile(endFlowPath, "utf-8");
    console.log("  ✓ Loaded END-FLOW.md");
    
    return content;
  } catch (error) {
    console.log("  ⚠️  Could not load END-FLOW.md, ignoring follow-up commands.");
    
    return "";
  }
}

// Save prompt to file with timestamp
async function savePromptToFile(prompt: string, sessionId: string): Promise<void> {
  console.log("\n📝 Creating prompt file...\n");
  
  // Create output directory structure
  const outputDir = join(process.cwd(), "dev", "output", "prompts");
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
  
  // Generate filename with timestamp format: end-flow-YYYY-MM-DDTHH-MM-SS.md
  const filename = `end-flow-${sessionId}.md`;
  const filepath = join(outputDir, filename);
  
  // Save prompt to file
  await writeFile(filepath, prompt);
  console.log(`✅ Prompt saved to: ${filepath}`);
  
  return;
}

async function main() {
  try {
    // Generate session ID with full datetime
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const sessionId = `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
    
    console.log("🔄 End-Flow Prompt Generator");
    console.log("===========================");
    console.log(`\n📅 Session ID: ${sessionId}`);
    
    // Load END-FLOW.md content
    console.log("\n📚 Loading END-FLOW.md...");
    const endFlowContent = await loadFollowUpCommands();
    
    if (!endFlowContent) {
      console.error("\n❌ Error: Could not load END-FLOW.md");
      process.exit(1);
    }
    
    // Create prompt with proper structure
    let prompt = `# Post-Implementation Checklist\n\n`;
    prompt += `Please execute the following post-implementation checklist to ensure code quality and completeness:\n\n`;
    prompt += endFlowContent;
    
    // Save to file
    await savePromptToFile(prompt, sessionId);
    
    console.log("\n✨ End-flow prompt file created successfully!");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the main function
main();