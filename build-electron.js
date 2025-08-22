#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Iniciando build do GPTWhats para Electron...\n');

// Helper function to run commands
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

// Helper function to check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Helper function to create directory if it doesn't exist
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Diretório criado: ${dirPath}`);
  }
}

async function buildElectronApp() {
  try {
    // Step 1: Install dependencies if needed
    console.log('\n=== STEP 1: Verificando dependências ===');
    
    if (!fileExists(path.join(__dirname, 'node_modules'))) {
      console.log('📦 Instalando dependências do backend...');
      await runCommand('npm', ['install']);
    } else {
      console.log('✅ Dependências do backend já instaladas');
    }

    if (!fileExists(path.join(__dirname, 'client', 'node_modules'))) {
      console.log('📦 Instalando dependências do frontend...');
      await runCommand('npm', ['install'], { cwd: path.join(__dirname, 'client') });
    } else {
      console.log('✅ Dependências do frontend já instaladas');
    }

    // Step 2: Build React app
    console.log('\n=== STEP 2: Building React App ===');
    await runCommand('npm', ['run', 'build'], { cwd: path.join(__dirname, 'client') });
    console.log('✅ React app construído com sucesso');

    // Step 3: Create assets directory and placeholder files
    console.log('\n=== STEP 3: Preparando assets ===');
    ensureDir(path.join(__dirname, 'assets'));
    
    // Create placeholder icon if it doesn't exist
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    const icoPath = path.join(__dirname, 'assets', 'icon.ico');
    
    if (!fileExists(iconPath)) {
      console.log('⚠️ Ícone PNG não encontrado. Criando placeholder...');
      // You should replace this with actual icon creation
      fs.writeFileSync(iconPath, ''); // Placeholder
    }
    
    if (!fileExists(icoPath)) {
      console.log('⚠️ Ícone ICO não encontrado. Criando placeholder...');
      // You should replace this with actual icon creation
      fs.writeFileSync(icoPath, ''); // Placeholder
    }

    // Step 4: Create necessary directories
    console.log('\n=== STEP 4: Preparando estrutura de diretórios ===');
    ensureDir(path.join(__dirname, 'temp'));
    ensureDir(path.join(__dirname, 'uploads'));
    
    // Ensure sessions directory exists but don't include in git
    if (!fileExists(path.join(__dirname, 'sessions'))) {
      ensureDir(path.join(__dirname, 'sessions'));
      console.log('📁 Diretório sessions criado');
    }

    // Step 5: Build Electron app
    console.log('\n=== STEP 5: Building Electron App ===');
    
    // For Windows
    await runCommand('npx', ['electron-builder', '--win', '--x64']);
    
    console.log('\n🎉 Build concluído com sucesso!');
    console.log('\n📋 Arquivos gerados:');
    console.log(`   - Instalador: ${path.join(__dirname, 'dist', 'GPTWhats Setup *.exe')}`);
    console.log(`   - Executável portátil: ${path.join(__dirname, 'dist', 'win-unpacked', 'GPTWhats.exe')}`);
    
    console.log('\n📝 Próximos passos:');
    console.log('   1. Teste o executável na pasta dist/win-unpacked/');
    console.log('   2. Distribua o instalador GPTWhats Setup.exe');
    console.log('   3. Configure um repositório GitHub para auto-updates');
    console.log('   4. Adicione ícones personalizados na pasta assets/');

  } catch (error) {
    console.error('\n❌ Erro durante o build:', error.message);
    process.exit(1);
  }
}

// Step 6: Create release notes template
function createReleaseNotes() {
  const releaseNotesPath = path.join(__dirname, 'release-notes.md');
  
  if (!fileExists(releaseNotesPath)) {
    const template = `# Release Notes

## Versão 1.0.0
### Novo
- Interface completa para gerenciamento do bot WhatsApp
- Integração com GPT-5 Mini da OpenAI
- Suporte a mensagens de texto, áudio, imagens e documentos
- Sistema de configuração avançado
- Auto-updates automáticos
- Dashboard com estatísticas em tempo real
- Gerenciamento de contatos
- Sistema de notificações externas

### Melhorias
- Performance otimizada para grandes volumes de mensagens
- Interface responsiva e moderna
- Segurança aprimorada com rate limiting
- Logs detalhados para troubleshooting

### Correções
- Correção na persistência de configurações
- Melhoria na estabilidade da conexão WhatsApp
- Otimização no processamento de áudio

---

## Como atualizar
O GPTWhats possui sistema de atualização automática. Quando uma nova versão estiver disponível, você será notificado e pode escolher atualizar imediatamente ou no próximo reinício.

## Suporte
Para reportar problemas ou sugestões, abra uma issue no repositório do GitHub.
`;

    fs.writeFileSync(releaseNotesPath, template);
    console.log('📝 Arquivo release-notes.md criado');
  }
}

// Run the build process
if (import.meta.url === `file://${process.argv[1]}`) {
  buildElectronApp()
    .then(() => {
      createReleaseNotes();
      console.log('\n✨ Tudo pronto para distribuição!');
    })
    .catch((error) => {
      console.error('❌ Build falhou:', error);
      process.exit(1);
    });
}