#!/usr/bin/env bun

import { readFile, writeFile, mkdir, appendFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Interactive script for new feature requests. Collects multiple features from user input,
 * organizes them as todos, and creates a prompt file for use with AI assistants.
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
    "LOGGER.md",
    "MIGRATIONS.md",
    "INFRA.md",
  ];
  const documents: string[] = [];
  
  console.log("\n📂 Loading project information...");

  const aboutFile = join(process.cwd(), "docs", "ABOUT.md");
  const content = await readFile(aboutFile, "utf-8");
  documents.push(`\n${content}`);

  console.log("\n📚 Loading project documentation...");
  
  for (const file of requiredFiles) {
    const filePath = join(docsDir, file);
    try {
      const content = await readFile(filePath, "utf-8");
      documents.push(`\n${content}`);
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


async function savePromptToFile(prompt: string, sessionId: string, promptType: string = "feature-implementation"): Promise<void> {
  console.log("\n📝 Creating prompt file...\n");

  // Create output directory structure
  const outputDir = join(process.cwd(), "dev", "output", "prompts");
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
  
  // Generate filename with datetime format: new-feature-YYYY-MM-DDTHH-MM-SS
  const now = new Date();
  const dateTime = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `new-feature-${dateTime}.md`;
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
    
    // Load documentation
    const documentation = await loadDocumentation();
    
    // Format the complete prompt with new structure
    let featureImplementationPrompt = '# This is a NEW FEATURE implementation request. Follow strictly ALL guidelines from the documentation below:\n\n';
    featureImplementationPrompt += '## We want to implement those new features below.\n\n';
    
    // Add features as numbered list
    features.forEach((feature, index) => {
      const lines = feature.split('\n');
      if (lines.length > 1) {
        // For multi-line features, format properly
        featureImplementationPrompt += `${index + 1}. ${lines[0]}\n`;
        lines.slice(1).forEach(line => {
          featureImplementationPrompt += `   ${line}\n`;
        });
      } else {
        featureImplementationPrompt += `${index + 1}. ${feature}\n`;
      }
    });
    
    featureImplementationPrompt += '\n## Strictly follow the documentation below\n';
    featureImplementationPrompt += `${documentation}`;
    
    // Save prompt file
    await savePromptToFile(featureImplementationPrompt, sessionId, "feature-implementation");
    
    console.log("\n✨ Prompt file created successfully!");
    console.log("\n📋 Summary:");
    console.log(`   - Session ID: ${sessionId}`);
    console.log(`   - Features requested: ${features.length}`);
    console.log(`   - Output directory: dev/output/prompts/`);
    console.log("\n💡 You can now use this prompt file with Claude or any other AI assistant.");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the main function
main();