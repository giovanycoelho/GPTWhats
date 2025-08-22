# ⚡ Início Rápido - GPTWhats

## 🚀 **Comando Único para Iniciar Tudo**

Agora você pode iniciar frontend e backend com um só comando:

```bash
npm run dev
```

## 📋 **Opções de Inicialização**

### **1. Desenvolvimento Normal (Recomendado)**
```bash
npm run dev
```
- ✅ Inicia backend com nodemon (hot reload)
- ✅ Inicia frontend automaticamente
- ✅ Cores diferentes para cada serviço
- ⚠️ Pode reiniciar durante pareamento WhatsApp

### **2. Desenvolvimento Estável (Para Conectar WhatsApp)**
```bash
npm run dev:stable
```
- ✅ Backend estável (não reinicia)
- ✅ Frontend com hot reload
- ✅ Ideal para primeira conexão WhatsApp

### **3. Início Customizado**
```bash
npm run start:all
```
- ✅ Script personalizado otimizado
- ✅ Cria diretórios automaticamente
- ✅ Melhor gerenciamento de processos

## 🎯 **Processo Completo de 30 Segundos**

### **Passo 1: Instalar Dependências** (uma vez só)
```bash
npm run install-all
```

### **Passo 2: Configurar Ambiente** (uma vez só)
```bash
# Copiar arquivos de configuração
copy .env.example .env
copy client\.env.example client\.env

# Editar .env e adicionar sua chave OpenAI
notepad .env
```

### **Passo 3: Iniciar Tudo**
```bash
npm run dev
```

### **Passo 4: Configurar (no navegador)**
1. ✅ **Acesse:** http://localhost:3000
2. ✅ **Configurações:** Cole sua chave OpenAI GPT-5 Mini
3. ✅ **WhatsApp:** Conecte escaneando QR Code
4. ✅ **Teste:** Envie uma mensagem e aguarde resposta!

## 🔧 **Se a Conexão WhatsApp Falhar**

Use o comando estável:
```bash
# Pare o processo atual (Ctrl+C)
npm run dev:stable
```

## 📊 **O que Você Verá**

### **Terminal:**
```
[SERVER] ✅ Database connected successfully
[SERVER] 🚀 Server running on port 3001
[CLIENT] ➜  Local:   http://localhost:3000/
[CLIENT] ➜  ready in 1234 ms
```

### **Navegador:**
- 🎨 Interface moderna com glassmorphism
- 📊 Dashboard com métricas em tempo real
- ⚙️ Configurações intuitivas
- 📱 Status de conexão WhatsApp
- 👥 Gerenciamento de contatos

## ⚡ **Comandos Úteis**

```bash
# Parar tudo
Ctrl+C

# Limpar sessão WhatsApp (se necessário)
rmdir /s sessions

# Reinstalar dependências
npm run install-all

# Ver logs detalhados
npm run dev -- --verbose

# Build para produção
npm run build
```

## 🎉 **Pronto!**

Agora você tem:
- ✅ Bot WhatsApp com GPT-5 Mini
- ✅ Interface web moderna
- ✅ Dashboard com métricas
- ✅ Processamento de áudio/imagem
- ✅ Sistema anti-spam
- ✅ Respostas humanizadas

**Apenas execute `npm run dev` e comece a usar! 🚀**