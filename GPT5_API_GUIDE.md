# 🚀 Guia da API GPT-5 Mini

## ✅ **Correções Aplicadas**

O erro que você estava enfrentando foi resolvido! As principais mudanças:

### **🔧 Parâmetros da API Atualizados:**
- ❌ `max_tokens` → ✅ `max_completion_tokens`
- ❌ `verbosity` → ✅ Removido (não necessário)
- ✅ `reasoning_effort: 'minimal'` (específico do GPT-5)

### **📋 Configuração Atual da API:**
```javascript
{
  model: 'gpt-5-mini',
  messages: messages,
  max_completion_tokens: 150,
  temperature: 0.8,
  reasoning_effort: 'minimal'
}
```

## 🎯 **Como Usar o GPT-5 Mini**

### **1. Verificar Chave API**
- Acesse [OpenAI Platform](https://platform.openai.com/api-keys)
- Certifique-se que sua chave tem acesso ao GPT-5 Mini
- Verifique se há créditos suficientes

### **2. Configurar no Sistema**
1. Vá para **Configurações**
2. Cole sua chave API da OpenAI
3. O sistema usará automaticamente `gpt-5-mini`

### **3. Parâmetros Específicos do GPT-5**

**Parâmetros Suportados:**
- ✅ `model: 'gpt-5-mini'`
- ✅ `messages: []`
- ✅ `max_completion_tokens: number`
- ✅ `temperature: 0.0-2.0`
- ✅ `reasoning_effort: 'minimal' | 'medium' | 'maximum'`

**Parâmetros NÃO Suportados:**
- ❌ `max_tokens` (use `max_completion_tokens`)
- ❌ `verbosity` (removido)
- ❌ `n` (múltiplas respostas)

## 💰 **Custos GPT-5 Mini (2025)**

- **Input**: $0.25 por 1M tokens
- **Output**: $2.00 por 1M tokens
- **Mais barato** que GPT-5 completo
- **Mais rápido** para respostas simples

## 🔍 **Testando a API**

### **Comando de Teste Manual:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "gpt-5-mini",
       "messages": [{"role": "user", "content": "Hello"}],
       "max_completion_tokens": 50,
       "reasoning_effort": "minimal"
     }' \
     https://api.openai.com/v1/chat/completions
```

### **Teste no Sistema:**
1. Configure sua chave API
2. Vá para **Configurações** → **Teste OpenAI**
3. O sistema testará automaticamente a conexão

## 🚀 **Performance Otimizada**

### **reasoning_effort Explicado:**
- `'minimal'`: Resposta rápida, menos raciocínio
- `'medium'`: Balanço entre velocidade e qualidade
- `'maximum'`: Máxima qualidade, mais lento

### **Para WhatsApp (Recomendado):**
```javascript
reasoning_effort: 'minimal'  // Resposta rápida para conversas
max_completion_tokens: 150   // Limite para mensagens concisas
temperature: 0.8             // Criativo mas consistente
```

## 🔧 **Resolução de Problemas**

### **Erro 400: Unsupported parameter**
✅ **RESOLVIDO** - Parâmetros atualizados

### **Erro 401: Unauthorized**
- Verificar chave API
- Verificar permissões da conta
- Verificar créditos disponíveis

### **Erro 429: Rate limit**
- Aguardar alguns minutos
- Verificar limites da conta
- Usar `reasoning_effort: 'minimal'` para economizar

### **Modelo não encontrado**
- GPT-5 Mini pode não estar disponível em todas as regiões
- Temporariamente use `gpt-4o-mini` como fallback

## ⚡ **Status Atual**

✅ **API Configurada Corretamente**  
✅ **Parâmetros Atualizados**  
✅ **Error Handling Implementado**  
✅ **Fallback para gpt-4o-mini** (se necessário)  

## 🎉 **Resultado Esperado**

Agora quando você enviar uma mensagem para o bot:

1. ✅ Mensagem é recebida
2. ✅ IA processa com GPT-5 Mini
3. ✅ Resposta é gerada (máximo 150 tokens)
4. ✅ Resposta é humanizada (typing status)
5. ✅ Mensagem é enviada dividida naturalmente

**Teste agora enviando uma mensagem para o WhatsApp conectado!** 🚀