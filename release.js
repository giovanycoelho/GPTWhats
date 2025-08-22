#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(text) {
  return new Promise((resolve) => {
    rl.question(text, resolve);
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n📦 Executando: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Comando falhou com código ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

function updateVersion(newVersion) {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  packageJson.version = newVersion;
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log(`✅ Versão atualizada para ${newVersion} no package.json`);
}

function getCurrentVersion() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function generateReleaseNotes(version) {
  const notes = `# Release Notes v${version}

## 🆕 Novidades
- [Descreva as novas funcionalidades aqui]

## 🔧 Melhorias
- [Descreva melhorias e otimizações aqui]

## 🐛 Correções
- [Descreva bugs corrigidos aqui]

## ⚠️ Mudanças Importantes
- [Descreva breaking changes aqui, se houver]

---

## 📥 Como Atualizar

### Instalação Nova
1. Baixe o arquivo \`GPTWhats Setup ${version}.exe\`
2. Execute o instalador
3. Siga o wizard de instalação

### Usuários Existentes
- O GPTWhats detectará automaticamente a atualização
- Você será notificado quando a atualização estiver pronta
- Clique em "Instalar Agora" ou "Instalar ao Fechar"

## 🔧 Informações Técnicas
- **Tamanho do instalador**: ~200MB
- **Compatibilidade**: Windows 10/11 (64-bit)
- **Requisitos**: Nenhum (todas dependências incluídas)
- **Auto-Update**: Habilitado por padrão

## 🆘 Suporte
- **Issues**: [GitHub Issues](https://github.com/giovanycoelho/GPTWhats/issues)
- **Documentação**: [README.md](https://github.com/giovanycoelho/GPTWhats/blob/main/README.md)
- **Instalação**: [Guia de Instalação](https://github.com/giovanycoelho/GPTWhats/blob/main/setup-instructions.md)
`;

  fs.writeFileSync(path.join(__dirname, `release-notes-v${version}.md`), notes);
  console.log(`📝 Notas de release criadas: release-notes-v${version}.md`);
  console.log('👆 Edite este arquivo antes de continuar com o release!');
}

async function createRelease() {
  try {
    console.log('🚀 Assistente de Release - GPTWhats\n');
    
    const currentVersion = getCurrentVersion();
    console.log(`📋 Versão atual: ${currentVersion}`);
    
    const newVersion = await question('🔢 Nova versão (ex: 1.0.1): ');
    
    if (!newVersion || newVersion === currentVersion) {
      console.log('❌ Versão inválida ou igual à atual');
      process.exit(1);
    }
    
    // Atualizar versão
    updateVersion(newVersion);
    
    // Gerar notas de release
    generateReleaseNotes(newVersion);
    
    const continueRelease = await question('\n📝 Edite o arquivo de release notes e pressione Enter para continuar (ou "n" para cancelar): ');
    
    if (continueRelease.toLowerCase() === 'n') {
      console.log('❌ Release cancelado');
      process.exit(0);
    }
    
    // Build da aplicação
    console.log('\n=== STEP 1: Building Application ===');
    await runCommand('node', ['build-electron.js']);
    
    // Commit das mudanças
    console.log('\n=== STEP 2: Git Operations ===');
    await runCommand('git', ['add', '.']);
    await runCommand('git', ['commit', '-m', `chore: release v${newVersion}`]);
    
    // Criar tag
    await runCommand('git', ['tag', `v${newVersion}`]);
    
    // Push para o GitHub
    await runCommand('git', ['push', 'origin', 'main']);
    await runCommand('git', ['push', 'origin', `v${newVersion}`]);
    
    console.log('\n🎉 Release criado com sucesso!');
    console.log(`\n📋 Próximos passos:`);
    console.log(`   1. GitHub Actions está buildando automaticamente`);
    console.log(`   2. Release será publicado em: https://github.com/giovanycoelho/GPTWhats/releases`);
    console.log(`   3. Auto-updates serão notificados automaticamente`);
    console.log(`   4. Monitore o build em: https://github.com/giovanycoelho/GPTWhats/actions`);
    
  } catch (error) {
    console.error('\n❌ Erro durante o release:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function quickRelease() {
  try {
    console.log('⚡ Quick Release - GPTWhats\n');
    
    const currentVersion = getCurrentVersion();
    const versionParts = currentVersion.split('.').map(Number);
    versionParts[2]++; // Incrementa patch version
    const newVersion = versionParts.join('.');
    
    console.log(`📋 Versão: ${currentVersion} → ${newVersion}`);
    
    const confirm = await question(`🚀 Criar release v${newVersion}? (y/N): `);
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Release cancelado');
      process.exit(0);
    }
    
    // Atualizar versão
    updateVersion(newVersion);
    
    // Build
    console.log('\n=== Building ===');
    await runCommand('node', ['build-electron.js']);
    
    // Git operations
    console.log('\n=== Git Operations ===');
    await runCommand('git', ['add', '.']);
    await runCommand('git', ['commit', '-m', `chore: release v${newVersion}`]);
    await runCommand('git', ['tag', `v${newVersion}`]);
    await runCommand('git', ['push', 'origin', 'main']);
    await runCommand('git', ['push', 'origin', `v${newVersion}`]);
    
    console.log(`\n🎉 Quick release v${newVersion} publicado!`);
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Main
const mode = process.argv[2];

if (mode === 'quick') {
  quickRelease();
} else {
  createRelease();
}