#!/usr/bin/env bun

import { readFile, writeFile, mkdir, appendFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { runGitCommit } from "./git.js";

/**
 * Interactive script for new feature requests. Collects multiple features from user input,
 * organizes them as todos, sends them to Claude Code, then automatically runs
 * predetermined follow-up commands.
 */

async function collectAndEnhanceFeatures(): Promise<string[]> {
  const features: string[] = [];
  const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
  
  console.log("🚀 New Feature Request Tool");
  console.log("===========================");
  console.log("Choose input mode:");
  console.log("1. Single comprehensive feature (for complex, multi-part features)");
  console.log("2. Multiple separate features (enter one by one)\n");
  
  const mode = prompt("Select mode (1 or 2, default: 2): ") || "2";
  const isSingleMode = mode === "1";
  
  if (isSingleMode) {
    console.log("\n📝 Single Feature Mode");
    console.log("Enter your complete feature description (can be multi-line).");
    console.log("Type 'END' on a new line when finished:\n");
    
    let featureLines: string[] = [];
    while (true) {
      const line = prompt("") || "";
      if (line.toUpperCase() === "END") {
        break;
      }
      featureLines.push(line);
    }
    
    const feature = featureLines.join("\n").trim();
    
    if (feature === "") {
      console.log("\n❌ No feature entered. Exiting.");
      process.exit(0);
    }
    
    // For single mode, we'll treat the entire input as one feature
    const trimmedFeature = feature;
    
    // Try to enhance with AI if API key is available
    if (CEREBRAS_API_KEY) {
      console.log("\n🤖 Enhancing comprehensive feature with AI...");
      
      try {
        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CEREBRAS_API_KEY}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b",
            stream: false,
            max_tokens: 1000, // Increased for comprehensive features
            temperature: 0.3,
            top_p: 0.95,
            messages: [
              {
                role: "system",
                content: "You are a prompt enhancer for comprehensive feature requests. Take the user's feature description and make it clearer and more actionable for an AI coder. Preserve all the specific requirements but organize them better. For multi-part features, keep them as a single cohesive request. Be clear and explicit. Return only the enhanced prompt text."
              },
              {
                role: "user",
                content: `The user wants to implement this comprehensive feature:\n\n"${trimmedFeature}"\n\nEnhance this request by:\n1. Making any vague requirements more specific\n2. Ensuring all parts are clearly stated\n3. Maintaining it as a single cohesive feature request\n4. Adding any implied requirements that might be missing\n\nReturn only the enhanced version.`
              }
            ]
          })
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        const enhancedFeature = data.choices[0].message.content.trim();
        
        // Check if enhancement is actually different
        if (enhancedFeature === trimmedFeature) {
          console.log(`\n⚠️  AI returned the same text - no enhancement made`);
          features.push(trimmedFeature);
          console.log(`✓ Added: "${trimmedFeature}"\n`);
        } else {
          // Show both versions when AI provides an enhancement
          console.log(`\n📝 Feature Enhancement:`);
          console.log(`  Original: ${trimmedFeature}`);
          console.log(`  Enhanced: ${enhancedFeature}`);
          
          const choice = prompt("\nUse enhanced version? (y/n, default: y): ") || "y";
          
          if (choice.toLowerCase() === 'y') {
            features.push(enhancedFeature);
            console.log(`✓ Added enhanced version\n`);
          } else {
            features.push(trimmedFeature);
            console.log(`✓ Added original version\n`);
          }
        }
        
      } catch (error) {
        console.log(`⚠️  AI enhancement failed: ${error.message}`);
        features.push(trimmedFeature);
        console.log(`✓ Added: "${trimmedFeature}"\n`);
      }
    } else {
      // No API key, just add the feature
      features.push(trimmedFeature);
      console.log(`✓ Added: "${trimmedFeature}"\n`);
    }
    
    return features;
  }
  
  // Multiple features mode (original behavior)
  console.log("\n📋 Multiple Features Mode");
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
    
    const trimmedFeature = feature.trim();
    
    // Try to enhance with AI if API key is available
    if (CEREBRAS_API_KEY) {
      console.log("\n🤖 Enhancing with AI...");
      
      try {
        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CEREBRAS_API_KEY}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b",
            stream: false,
            max_tokens: 500,
            temperature: 0.3,
            top_p: 0.95,
            messages: [
              {
                role: "system",
                content: "You are a prompt enhancer. Take vague user requests and make them clear, specific instructions for an AI coder. Be concise but explicit. Return only the enhanced prompt text."
              },
              {
                role: "user",
                content: `The user wants to implement this feature: "${trimmedFeature}"\n\nExample: If user says "change index.html to say hi", you would enhance it to: "Replace all text content in the index.html file with 'hi', removing any existing content"\n\nNow enhance the user's request above. Return only the enhanced version.`
              }
            ]
          })
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        const enhancedFeature = data.choices[0].message.content.trim();
        
        // Check if enhancement is actually different
        if (enhancedFeature === trimmedFeature) {
          console.log(`\n⚠️  AI returned the same text - no enhancement made`);
          features.push(trimmedFeature);
          console.log(`✓ Added: "${trimmedFeature}"\n`);
        } else {
          // Show both versions when AI provides an enhancement
          console.log(`\n📝 Feature Enhancement:`);
          console.log(`  Original: ${trimmedFeature}`);
          console.log(`  Enhanced: ${enhancedFeature}`);
          
          const choice = prompt("\nUse enhanced version? (y/n, default: y): ") || "y";
          
          if (choice.toLowerCase() === 'y') {
            features.push(enhancedFeature);
            console.log(`✓ Added enhanced version\n`);
          } else {
            features.push(trimmedFeature);
            console.log(`✓ Added original version\n`);
          }
        }
        
      } catch (error) {
        console.log(`⚠️  AI enhancement failed: ${error.message}`);
        features.push(trimmedFeature);
        console.log(`✓ Added: "${trimmedFeature}"\n`);
      }
    } else {
      // No API key, just add the feature
      features.push(trimmedFeature);
      console.log(`✓ Added: "${trimmedFeature}"\n`);
    }
  }
  
  return features;
}


