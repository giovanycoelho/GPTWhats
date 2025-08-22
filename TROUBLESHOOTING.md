# 🔧 Solução de Problemas - GPTWhats

Guia completo para resolver problemas comuns do GPTWhats.

## 🚨 Problemas Mais Comuns

### 1. QR Code não conecta / "pairing configured successfully, expect to restart the connection..."

**Sintomas:**
- QR Code aparece
- Você escaneia com WhatsApp
- Mostra "pairing configured successfully" 
- Servidor reinicia (nodemon)
- WhatsApp não conecta

**Solução:**
```bash
# 1. Pare o servidor (Ctrl+C)

# 2. Limpe a sessão
rm -rf sessions/

# 3. Inicie APENAS o servidor (sem nodemon)
npm start

# 4. Em outro terminal, inicie o frontend
cd client && npm run dev

# 5. Acesse http://localhost:3000
# 6. Conecte o WhatsApp
# 7. NÃO PARE O SERVIDOR durante o pairing
```

**Explicação:** O nodemon reinicia o servidor durante o pairing, interrompendo a conexão. Use `npm start` em vez de `npm run dev` durante a primeira conexão.

### 2. Database Error: "no such table: config"

**Sintomas:**
```
Error getting config: [Error: SQLITE_ERROR: no such table: config]
```

**Solução:**
```bash
# 1. Deletar database corrupto
rm database.sqlite

# 2. Reiniciar servidor
npm start
```

### 3. FFmpeg not found

**Sintomas:**
```
Error: spawn ffmpeg ENOENT
```

**Solução Windows:**
```bash
# Instalar via Chocolatey
choco install ffmpeg

# Ou baixar manualmente e adicionar ao PATH
# https://ffmpeg.org/download.html
```

**Solução macOS:**
```bash
brew install ffmpeg
```

**Solução Linux:**
```bash
sudo apt update && sudo apt install ffmpeg
```

### 4. OpenAI API Error

**Sintomas:**
```
OpenAI API key not valid
Error 401: Unauthorized
```

**Soluções:**
1. **Verificar Chave API:**
   - Acesse https://platform.openai.com/api-keys
   - Gere nova chave se necessário
   - Cole exatamente como gerada

2. **Verificar Créditos:**
   - Acesse https://platform.openai.com/usage
   - Verifique se tem créditos disponíveis

3. **Verificar Modelo:**
   - GPT-5 Mini pode não estar disponível ainda
   - Temporariamente use `gpt-4o-mini`

### 5. WhatsApp Web Connection Issues

**Sintomas:**
- Connection timeout
- Multiple disconnections
- QR Code não carrega

**Soluções:**
1. **Verificar WhatsApp Web:**
   ```bash
   # Teste se WhatsApp Web funciona normalmente
   # Acesse: https://web.whatsapp.com/
   ```

2. **Limpar Sessão Completamente:**
   ```bash
   rm -rf sessions/
   rm database.sqlite
   npm start
   ```

3. **Verificar Firewall:**
   - Libere portas 3000 e 3001
   - Desative temporariamente antivírus

### 6. Port Already in Use

**Sintomas:**
```
Error: listen EADDRINUSE :::3001
```

**Solução Windows:**
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Solução macOS/Linux:**
```bash
lsof -ti:3001 | xargs kill
```

### 7. Socket.io Connection Failed

**Sintomas:**
- Frontend não conecta com backend
- Status sempre "Desconectado do servidor"

**Soluções:**
1. **Verificar URLs:**
   - Backend: http://localhost:3001
   - Frontend: http://localhost:3000

2. **Verificar CORS:**
   - Confirme que CORS está configurado corretamente

3. **Verificar Proxy:**
   - Verifique configuração do Vite proxy

### 8. Audio Processing Errors

**Sintomas:**
```
Error converting OGG to MP3
Error transcribing audio
```

**Soluções:**
1. **Verificar FFmpeg:**
   ```bash
   ffmpeg -version
   ```

