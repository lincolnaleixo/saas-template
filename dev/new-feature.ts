#!/usr/bin/env bun

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
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

async function sendToClaude(prompt: string, continueConversation: boolean = false, sessionId: string): Promise<any> {
  console.log("\n🚀 Sending to Claude Code...\n");

  // Build command arguments
  const args = [
    "claude", 
    "--dangerously-skip-permissions",
    "--output-format", "json"
  ];
  
  // Add continue flag if this is a follow-up
  if (continueConversation) {
    args.push("--continue");
  }
  
  // Add the print flag and prompt using short form
  args.push("-p", prompt);

  // Execute claude command in non-interactive mode
  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe"
  });

  // Sent prompt to Claude
  console.log(`📜 Prompt sent to Claude. Let them code`);

  // Collect the output and errors
  const [output, errorOutput] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ]);
  
  // Wait for the process to complete
  const exitCode = await proc.exited;
  
  if (exitCode !== 0) {
    console.error("Command failed with stderr:", errorOutput);
    throw new Error(`Claude command failed with exit code ${exitCode}`);
  }
  
  // Parse and display the JSON response
  try {
    const response = JSON.parse(output);
    console.log("\n📝 Claude Response:");
    console.log(response.response || response);
    
    // Save to output directory with full datetime
    const outputDir = join(process.cwd(), "dev", "output");
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    const outputType = continueConversation ? "continued" : "initial";
    const filename = `${sessionId}-${outputType}.json`;
    const filepath = join(outputDir, filename);
    
    await writeFile(filepath, JSON.stringify(response, null, 2));
    console.log(`\n💾 Full response saved to ${filepath}`);
    
    return response;
  } catch (error) {
    // If not JSON, just display the raw output
    console.log(output);
    return null;
  }
}

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

async function main() {
  try {
    // Generate session ID with full datetime
    const now = new Date();
    const sessionId = now.toISOString().replace(/[:.]/g, '-');
    
    console.log(`\n📅 Session ID: ${sessionId}`);
    
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
    
    // Save session data
    const outputDir = join(process.cwd(), "dev", "output");
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    const sessionData = {
      sessionId,
      timestamp: now.toISOString(),
      features,
      prompts: {
        featureImplementation: featureImplementationPrompt,
        endWorkflow: null // Will be set later
      }
    };
    
    // Step 1: Send feature implementation request
    console.log("\n🚀 Step 1: Implementing features...");
    const response1 = await sendToClaude(featureImplementationPrompt, false, sessionId);
    
    console.log("\n✅ Features implemented!");
    
    // Step 2: Send end workflow tasks using --continue
    console.log("\n🔄 Step 2: Running post-implementation checklist...");
    
    const endFlowContent = await loadFollowUpCommands();
    
    let endWorkflowPrompt = '---- \n\nNow that the features are implemented, please execute the following post-implementation checklist:\n\n';
    endWorkflowPrompt += endFlowContent;
    endWorkflowPrompt += '\n\nPlease go through each checklist item in order and ensure all quality gates are met.';
    
    sessionData.prompts.endWorkflow = endWorkflowPrompt;
    
    // Continue the conversation with end workflow tasks
    const response2 = await sendToClaude(endWorkflowPrompt, true, sessionId);

    console.log("\n✅ Post-implementation checklist completed!");

    // Step 3: Commit changes
    console.log("\n🔄 Step 3: Committing changes to git...");
    
    let gitResult = null;
    try {
      gitResult = await runGitCommit();
      
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
      gitResult = { success: false, message: gitError.message };
    }
    
    // Save complete session summary
    const sessionSummary = {
      ...sessionData,
      responses: {
        featureImplementation: response1,
        endWorkflow: response2
      },
      gitResult,
      completedAt: new Date().toISOString()
    };
    
    const summaryPath = join(outputDir, `${sessionId}-summary.json`);
    await writeFile(summaryPath, JSON.stringify(sessionSummary, null, 2));
    console.log(`\n📊 Complete session summary saved to ${summaryPath}`);
    
    console.log("\n✨ All done! Features have been implemented, tested, documented, and committed.");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the main function
main();