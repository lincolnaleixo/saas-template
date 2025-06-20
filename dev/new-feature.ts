#!/usr/bin/env bun

import { readFile } from "fs/promises";
import { join } from "path";
import { runGitCommit } from "./git.js";

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
  const requiredFiles = [
    "GENERAL-GUIDELINES.md", 
    "BACKEND-GUIDELINES.md", 
    "FRONTEND-GUIDELINES.md",
    "NEW FEATURES.md"
  ];
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

async function sendToClaude(prompt: string, continueConversation: boolean = false): Promise<void> {
  console.log("\n🚀 Sending to Claude Code...\n");

  // Build command arguments
  const args = [
    "claude", 
    "--dangerously-skip-permissions",
    "--output-format", "json",
    "--print", prompt
  ];
  
  // Add continue flag if this is a follow-up
  if (continueConversation) {
    args.splice(2, 0, "--continue"); // Insert after 'claude' and before other flags
  }

  // Execute claude command in non-interactive mode
  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "inherit"
  });

  // Collect the output
  const output = await new Response(proc.stdout).text();
  
  // Wait for the process to complete
  const exitCode = await proc.exited;
  
  if (exitCode !== 0) {
    throw new Error(`Claude command failed with exit code ${exitCode}`);
  }
  
  // Parse and display the JSON response
  try {
    const response = JSON.parse(output);
    console.log("\n📝 Claude Response:");
    console.log(response.response || response);
    
    // Optionally save to file for debugging
    const filename = continueConversation ? "claude-response-continued.json" : "claude-response.json";
    await Bun.write(filename, JSON.stringify(response, null, 2));
    console.log(`\n💾 Full response saved to ${filename}`);
  } catch (error) {
    // If not JSON, just display the raw output
    console.log(output);
  }
}

// Load follow-up commands from END-FLOW.md
async function loadFollowUpCommands(): Promise<Array<{name: string, prompt: string}>> {
  const endFlowPath = join(process.cwd(), "prompts", "END-FLOW.md");
  
  try {
    const content = await readFile(endFlowPath, "utf-8");
    console.log("  ✓ Loaded END-FLOW.md");
    
    return content
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
    
    // Format the complete prompt for features
    const featuresPrompt = formatFeaturesAsTodos(features);
    
    let featureImplementationPrompt = 'This is a NEW FEATURE implementation request. ';
    featureImplementationPrompt += `Follow strictly ALL guidelines from the documentation below:`;
    featureImplementationPrompt += `${documentation}`;
    featureImplementationPrompt += `${featuresPrompt}`;
    
    // Step 1: Send feature implementation request
    console.log("\n🚀 Step 1: Implementing features...");
    await sendToClaude(featureImplementationPrompt, false);
    // console.log(featureImplementationPrompt)
    
    console.log("\n✅ Features implemented!");
    
    // Step 2: Send end workflow tasks using --continue
    console.log("\n🔄 Step 2: Running post-implementation checklist...");
    
    let endWorkflowPrompt = '---- \n\nNow that the features are implemented, please execute the following post-implementation checklist:\n\n';
    
    endWorkflowPrompt += await loadFollowUpCommands()
    
    endWorkflowPrompt += '\n\nPlease go through each checklist item in order and ensure all quality gates are met.';
    
    // Continue the conversation with end workflow tasks
    await sendToClaude(endWorkflowPrompt, true);
    // console.log(endWorkflowPrompt);

    console.log("\n✅ Post-implementation checklist completed!");

    // Step 3: Commit changes
    console.log("\n🔄 Step 3: Committing changes to git...");
    
    try {
      const gitResult = await runGitCommit();
      
      if (gitResult.success) {
        console.log(`\n✅ Git commit successful: ${gitResult.message}`);
        if (gitResult.branch) {
          console.log(`   📌 New branch created: ${gitResult.branch}`);
        }
      } else {
        console.log(`\n⚠️  Git commit failed: ${gitResult.message}`);
        console.log("   You may need to commit changes manually.");
      }
    } catch (gitError) {
      console.log(`\n⚠️  Git commit error: ${gitError.message}`);
      console.log("   You may need to commit changes manually.");
    }
    
    console.log("\n✨ All done! Features have been implemented, tested, documented, and committed.");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the main function
main();