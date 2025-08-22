# 📦 Guia de Instalação - GPTWhats

Este guia vai te ajudar a instalar e configurar o GPTWhats passo a passo.

## 🖥️ Requisitos do Sistema

### Obrigatórios
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (vem com Node.js) ou **yarn**
- **FFmpeg** - Para processamento de áudio
- **Chave API OpenAI** - Para GPT-5 Mini
- **Conta WhatsApp** - Para conectar o bot

### Opcionais
- **Git** - Para clonar o repositório
- **VS Code** - Editor recomendado

## 🏁 Instalação Passo a Passo

### 1. Preparar o Ambiente

#### Windows
```bash
# Instalar Node.js 18+ do site oficial
# Instalar FFmpeg via Chocolatey (recomendado)
choco install ffmpeg

# Ou baixar manualmente de https://ffmpeg.org/download.html
# e adicionar ao PATH do sistema
```

#### macOS
```bash
# Instalar Homebrew se não tiver
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Node.js e FFmpeg
brew install node ffmpeg
```

#### Linux (Ubuntu/Debian)
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar FFmpeg
sudo apt install ffmpeg -y
```

### 2. Obter o Código

#### Opção 1: Download ZIP
1. Vá para o repositório no GitHub
2. Clique em "Code" → "Download ZIP"
3. Extraia o arquivo ZIP
4. Navegue para a pasta extraída

#### Opção 2: Git Clone
```bash
git clone https://github.com/seu-usuario/gptwhats.git
cd gptwhats
```

### 3. Instalar Dependências

```bash
# Instalar todas as dependências (backend + frontend)
npm run install-all

# Ou instalar separadamente
npm install              # Backend
cd client && npm install # Frontend
cd ..                    # Voltar para raiz
```

### 4. Configurar Variáveis de Ambiente

#### Backend (.env)
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar arquivo .env
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:3000

# OpenAI Configuration
OPENAI_API_KEY=sua_chave_api_aqui

# Database
DB_PATH=./database.sqlite

# Outras configurações (opcionais)
SESSION_TIMEOUT=3600000
AUDIO_ENABLED=true
MAX_AUDIO_DURATION=60
MAX_RESPONSE_LENGTH=200
DEFAULT_DELAY=10000
TYPING_DELAY=1000
```

#### Frontend (client/.env)
```bash
# Copiar arquivo de exemplo
cp client/.env.example client/.env

# Editar arquivo client/.env
VITE_API_URL=http://localhost:3001/api
VITE_SERVER_URL=http://localhost:3001
```

### 5. Obter Chave API OpenAI

1. **Criar Conta**: Vá para [OpenAI Platform](https://platform.openai.com/)
2. **Fazer Login**: Entre com sua conta
3. **Acessar API Keys**: Vá para [API Keys](https://platform.openai.com/api-keys)
4. **Criar Nova Chave**: Clique em "Create new secret key"
5. **Copiar Chave**: Cole no arquivo `.env` em `OPENAI_API_KEY`

> **Importante**: Você precisa ter créditos na sua conta OpenAI para usar a API.

### 6. Verificar Instalação

```bash
# Verificar Node.js
node --version  # Deve ser 18+

# Verificar npm
npm --version

# Verificar FFmpeg
ffmpeg -version

# Verificar se todas as dependências foram instaladas
npm list --depth=0
cd client && npm list --depth=0
```

### 7. Primeiro Teste

```bash
# Executar em modo desenvolvimento
npm run dev

# Ou executar separadamente
npm run server  # Terminal 1
npm run client  # Terminal 2
```

Se tudo der certo, você verá:
- Backend: `🚀 Server running on port 3001`
- Frontend: Abrirá automaticamente no navegador em `http://localhost:3000`

## 🔧 Configuração Inicial

### 1. Acessar Interface
- Abra o navegador em `http://localhost:3000`
- Você deve ver a interface do GPTWhats

### 2. Configurar OpenAI
1. Vá para "Configurações"
2. Cole sua chave API OpenAI
3. Configure o prompt do sistema (opcional)
4. Clique em "Salvar"

### 3. Conectar WhatsApp
1. Vá para a página "WhatsApp"
2. Clique em "Conectar WhatsApp"
3. Escaneie o QR Code com seu WhatsApp
4. Aguarde a confirmação de conexão

### 4. Testar Bot
1. Envie uma mensagem para o número conectado
2. Aguarde 10 segundos (delay padrão)
3. O bot deve responder automaticamente

## 🚨 Solução de Problemas

### Erro: "FFmpeg not found"
```bash
# Windows - Verificar se FFmpeg está no PATH
where ffmpeg

# macOS/Linux - Verificar se FFmpeg está instalado
which ffmpeg

# Se não estiver, reinstalar
```

### Erro: "OpenAI API key not valid"
1. Verifique se copiou a chave completa
2. Confirme se tem créditos na conta OpenAI
3. Tente gerar nova chave API

### Erro: "WhatsApp connection failed"
1. Limpe a sessão e tente novamente
2. Aguarde alguns minutos entre tentativas
3. Verifique se WhatsApp Web funciona normalmente

### Porta 3000 ou 3001 em uso
```bash
# Matar processos nas portas
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill
```

### Dependências não instalando
```bash
# Limpar cache npm
npm cache clean --force

# Deletar node_modules e reinstalar
rm -rf node_modules client/node_modules
npm run install-all
```

## 📈 Próximos Passos

Após a instalação bem-sucedida:

1. **Personalize o Bot**: Configure prompts e personalidade
2. **Ajuste Configurações**: Delay, áudio, emojis, etc.
3. **Monitor Dashboard**: Acompanhe métricas e atividade
4. **Gerencie Contatos**: Use a página de contatos
5. **Configure Backup**: Configure backup da base de dados

## 🆘 Precisa de Ajuda?

- **Issues**: Abra uma issue no GitHub
- **Discord**: Entre no servidor de discussões
- **Email**: Entre em contato por email
- **Documentação**: Consulte a documentação completa

## 📱 Deploy em Produção

Para colocar em produção, consulte o [Guia de Deploy](DEPLOY.md).