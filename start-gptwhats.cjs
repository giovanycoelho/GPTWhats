#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Iniciando GPTWhats...\n');

// Função para executar comando
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Executando: ${command} ${args.join(' ')}`);
    
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

// Verificar se o Electron existe
function findElectron() {
  const possiblePaths = [
    path.join(__dirname, 'node_modules', '.bin', 'electron.cmd'),
    path.join(__dirname, 'node_modules', '.bin', 'electron'),
    path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe'),
    path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron')
  ];

  for (const electronPath of possiblePaths) {
    if (fs.existsSync(electronPath)) {
      console.log(`✅ Electron encontrado em: ${electronPath}`);
      return electronPath;
    }
  }

  console.log('⚠️ Electron local não encontrado, usando npx');
  return 'npx electron';
}

async function startGPTWhats() {
  try {
    // Verificar se dependências estão instaladas
    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
      console.log('📦 Instalando dependências...');
      await runCommand('npm', ['install']);
    }

    // Encontrar o Electron
    const electronCmd = findElectron();
    
    // Verificar se o servidor já está rodando
    const http = require('http');
    
    const isServerRunning = () => {
      return new Promise((resolve) => {
        const req = http.get('http://localhost:3001', (res) => {
          console.log('✅ Servidor já está rodando na porta 3001');
          resolve(true);
        });
        
        req.on('error', (err) => {
          console.log('⚠️ Servidor não está rodando, código:', err.code);
          resolve(false);
        });
        
        req.setTimeout(2000);
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
    };

    const serverRunning = await isServerRunning();
    
    if (!serverRunning) {
      console.log('🚀 Iniciando servidor...');
      // Iniciar servidor em background
      spawn('npm', ['start'], {
        stdio: 'inherit',
        shell: true,
        detached: false
      });
      
      // Aguardar servidor inicializar
      console.log('⏳ Aguardando servidor...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('✅ Servidor já está rodando');
    }

    // Iniciar Electron
    console.log('🖥️ Abrindo interface Electron...');
    
    if (electronCmd.includes('npx')) {
      await runCommand('npx', ['electron', '.']);
    } else {
      await runCommand(electronCmd, ['.']);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('\n🔧 Soluções alternativas:');
    console.log('1. Execute: npm install');
    console.log('2. Execute: npm start (em um terminal)');
    console.log('3. Execute: npx electron . (em outro terminal)');
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  startGPTWhats();
}

module.exports = { startGPTWhats };