async function loadDocumentation(): Promise<string> {
  const docsDir = join(process.cwd(), "prompts");
  const requiredFiles = [
    "GENERAL-GUIDELINES.md", 
    "BACKEND-GUIDELINES.md", 
    "FRONTEND-GUIDELINES.md",
    "NEW FEATURES.md",
    "LOGGER.md",
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
    const lines = feature.split('\n');
    if (lines.length > 1) {
      // For multi-line features, indent subsequent lines
      const formattedFeature = lines[0] + '\n' + lines.slice(1).map(line => `   ${line}`).join('\n');
      return `${index + 1}. ${formattedFeature}`;
    }
    return `${index + 1}. ${feature}`;
  }).join("\n\n");
  
  let returnPrompt = `---- \n\nNow, pay attention!`;
  returnPrompt += ` Those are the new features to implement as a structured todo list:\n`
  returnPrompt += `\n${todoList}`;

  return returnPrompt;
}

async function sendToClaude(prompt: string, continueConversation: boolean = false, sessionId: string, useOpus: boolean = false): Promise<any> {
  console.log("\n📤 Sending to Claude Code...\n");

  // Build command arguments
  const args = [
    "claude", 
    "--dangerously-skip-permissions",
    "--output-format", "stream-json",
    "--verbose"
  ];
  
  // Add model selection
  if (!continueConversation) {
    // For initial feature implementation
    if (useOpus) {
      args.push("--model", "opus");
      console.log("🎯 Using Opus model for feature implementation");
    } else {
      args.push("--model", "sonnet");
      console.log("🎯 Using Sonnet model for feature implementation");
    }
  } else {
    // For end flow, always use Sonnet
    args.push("--model", "sonnet");
    console.log("🎯 Using Sonnet model for post-implementation checklist");
  }
  
  // Add continue flag if this is a follow-up
  if (continueConversation) {
    args.push("--continue");
  }
  
  // Add the print flag and prompt using short form
  args.push("-p", prompt);

  // Execute claude command in streaming mode
  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe"
  });

  // Sent prompt to Claude
  console.log(`\n📜 Prompt sent to Claude`);
  console.log("\n⏳ Claude is working...\n");

  // Process streaming output
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let fullOutput = "";
  let lastMessage = null;
  let turnCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullOutput += chunk;
      
      // Process each line (streaming JSON outputs one object per line)
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const jsonObj = JSON.parse(line);
          
          // Update display based on message type
          if (jsonObj.type === "message") {
            turnCount++;
            // Clear previous line and show turn count
            process.stdout.write(`\r🔄 Turn ${turnCount}: ${jsonObj.role} - ${jsonObj.content.substring(0, 60)}...`);
          } else if (jsonObj.type === "tool_use") {
            process.stdout.write(`\r🔧 Using tool: ${jsonObj.name} ${jsonObj.input ? `(${JSON.stringify(jsonObj.input).substring(0, 40)}...)` : ''}`);
          } else if (jsonObj.type === "result") {
            lastMessage = jsonObj;
            process.stdout.write(`\r✅ Completed in ${jsonObj.num_turns} turns\n`);
          }
        } catch (e) {
          // Not valid JSON, skip
        }
      }
    }
  } catch (error) {
    console.error("\nError reading stream:", error);
  }

  // Wait for the process to complete
  const exitCode = await proc.exited;
  
  if (exitCode !== 0) {
    const errorOutput = await new Response(proc.stderr).text();
    console.error("Command failed with stderr:", errorOutput);
    throw new Error(`Claude command failed with exit code ${exitCode}`);
  }
  
  // Display final result
  if (lastMessage) {
    console.log("\n📝 Claude Response:");
    console.log(lastMessage.result || lastMessage);
    
    // Save to output directory
    const outputDir = join(process.cwd(), "dev", "output", "raw");
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    const outputType = continueConversation ? "continued" : "initial";
    const filename = `${sessionId}-${outputType}.json`;
    const filepath = join(outputDir, filename);
    
    await writeFile(filepath, JSON.stringify(lastMessage, null, 2));
    console.log(`\n💾 Full response saved to ${filepath}`);
    
    return lastMessage;
  }
  
  return null;
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

