#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

const CONFIG_DIR = join(homedir(), '.anyartifact');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function loadConfig() {
  if (existsSync(CONFIG_FILE)) {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  }
  return { api_url: 'http://localhost:3000' };
}

function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

const program = new Command();
program
  .name('anyartifact')
  .description('CLI tool for publishing artifacts to AnyArtifact')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize AnyArtifact CLI with your API key')
  .action(async () => {
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

    console.log(chalk.cyan('🔐 AnyArtifact CLI Setup\n'));

    const apiUrl = await question(chalk.white('API URL (default: http://localhost:3000): '));
    const apiKey = await question(chalk.white('API Key: '));

    const config = {
      api_url: apiUrl || 'http://localhost:3000',
      api_key: apiKey,
    };

    saveConfig(config);
    console.log(chalk.green('\n✅ Configuration saved to ~/.anyartifact/config.json'));

    rl.close();
  });

program
  .command('publish')
  .description('Publish a new artifact')
  .argument('[file]', 'HTML file to publish (reads stdin if not provided)')
  .option('-t, --title <title>', 'Artifact title')
  .option('-d, --description <desc>', 'Artifact description')
  .option('-s, --slug <slug>', 'Custom URL slug')
  .option('-a, --author <name>', 'Author name')
  .option('-u, --url <url>', 'API URL (overrides config)')
  .action(async (file, options) => {
    const config = loadConfig();
    const apiUrl = options.url || config.api_url;

    if (!config.api_key) {
      console.error(chalk.red('❌ No API key configured. Run: anyartifact init'));
      process.exit(1);
    }

    let content;
    if (file) {
      if (!existsSync(file)) {
        console.error(chalk.red(`❌ File not found: ${file}`));
        process.exit(1);
      }
      content = readFileSync(file, 'utf-8');
    } else {
      content = await readStdin();
    }

    if (!content.trim()) {
      console.error(chalk.red('❌ No content provided'));
      process.exit(1);
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/artifacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          title: options.title || 'Untitled Artifact',
          description: options.description,
          slug: options.slug,
          author_name: options.author,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(chalk.green('\n✅ Artifact published successfully!\n'));
        console.log(chalk.white('  ID:      '), result.id);
        console.log(chalk.white('  URL:     '), chalk.cyan(result.url));
        console.log(chalk.white('  Version: '), result.version);
        console.log(chalk.white('  Size:    '), `${result.size_bytes} bytes`);
        console.log('');
      } else {
        console.error(chalk.red(`\n❌ Error: ${result.error}`));
        if (result.details) {
          console.error(chalk.gray(JSON.stringify(result.details, null, 2)));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed to connect to ${apiUrl}`));
      console.error(chalk.gray(error.message));
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Update an existing artifact (creates new version)')
  .argument('<id>', 'Artifact ID to update')
  .argument('[file]', 'HTML file with updated content')
  .option('-t, --title <title>', 'New title')
  .option('-d, --description <desc>', 'New description')
  .option('-u, --url <url>', 'API URL (overrides config)')
  .action(async (id, file, options) => {
    const config = loadConfig();
    const apiUrl = options.url || config.api_url;

    if (!config.api_key) {
      console.error(chalk.red('❌ No API key configured. Run: anyartifact init'));
      process.exit(1);
    }

    let content;
    if (file) {
      if (!existsSync(file)) {
        console.error(chalk.red(`❌ File not found: ${file}`));
        process.exit(1);
      }
      content = readFileSync(file, 'utf-8');
    } else {
      content = await readStdin();
    }

    if (!content.trim()) {
      console.error(chalk.red('❌ No content provided'));
      process.exit(1);
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/artifacts/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          title: options.title,
          description: options.description,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(chalk.green('\n✅ Artifact updated successfully!\n'));
        console.log(chalk.white('  ID:      '), result.id);
        console.log(chalk.white('  URL:     '), chalk.cyan(result.url));
        console.log(chalk.white('  Version: '), result.version);
        console.log(chalk.white('  Size:    '), `${result.size_bytes} bytes`);
        console.log('');
      } else {
        console.error(chalk.red(`\n❌ Error: ${result.error}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed to connect to ${apiUrl}`));
      console.error(chalk.gray(error.message));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List your recent artifacts')
  .option('-p, --page <page>', 'Page number', '1')
  .option('-l, --limit <limit>', 'Items per page', '20')
  .option('-u, --url <url>', 'API URL (overrides config)')
  .action(async (options) => {
    const config = loadConfig();
    const apiUrl = options.url || config.api_url;

    try {
      const response = await fetch(`${apiUrl}/api/v1/artifacts?page=${options.page}&limit=${options.limit}`);
      const result = await response.json();

      if (response.ok) {
        if (result.artifacts.length === 0) {
          console.log(chalk.yellow('\n📭 No artifacts found.\n'));
          return;
        }

        console.log(chalk.cyan(`\n📦 Artifacts (page ${result.page}, ${result.total} total)\n`));

        for (const artifact of result.artifacts) {
          console.log(chalk.white('  '), chalk.cyan(artifact.id));
          console.log(chalk.gray('    '), artifact.title);
          console.log(chalk.gray('    '), `by ${artifact.author_name} · ${new Date(artifact.created_at).toLocaleDateString()}`);
          console.log('');
        }
      } else {
        console.error(chalk.red(`\n❌ Error: ${result.error}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed to connect to ${apiUrl}`));
      console.error(chalk.gray(error.message));
      process.exit(1);
    }
  });

program
  .command('get')
  .description('Get artifact metadata')
  .argument('<id>', 'Artifact ID')
  .option('-u, --url <url>', 'API URL (overrides config)')
  .action(async (id, options) => {
    const config = loadConfig();
    const apiUrl = options.url || config.api_url;

    try {
      const response = await fetch(`${apiUrl}/api/v1/artifacts/${id}`);
      const result = await response.json();

      if (response.ok) {
        console.log(chalk.cyan('\n📦 Artifact Details\n'));
        console.log(chalk.white('  ID:          '), result.id);
        console.log(chalk.white('  Title:       '), result.title);
        console.log(chalk.white('  Description: '), result.description || '(none)');
        console.log(chalk.white('  Author:      '), result.author_name);
        console.log(chalk.white('  URL:         '), chalk.cyan(result.url));
        console.log(chalk.white('  Created:     '), new Date(result.created_at).toLocaleString());
        console.log(chalk.white('  Updated:     '), new Date(result.updated_at).toLocaleString());
        console.log(chalk.white('  Versions:    '), result.versions.length);
        console.log('');
      } else {
        console.error(chalk.red(`\n❌ Error: ${result.error}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed to connect to ${apiUrl}`));
      console.error(chalk.gray(error.message));
      process.exit(1);
    }
  });

program
  .command('open')
  .description('Open artifact in browser')
  .argument('<id>', 'Artifact ID')
  .option('-u, --url <url>', 'API URL (overrides config)')
  .action(async (id, options) => {
    const config = loadConfig();
    const apiUrl = options.url || config.api_url;

    const open = await import('open');
    await open.default(`${apiUrl}/${id}`);
    console.log(chalk.green(`\n🌐 Opening ${apiUrl}/${id} in browser...\n`));
  });

program.parse();
