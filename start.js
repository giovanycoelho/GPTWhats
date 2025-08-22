import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting GPTWhats...');

// Ensure directories exist
const dirs = ['sessions', 'uploads', 'temp'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Start backend
const backend = spawn('node', ['src/server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start frontend after a short delay
setTimeout(() => {
  const frontend = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, 'client'),
    shell: true
  });

  frontend.on('close', (code) => {
    console.log(`Frontend exited with code ${code}`);
  });
}, 2000);

backend.on('close', (code) => {
  console.log(`Backend exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down GPTWhats...');
  backend.kill();
  process.exit(0);
});

console.log('✅ GPTWhats is starting up...');
console.log('🌐 Frontend will be available at: http://localhost:3000');
console.log('🔧 Backend API will be available at: http://localhost:3001');