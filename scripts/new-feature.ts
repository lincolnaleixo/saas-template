#!/usr/bin/env bun

import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Interactive script for new feature requests. Collects multiple features from user input,
 * organizes them as todos, and sends them to Claude Code with project documentation context.
 */

async function readLine(): Promise<string> {
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
    const text = decoder.decode(chunk);
    if (text.includes('\n')) {
      break;
    }
  }
  
  const fullText = decoder.decode(Buffer.concat(chunks));
  return fullText.replace('\n', '').trim();
}

async function collectFeatures(): Promise<string[]> {
  const features: string[] = [];
  
  console.log("🚀 New Feature Request Tool");
  console.log("===========================");
  console.log("Enter features one by one. Press Enter on empty line to submit.\n");
  
  let featureNumber = 1;
  
  while (true) {
    const prompt = features.length === 0 
      ? "Enter feature: " 
      : `Enter feature ${featureNumber} (or press Enter to submit): `;
    
    process.stdout.write(prompt);
    
    // Read user input line by line
    const feature = await readLine();
    
    if (feature === "") {
      if (features.length === 0) {
        console.log("\n❌ No features entered. Exiting.");
        process.exit(0);
      }
      break;
    }
    
    features.push(feature);
    featureNumber++;
    console.log(`✓ Added: "${feature}"\n`);
  }
  
  return features;
}

async function loadDocumentation(): Promise<string> {
  const docsDir = join(process.cwd(), "docs");
  const requiredFiles = ["ABOUT.md", "GUIDELINES.md", "NEW FEATURES.md"];
  const documents: string[] = [];
  
  console.log("\n📚 Loading project documentation...");
  
  for (const file of requiredFiles) {
    const filePath = join(docsDir, file);
    try {
      const content = await readFile(filePath, "utf-8");
      documents.push(`### Document: ${file}\n\n${content}`);
      console.log(`  ✓ Loaded ${file}`);
    } catch (error) {
      console.log(`  ⚠️  Could not load ${file}`);
    }
  }
  
  if (documents.length === 0) {
    console.error("\n❌ Error: No documentation files could be loaded");
    process.exit(1);
  }
  
  return documents.join("\n\n---\n\n");
}

function formatFeaturesAsTodos(features: string[]): string {
  const todoList = features.map((feature, index) => {
    return `${index + 1}. ${feature}`;
  }).join("\n");
  
  return `Here are the features to implement as a structured todo list:

${todoList}

Please implement these features in order, following these guidelines:
- Create each feature with real, working implementations (no mock data)
- Follow the project's tech stack and file organization structure
- Update the database schema if necessary
- Add proper error handling and validation
- Ensure type safety throughout
- Comment complex code sections
- Test each feature before moving to the next one`;
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
    
    // Format the complete prompt
    const featuresPrompt = formatFeaturesAsTodos(features);
    
    const fullPrompt = `I have the following project documentation that provides context about this codebase:

${documentation}

---

NEW FEATURE REQUEST:

${featuresPrompt}

Important reminders:
- This is a NEW FEATURE implementation request
- Follow ALL guidelines from the documentation
- Use REAL implementations only (no mock data or simulated features)
- Implement features completely with proper database integration
- Use the exact tech stack specified in the guidelines
- Maintain the project's file organization structure
- Add detailed comments for complex code
- DO NOT run linter or fix TypeScript linting errors`;

    console.log("\n🚀 Sending to Claude Code...\n");

    // Execute claude command with JSON output
    const proc = Bun.spawn(["claude", "--dangerously-skip-permissions", "--json"], {
      stdin: "pipe",
      stdout: "inherit",
      stderr: "inherit"
    });

    // Send the prompt to claude
    proc.stdin.write(fullPrompt);
    proc.stdin.end();

    // Wait for the process to complete
    await proc.exited;
    
    console.log("\n✅ Feature request sent successfully!");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the main function
main();