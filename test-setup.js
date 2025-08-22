#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testando configuração do GPTWhats para deployment...\n');

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${description}: ${filePath}`);
  return exists;
}

function checkPackageJson() {
  const packagePath = path.join(__dirname, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  console.log('\n📦 Verificação package.json:');
  console.log(`   Nome: ${pkg.name}`);
  console.log(`   Versão: ${pkg.version}`);
  console.log(`   Main: ${pkg.main}`);
  
  const hasElectron = pkg.devDependencies && pkg.devDependencies.electron;
  const hasBuilder = pkg.devDependencies && pkg.devDependencies['electron-builder'];
  const hasUpdater = pkg.dependencies && pkg.dependencies['electron-updater'];
  
  console.log(`   ${hasElectron ? '✅' : '❌'} Electron instalado`);
  console.log(`   ${hasBuilder ? '✅' : '❌'} Electron-builder instalado`);
  console.log(`   ${hasUpdater ? '✅' : '❌'} Electron-updater instalado`);
  
  const buildConfig = pkg.build;
  if (buildConfig) {
    console.log(`   ✅ Configuração build encontrada`);
    console.log(`   AppId: ${buildConfig.appId}`);
    console.log(`   Repo: ${buildConfig.publish?.owner}/${buildConfig.publish?.repo}`);
  } else {
    console.log(`   ❌ Configuração build não encontrada`);
  }
  
  return hasElectron && hasBuilder && hasUpdater && buildConfig;
}

async function testBuild() {
  console.log('\n🔨 Testando build rápido...');
  
  return new Promise((resolve) => {
    const process = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, 'client'),
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Build do frontend funcionando');
        resolve(true);
      } else {
        console.log('❌ Build do frontend falhou');
        resolve(false);
      }
    });

    process.on('error', () => {
      console.log('❌ Erro ao testar build');
      resolve(false);
    });
  });
}

function generateReport() {
  console.log('\n📋 RELATÓRIO DE CONFIGURAÇÃO');
  console.log('=' .repeat(50));
  
  // Arquivos essenciais
  let score = 0;
  const checks = [
    [path.join(__dirname, 'electron.js'), 'Electron main process'],
    [path.join(__dirname, 'preload.js'), 'Preload script'],
    [path.join(__dirname, 'build-electron.js'), 'Build script'],
    [path.join(__dirname, 'release.js'), 'Release script'],
    [path.join(__dirname, '.github/workflows/release.yml'), 'GitHub Actions'],
    [path.join(__dirname, 'assets/icon.png'), 'Ícone PNG'],
    [path.join(__dirname, 'assets/icon.ico'), 'Ícone ICO'],
    [path.join(__dirname, 'installer.nsh'), 'Script instalador'],
  ];
  
  checks.forEach(([file, desc]) => {
    if (checkFile(file, desc)) score++;
  });
  
  // Package.json
  if (checkPackageJson()) score++;
  
  console.log(`\n🎯 Score: ${score}/${checks.length + 1}`);
  
  if (score === checks.length + 1) {
    console.log('🎉 CONFIGURAÇÃO COMPLETA!');
    console.log('\n✅ Próximos passos:');
    console.log('   1. npm run electron:dev  # Testar localmente');
    console.log('   2. node build-electron.js  # Gerar executável');
    console.log('   3. npm run release  # Publicar release');
  } else {
    console.log('⚠️ CONFIGURAÇÃO INCOMPLETA');
    console.log('\n❌ Execute os comandos que falharam primeiro');
  }
}

async function main() {
  generateReport();
  
  console.log('\n🧪 Testando dependências...');
  
  // Verificar se node_modules existe
  const hasNodeModules = checkFile(path.join(__dirname, 'node_modules'), 'Backend dependencies');
  const hasClientNodeModules = checkFile(path.join(__dirname, 'client/node_modules'), 'Frontend dependencies');
  
  if (!hasNodeModules) {
    console.log('\n📦 Instalando dependências do backend...');
    await new Promise((resolve) => {
      const process = spawn('npm', ['install'], {
        stdio: 'inherit',
        shell: true
      });
      process.on('close', resolve);
    });
  }
  
  if (!hasClientNodeModules) {
    console.log('\n📦 Instalando dependências do frontend...');
    await new Promise((resolve) => {
      const process = spawn('npm', ['install'], {
        cwd: path.join(__dirname, 'client'),
        stdio: 'inherit',
        shell: true
      });
      process.on('close', resolve);
    });
  }
  
  // Testar build
  const buildOk = await testBuild();
  
  console.log('\n' + '='.repeat(50));
  console.log(buildOk ? '🎉 SETUP READY FOR DEPLOYMENT!' : '❌ SETUP NEEDS ATTENTION');
  console.log('='.repeat(50));
}

main().catch(console.error);