// Generate markdown summary from session data
async function generateMarkdownSummary(sessionSummary: any): Promise<string> {
  const { sessionId, timestamp, features, responses, gitResult } = sessionSummary;
  
  let markdown = `## 🚀 Feature Implementation Session\n\n`;
  markdown += `**Session ID:** ${sessionId}\n`;
  markdown += `**Date:** ${new Date(timestamp).toLocaleString()}\n\n`;
  
  // Features requested
  markdown += `### 📋 Features Requested\n\n`;
  features.forEach((feature: string, index: number) => {
    markdown += `${index + 1}. ${feature}\n`;
  });
  markdown += `\n`;
  
  // Phase 1: Implementation
  markdown += `### 🛠️ Phase 1: Implementation\n\n`;
  if (responses.featureImplementation) {
    markdown += `**Result:** ${responses.featureImplementation.result}\n\n`;
  } else {
    markdown += `**Result:** No implementation response captured\n\n`;
  }
  
  // Phase 2: Post-Implementation Verification
  markdown += `### 🔍 Phase 2: Post-Implementation Verification\n\n`;
  
  if (responses.endWorkflow && responses.endWorkflow.result) {
    const endResult = responses.endWorkflow.result;
    
    // First show the raw result summary
    markdown += `**Result:** ${endResult.split('\n')[0]}\n\n`;
    
    // Try to extract the Final Summary section
    const summaryMatch = endResult.match(/### 7\. \*\*Final Summary\*\*[\s\S]*?(?=##|$)/);
    const summaryAltMatch = endResult.match(/## 🎯 Implementation Summary[\s\S]*?(?=##|$)/);
    const finalSummaryMatch = endResult.match(/### What was implemented[\s\S]*?(?=##|$)/);
    
    if (summaryMatch || summaryAltMatch || finalSummaryMatch) {
      markdown += `**Implementation Details:**\n`;
      const match = summaryMatch || summaryAltMatch || finalSummaryMatch;
      const details = match[0].replace(/### 7\. \*\*Final Summary\*\*|## 🎯 Implementation Summary/, '').trim();
      markdown += details.split('\n').map(line => '  ' + line).join('\n');
      markdown += `\n\n`;
    }
    
    // Try to extract quality gates status - look for multiple patterns
    const qualityMatch = endResult.match(/## 🔍 Quality Gates Status[\s\S]*?(?=##|The implementation|$)/);
    const qualityAltMatch = endResult.match(/Quality Gates:[\s\S]*?(?=##|$)/);
    const checksMatch = endResult.match(/- \[.\] (No TypeScript errors|No linting errors|Documentation is updated|Environment variables are documented)[\s\S]*?(?=\n\n|$)/g);
    
    if (qualityMatch || qualityAltMatch || checksMatch) {
      markdown += `**Quality Gates:**\n`;
      if (qualityMatch) {
        const quality = qualityMatch[0].replace(/## 🔍 Quality Gates Status/, '').trim();
        markdown += quality.split('\n').map(line => '  ' + line).join('\n');
      } else if (checksMatch) {
        markdown += checksMatch.map(check => '  ' + check.trim()).join('\n');
      } else if (qualityAltMatch) {
        const quality = qualityAltMatch[0].trim();
        markdown += quality.split('\n').map(line => '  ' + line).join('\n');
      }
      markdown += `\n\n`;
    } else {
      // If no quality gates found, show a snippet of the response
      markdown += `**Quality Gates:** ⚠️ No structured quality gates found\n`;
      markdown += `**Raw Response Preview:**\n`;
      const preview = endResult.substring(0, 500).split('\n').slice(0, 5).join('\n');
      markdown += preview.split('\n').map(line => '  ' + line).join('\n');
      markdown += `\n  ...(see full response in raw output)\n\n`;
    }
  } else {
    markdown += `**Status:** ⚠️ Post-implementation verification not completed or captured\n\n`;
  }
  
  // Git result
  markdown += `### 📦 Phase 3: Git Commit\n\n`;
  if (gitResult) {
    markdown += gitResult.success ? `✅ ${gitResult.message}` : `❌ ${gitResult.message}`;
    if (gitResult.branch) {
      markdown += `\n📌 Branch: ${gitResult.branch}`;
    }
    markdown += `\n\n`;
  } else {
    markdown += `⚠️ No git commit attempted\n\n`;
  }
  
  markdown += `---\n\n`;
  
  return markdown;
}

// Update history file with new session
async function updateHistory(sessionSummary: any): Promise<void> {
  const outputDir = join(process.cwd(), "dev", "output");
  const historyPath = join(outputDir, "HISTORY.md");
  
  // Generate markdown summary
  const markdownSummary = await generateMarkdownSummary(sessionSummary);
  
  if (existsSync(historyPath)) {
    // Read existing content
    const existingContent = await readFile(historyPath, "utf-8");
    
    // Check if file has the header
    const header = `# 📜 Feature Implementation History\n\n`;
    let contentWithoutHeader = existingContent;
    
    if (existingContent.startsWith(header)) {
      // Remove header from existing content
      contentWithoutHeader = existingContent.substring(header.length);
    }
    
    // Add new session after header but before existing sessions
    const newContent = header + markdownSummary + contentWithoutHeader;
    await writeFile(historyPath, newContent);
  } else {
    // Create new history file with header
    const header = `# 📜 Feature Implementation History\n\n`;
    await writeFile(historyPath, header + markdownSummary);
  }
  
  console.log(`\n📜 History updated: ${historyPath}`);
}

// Check if Opus model is available
async function checkOpusAvailability(): Promise<boolean> {
  try {
    // Try to run a simple command with Opus
    const proc = Bun.spawn(["claude", "--model", "opus", "--version"], {
      stdout: "pipe",
      stderr: "pipe"
    });
    
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch (error) {
    return false;
  }
}

async function main() {
  try {
    // Generate session ID with full datetime
    const now = new Date();
    const sessionId = now.toISOString().replace(/[:.]/g, '-');
    
    console.log(`\n📅 Session ID: ${sessionId}`);
    
    // Collect and enhance features from user
    const features = await collectAndEnhanceFeatures();
    
    console.log("\n📋 Final features to implement:");
    features.forEach((feature, index) => {
      const lines = feature.split('\n');
      if (lines.length > 1) {
        console.log(`  ${index + 1}. [Multi-line feature]`);
        lines.forEach(line => {
          console.log(`     ${line}`);
        });
      } else {
        console.log(`  ${index + 1}. ${feature}`);
      }
    });
    
    // Check if Opus is available
    console.log("\n🔍 Checking model availability...");
    const opusAvailable = await checkOpusAvailability();
    if (opusAvailable) {
      console.log("✅ Opus model available - will use for feature implementation");
    } else {
      console.log("ℹ️  Opus model not available - will use Sonnet for feature implementation");
    }
    
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
    const response1 = await sendToClaude(featureImplementationPrompt, false, sessionId, opusAvailable);
    
    console.log("\n✅ Features implemented!");
    
    // Step 2: Send end workflow tasks using --continue
    console.log("\n🔄 Step 2: Running post-implementation checklist...");
    
    const endFlowContent = await loadFollowUpCommands();
    
    // Create a more specific prompt for quality gates
    let endWorkflowPrompt = 'Now that the features are implemented, please execute the following post-implementation checklist:\n\n';
    endWorkflowPrompt += endFlowContent;
    endWorkflowPrompt += '\n\n**IMPORTANT**: You MUST complete ALL checklist items, especially:\n';
    endWorkflowPrompt += '1. Run any applicable linting/type checking commands\n';
    endWorkflowPrompt += '2. Provide the Final Summary (item #7) with implementation details\n';
    endWorkflowPrompt += '3. Report the Quality Gates status at the end\n\n';
    endWorkflowPrompt += 'Even if some checks are not applicable (e.g., no TypeScript in an HTML-only change), explicitly state this in your quality gates summary.';
    
    sessionData.prompts.endWorkflow = endWorkflowPrompt;
    
    // Continue the conversation with end workflow tasks (always uses Sonnet)
    const response2 = await sendToClaude(endWorkflowPrompt, true, sessionId, false);

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
    
    const rawDir = join(outputDir, "raw");
    if (!existsSync(rawDir)) {
      await mkdir(rawDir, { recursive: true });
    }
    
    const summaryPath = join(rawDir, `${sessionId}-summary.json`);
    await writeFile(summaryPath, JSON.stringify(sessionSummary, null, 2));
    console.log(`\n📊 Complete session summary saved to ${summaryPath}`);
    
    // Update history with markdown summary
    await updateHistory(sessionSummary);
    
    console.log("\n✨ All done! Features have been implemented, tested, documented, and committed.");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the main function
main();