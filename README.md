# GPTWhats - WhatsApp AI Bot with GPT-5 Mini

Um bot inteligente para WhatsApp que utiliza o GPT-5 Mini da OpenAI para responder mensagens de forma humanizada e natural.

![GPTWhats](https://img.shields.io/badge/GPT--5-Mini-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Baileys-green.svg)

## 🚀 Características Principais

### 🤖 IA Avançada
- **GPT-5 Mini Integration**: Utiliza o mais recente modelo GPT-5 Mini da OpenAI
- **Respostas Humanizadas**: Simula digitação e gravação de áudio
- **Memória Contextual**: Lembra conversas por 1 hora para manter contexto
- **Anti-Loop Protection**: Evita loops infinitos em conversas com outros bots

### 📱 Funcionalidades WhatsApp
- **Conexão via QR Code**: Fácil conexão usando Baileys
- **Múltiplos Formatos**: Suporta texto, áudio, imagem e documentos
- **Status Inteligente**: Fica online apenas ao responder
- **Rejeição de Chamadas**: Rejeita chamadas automaticamente após 3 segundos

### 🎵 Processamento de Áudio
- **Conversão Automática**: OGG para MP3 usando FFmpeg
- **Transcrição**: Whisper para transcrever áudios recebidos
- **Síntese de Voz**: Responde com áudio quando configurado
- **Filtro Inteligente**: Links e telefones sempre em texto

### ⏱️ Sistema de Delay Configurável
- **Mensagens Agrupadas**: Aguarda um tempo configurável para agrupar mensagens
- **Resposta Única**: Processa múltiplas mensagens em uma resposta coesa
- **Mais Natural**: Simula comportamento humano real

### 🎨 Interface Moderna
- **Glassmorphism Design**: Interface moderna com efeitos de vidro
- **Tema Escuro**: Design elegante e confortável
- **Responsivo**: Funciona perfeitamente em desktop e mobile
- **Real-time**: Atualizações em tempo real via WebSocket

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- FFmpeg (para conversão de áudio)
- Chave API OpenAI (GPT-5 Mini)
- Conta WhatsApp

## ⚡ Instalação Rápida

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/gptwhats.git
cd gptwhats
```

### 2. Instale as dependências
```bash
npm run install-all
```

### 3. Configure o ambiente
```bash
cp .env.example .env
cp client/.env.example client/.env
```

### 4. Configure sua chave OpenAI
Edite o arquivo `.env` e adicione:
```env
OPENAI_API_KEY=sk-sua-chave-aqui
```

### 5. Execute o projeto
```bash
npm run dev
```

### 6. Acesse a interface
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 🔧 Configuração Detalhada

### OpenAI API
1. Acesse [OpenAI Platform](https://platform.openai.com/api-keys)
2. Crie uma nova chave API
3. Cole na configuração do sistema
4. O GPT-5 Mini será usado automaticamente

### WhatsApp
1. Acesse a página "WhatsApp" na interface
2. Clique em "Conectar WhatsApp"
3. Escaneie o QR Code com seu WhatsApp
4. Aguarde a confirmação de conexão

### Configurações Avançadas
- **Prompt do Sistema**: Define personalidade da IA
- **Delay de Resposta**: Tempo para agrupar mensagens (recomendado: 10s)
- **Áudio Habilitado**: Responde com áudio quando recebe áudio
- **Emojis**: Adiciona emojis naturalmente
- **Rejeição de Chamadas**: Rejeita e envia mensagem automática

## 📁 Estrutura do Projeto

```
GPTWhats/
├── src/                    # Backend Node.js
│   ├── controllers/        # Controladores da API
│   ├── services/          # Serviços (WhatsApp, AI, Audio, etc)
│   ├── models/            # Modelos de dados
│   ├── config/            # Configurações (Database, etc)
│   ├── middleware/        # Middlewares (Rate limiting, etc)
│   └── utils/             # Utilitários
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas
│   │   ├── contexts/      # Context API
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Utilitários frontend
│   └── public/           # Arquivos públicos
├── sessions/             # Sessões WhatsApp
├── uploads/              # Arquivos enviados
└── temp/                 # Arquivos temporários
```

## 🔍 Como Funciona

### Fluxo de Mensagens
1. **Recepção**: Mensagem chega via Baileys
2. **Delay**: Sistema aguarda tempo configurado
3. **Agrupamento**: Múltiplas mensagens são agrupadas
4. **Processamento**: IA processa com contexto da conversa
5. **Humanização**: Resposta é dividida e enviada naturalmente
6. **Status**: Bot fica online apenas durante envio

### Sistema de Memória
- Conversas ficam na memória por 1 hora
- Contexto de até 50 mensagens por conversa
- Limpeza automática de conversas expiradas

### Anti-Spam e Anti-Loop
- Detecta mensagens repetitivas
- Evita loops com outros bots
- Rate limiting para requisições

## 🎛️ Dashboard e Métricas

### Visão Geral
- Total de mensagens enviadas/recebidas
- Conversas ativas
- Tempo online
- Estatísticas de contatos

### Gráficos de Atividade
- Atividade diária/semanal/mensal
- Comparação de períodos
- Picos de uso

### Gerenciamento de Contatos
- Lista completa de contatos
- Busca e filtros
- Exportação CSV
- Estatísticas por contato

## 🔒 Segurança

- Rate limiting para prevenir abuso
- Sanitização de dados de entrada
- Não expõe chaves API no frontend
- Logs de segurança
- Validação de entrada rigorosa

## 🚀 Deploy

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

### Docker (Opcional)
```bash
docker-compose up -d
```

## 📊 Monitoramento

### Logs
- Logs detalhados de operações
- Tracking de erros
- Métricas de performance

### WebSocket
- Status de conexão em tempo real
- Notificações instantâneas
- Atualizações de QR Code

## 🛠️ Desenvolvimento

### Scripts Disponíveis
```bash
npm run dev          # Desenvolvimento (backend + frontend)
npm run server       # Apenas backend
npm run client       # Apenas frontend
npm run build        # Build para produção
npm run install-all  # Instala todas as dependências
```

### Estrutura de Desenvolvimento
- Hot reload no frontend e backend
- ESLint para qualidade de código
- Prettier para formatação
- Ambiente de desenvolvimento otimizado

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Se você encontrar problemas ou tiver dúvidas:

1. Verifique se todas as dependências estão instaladas
2. Confirme se o FFmpeg está disponível no PATH
3. Verifique se a chave OpenAI está correta
4. Consulte os logs para erros específicos

### Problemas Comuns

**WhatsApp não conecta:**
- Limpe a sessão e gere novo QR Code
- Verifique se o WhatsApp Web está funcionando
- Aguarde alguns minutos entre tentativas

**Áudio não funciona:**
- Instale FFmpeg corretamente
- Verifique permissões de pasta temp/
- Confirme se a chave OpenAI tem acesso ao Whisper

**IA não responde:**
- Verifique a chave OpenAI
- Confirme se tem créditos na conta OpenAI
- Verifique os logs do servidor

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- OpenAI pelo GPT-5 Mini
- WhiskeySockets pela biblioteca Baileys
- Comunidade open source por todas as bibliotecas utilizadas

---

Feito com ❤️ usando GPT-5 Mini e React