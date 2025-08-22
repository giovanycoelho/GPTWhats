# 🚀 Informações Corretas dos Modelos GPT-5

Baseado na pesquisa oficial da OpenAI, aqui estão os **nomes corretos** dos modelos GPT-5 disponíveis na API:

## 📋 **Modelos GPT-5 Oficiais (2025)**

### **1. Modelos Principais (Main)**
- `gpt-5` - Modelo completo principal
- `gpt-5-mini` - Versão Mini (mais rápida e barata)
- `gpt-5-nano` - Versão Nano (ainda mais rápida)

### **2. Modelos com Raciocínio (Thinking)**  
- `gpt-5-thinking` - Modelo com capacidade de raciocínio
- `gpt-5-thinking-mini` - Versão Mini com raciocínio
- `gpt-5-thinking-nano` - Versão Nano com raciocínio

### **3. Modelos Internos (System Card)**
- `gpt-5-main` - Modelo rápido de alto throughput
- `gpt-5-main-mini` - Mini rápido de alto throughput

## 💰 **Preços Oficiais (2025)**

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|------------------|-------------------|
| `gpt-5` | $1.25 | $10.00 |
| `gpt-5-mini` | $0.25 | $2.00 |
| `gpt-5-nano` | $0.05 | $0.40 |

## ⚙️ **Parâmetros Específicos do GPT-5**

### **Parâmetros Únicos:**
- `reasoning_effort`: `"minimal"` | `"low"` | `"medium"` | `"high"`
- `max_completion_tokens`: substitui `max_tokens`
- Suporte a `verbosity`: `"low"` | `"medium"` | `"high"`

### **⚠️ Limitações GPT-5 Mini:**
- **temperature**: Apenas aceita o valor padrão (1), não pode ser customizado
- **Outros parâmetros**: Podem ter restrições similares

### **Limites:**
- **Input**: 272,000 tokens
- **Output**: 128,000 tokens (inclui tokens de raciocínio invisíveis)
- **Suporte**: Texto e imagem para input, apenas texto para output

## 🔧 **Configuração Atual do GPTWhats**

Estamos usando **apenas** `gpt-5-mini` como especificado:

```javascript
{
  model: 'gpt-5-mini',
  messages: filteredMessages,
  max_completion_tokens: 150,
  // temperature: 1 (padrão) - GPT-5 Mini não permite customização
  reasoning_effort: 'minimal'
}
```

## ✅ **Correções Aplicadas**

1. **❌ Fallbacks Removidos**: Não usa mais GPT-4o Mini
2. **✅ Apenas GPT-5 Mini**: Como solicitado
3. **🛡️ Filtros de Mensagem**: Remove mensagens com `content: null`
4. **🔍 Debug Logs**: Mostra quantas mensagens são enviadas
5. **⚠️ Error Handling**: Logs específicos para erros de modelo
6. **🌡️ Temperature Fix**: Removido `temperature: 0.8` (GPT-5 Mini só aceita padrão)

## 🚨 **Possíveis Problemas**

### **Se GPT-5 Mini não estiver disponível:**
- **Motivo**: Conta pode não ter acesso ainda
- **Solução**: Verificar com OpenAI suporte
- **Alternativa**: Aguardar disponibilidade na conta

### **Se modelo não for encontrado:**
```
Error: The model `gpt-5-mini` does not exist
```
**Possibilidades:**
1. Conta não tem acesso ao GPT-5 Mini
2. Modelo ainda não foi liberado na região
3. Nome pode ser diferente (ex: `gpt-5-chat`, `gpt-5-main-mini`)

## 🔍 **Testes para Verificar Disponibilidade**

### **Comando cURL para testar:**
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

### **Verificar modelos disponíveis:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.openai.com/v1/models
```

## 📞 **Próximos Passos**

1. **Teste o sistema** enviando mensagem para WhatsApp
2. **Verifique logs** para ver se chega ao GPT-5 Mini  
3. **Se der erro de modelo**, verifique disponibilidade na sua conta
4. **Contate OpenAI** se necessário para acesso ao GPT-5 Mini

**O sistema agora está configurado para usar EXCLUSIVAMENTE GPT-5 Mini! 🎯**