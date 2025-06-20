#!/usr/bin/env bun

import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Interactive script for new feature requests. Collects multiple features from user input,
 * organizes them as todos, and sends them to Claude Code with project documentation context.
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
  const docsDir = join(process.cwd(), "docs");
  const requiredFiles = ["ABOUT.md", "GENERAL-GUIDELINES.md", "NEW FEATURES.md"];
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
  
  return `Those are the new features to implement as a structured todo list:\n${todoList}`;
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
    
    const fullPrompt = 
    
    `This is a NEW FEATURE implementation request. Follow strictly ALL guidelines from the documentation below:\n


${documentation}

---

${featuresPrompt}
`;

    console.log("\n🚀 Sending to Claude Code...\n");

    // Execute claude command
    // const proc = Bun.spawn(["claude", "--dangerously-skip-permissions"], {
    //   stdin: "pipe",
    //   stdout: "inherit",
    //   stderr: "inherit"
    // });

    // // Send the prompt to claude
    // proc.stdin.write(fullPrompt);
    // proc.stdin.end();

    // Wait for the process to complete
    // await proc.exited;

    console.log(fullPrompt)
    
    console.log("\n✅ Feature request sent successfully!");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the main function
main();