2. **Permissões de Pasta:**
   ```bash
   mkdir -p temp
   chmod 755 temp
   ```

3. **OpenAI Whisper:**
   - Verificar se chave tem acesso ao Whisper
   - Verificar créditos da conta

## 🔍 Diagnóstico Avançado

### Verificar Logs Detalhados

1. **Backend Logs:**
   ```bash
   npm start 2>&1 | tee server.log
   ```

2. **Frontend Logs:**
   ```bash
   cd client && npm run dev 2>&1 | tee client.log
   ```

3. **Database Logs:**
   ```bash
   sqlite3 database.sqlite ".schema"
   ```

### Testar Componentes Individualmente

1. **Testar OpenAI API:**
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}' \
        https://api.openai.com/v1/chat/completions
   ```

2. **Testar Database:**
   ```bash
   node -e "
   import db from './src/config/database.js';
   console.log('Testing database connection...');
   "
   ```

3. **Testar FFmpeg:**
   ```bash
   ffmpeg -f lavfi -i testsrc2=duration=1:size=320x240:rate=1 test.mp4
   ```

## 🚀 Início Limpo (Reset Total)

Se nada funcionar, faça um reset completo:

```bash
# 1. Parar todos os processos
pkill -f "node.*server.js"
pkill -f "vite"

# 2. Limpar dados
rm -rf node_modules/
rm -rf client/node_modules/
rm -rf sessions/
rm -rf uploads/
rm -rf temp/
rm database.sqlite

# 3. Reinstalar
npm run install-all

# 4. Reconfigurar .env
cp .env.example .env
# Editar .env com suas configurações

# 5. Iniciar em produção
npm start

# 6. Em outro terminal
cd client && npm run build && npm run preview
```

## 📞 Processo de Conexão WhatsApp (Passo a Passo)

1. **Preparar Ambiente:**
   ```bash
   # Certifique-se que NADA está rodando
   pkill -f node
   rm -rf sessions/
   ```

2. **Iniciar Servidor:**
   ```bash
   npm start  # NÃO use npm run dev
   ```

3. **Iniciar Frontend (outro terminal):**
   ```bash
   cd client && npm run dev
   ```

4. **Conectar WhatsApp:**
   - Acesse http://localhost:3000
   - Vá para página "WhatsApp"
   - Clique "Conectar WhatsApp"
   - **AGUARDE** o QR Code aparecer
   - Escaneie com WhatsApp
   - **NÃO PARE** o servidor até conectar completamente

5. **Aguardar Conexão:**
   - Você verá: "pairing configured successfully"
   - O servidor irá reconectar automaticamente
   - Aguarde até ver: "WhatsApp connected successfully"

6. **Testar:**
   - Envie uma mensagem para o número conectado
   - Aguarde 10 segundos (delay padrão)
   - Verifique se o bot responde

## 🆘 Ainda não funciona?

1. **Verificar Versões:**
   ```bash
   node --version  # Deve ser 18+
   npm --version
   ffmpeg -version
   ```

2. **Verificar Dependências:**
   ```bash
   npm ls @whiskeysockets/baileys
   npm ls openai
   ```

3. **Logs Detalhados:**
   ```bash
   DEBUG=baileys* npm start
   ```

4. **Testar com WhatsApp Business:**
   - Às vezes WhatsApp pessoal tem restrições
   - Tente com WhatsApp Business

5. **Verificar Região:**
   - Alguns países têm restrições
   - Use VPN se necessário

## 📧 Reportar Problema

Se ainda assim não funcionar, reporte o problema incluindo:

1. Sistema operacional
2. Versões do Node.js, npm, FFmpeg
3. Logs completos do erro
4. Passos que levaram ao problema
5. Screenshot do erro (se aplicável)

```bash
# Comando para coletar informações do sistema
echo "OS: $(uname -a)"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "FFmpeg: $(ffmpeg -version 2>&1 | head -1)"
```