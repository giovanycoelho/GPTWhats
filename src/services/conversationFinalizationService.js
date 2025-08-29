import db from '../config/database.js';

class ConversationFinalizationService {
  constructor() {
    // Padrões que indicam finalização de conversa (mais restritivos)
    this.finalizationPatterns = [
      // Despedidas claras
      /\b(tchau|xau|até logo|até mais|falou|flw|bye|adeus|goodbye)\b/i,
      // Agradecimentos finais (mais específicos)
      /\b(muito obrigad[ao]|brigad[ao] mesmo|obrigad[ao] pela ajuda|thank you very much)\b/i,
      // Confirmações finais explícitas
      /\b(tá bom então|ok então|beleza então|perfeito obrigad[ao]|entendi obrigad[ao])\b/i,
      // Finalizações educadas explícitas
      /\b(boa noite para voc[êe]|bom dia para voc[êe]|boa tarde para voc[êe]|tenha um bom [a-z]+)\b/i,
    ];

    // Padrões de respostas automáticas que podem causar loop
    this.automaticResponsePatterns = [
      /\b(de nada|disponha|imagina|por nada|sempre às ordens)\b/i,
      /\b(até logo|até mais|até breve|falou)\b/i,
      /\b(qualquer coisa|precisa de mais|posso ajudar)\b/i,
    ];

    // Cache para análises recentes
    this.analysisCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  async analyzeConversationFinalization(phone, newMessage, conversationHistory) {
    try {
      // Verificar se já analisamos recentemente
      const cacheKey = `${phone}-${Date.now()}`;
      const recentAnalysis = this.getRecentAnalysis(phone);
      if (recentAnalysis && Date.now() - recentAnalysis.timestamp < 60000) { // 1 minuto
        return recentAnalysis.result;
      }

      // Analisar contexto da conversa
      const analysis = await this.performFinalizationAnalysis(newMessage, conversationHistory);
      
      // Cache do resultado
      this.analysisCache.set(phone, {
        result: analysis,
        timestamp: Date.now()
      });

      // Log da análise
      if (analysis.shouldFinalize) {
        console.log(`🏁 Conversa detectada para finalização: ${phone} - Motivo: ${analysis.reason}`);
        await this.logFinalizationDecision(phone, analysis);
      }

      return analysis;

    } catch (error) {
      console.error('Erro na análise de finalização:', error);
      return {
        shouldFinalize: false,
        reason: 'error_in_analysis',
        confidence: 0
      };
    }
  }

  async performFinalizationAnalysis(newMessage, conversationHistory) {
    const messageText = (newMessage.text || newMessage.content || '').toLowerCase().trim();
    
    // Verificar se a conversa já está em processo de finalização
    const recentMessages = conversationHistory.slice(-6); // Últimas 6 mensagens
    const finalizationContext = this.analyzeFinalizationContext(recentMessages);

    // Análise da mensagem atual
    const currentMessageAnalysis = this.analyzeCurrentMessage(messageText);

    // Ser muito mais conservador - apenas finalizar se MUITO claro
    if (finalizationContext.inFinalizationProcess && 
        currentMessageAnalysis.indicatesFinalization && 
        finalizationContext.finalizationCount >= 3 && // Precisa de mais indicadores
        (currentMessageAnalysis.isGoodbye || currentMessageAnalysis.isThankYou)) {
      return {
        shouldFinalize: true,
        reason: 'multiple_clear_finalization_signals',
        confidence: 0.95,
        context: finalizationContext,
        messageAnalysis: currentMessageAnalysis
      };
    }

    // Apenas finalizar agradecimentos se forem MUITO específicos
    if (currentMessageAnalysis.isThankYou && 
        messageText.length <= 15 && 
        /\b(muito obrigad[ao]|brigad[ao] mesmo)\b/i.test(messageText)) {
      return {
        shouldFinalize: true,
        reason: 'explicit_thank_you_message',
        confidence: 0.90
      };
    }

    // Verificar padrões específicos de loop - ser mais rigoroso
    const loopDetection = this.detectFinalizationLoop(recentMessages);
    if (loopDetection.detected && loopDetection.confidence > 0.8) {
      return {
        shouldFinalize: true,
        reason: 'clear_automatic_response_loop',
        confidence: 0.90,
        loopInfo: loopDetection
      };
    }

    // Análise AI mais profunda se necessário
    if (currentMessageAnalysis.needsAiAnalysis) {
      const aiAnalysis = await this.performAiFinalizationAnalysis(messageText, recentMessages);
      if (aiAnalysis.shouldFinalize) {
        return aiAnalysis;
      }
    }

    return {
      shouldFinalize: false,
      reason: 'conversation_continues',
      confidence: 0.1
    };
  }

  analyzeFinalizationContext(recentMessages) {
    let finalizationIndicators = 0;
    let lastBotResponse = null;
    let lastUserMessage = null;

    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i];
      const text = (msg.text || msg.content || '').toLowerCase();

      if (msg.role === 'assistant') {
        if (!lastBotResponse) lastBotResponse = text;
      } else {
        if (!lastUserMessage) lastUserMessage = text;
      }

      // Contar indicadores de finalização
      for (const pattern of this.finalizationPatterns) {
        if (pattern.test(text)) {
          finalizationIndicators++;
          break;
        }
      }
    }

    return {
      inFinalizationProcess: finalizationIndicators >= 3, // Aumentar para ser menos agressivo
      finalizationCount: finalizationIndicators,
      lastBotResponse,
      lastUserMessage
    };
  }

  analyzeCurrentMessage(messageText) {
    const analysis = {
      indicatesFinalization: false,
      isThankYou: false,
      isGoodbye: false,
      isSimpleConfirmation: false,
      needsAiAnalysis: false,
      patterns: []
    };

    // Verificar cada padrão
    for (const pattern of this.finalizationPatterns) {
      if (pattern.test(messageText)) {
        analysis.indicatesFinalization = true;
        analysis.patterns.push(pattern.toString());

        // Classificar tipo de finalização (mais específico)
        if (/\b(muito obrigad[ao]|brigad[ao] mesmo|obrigad[ao] pela ajuda)\b/i.test(messageText)) {
          analysis.isThankYou = true;
        }
        if (/\b(tchau|xau|até logo|até mais|bye|adeus|falou)\b/i.test(messageText)) {
          analysis.isGoodbye = true;
        }
        if (/^(tá bom então|ok então|beleza então|perfeito obrigad[ao])$/i.test(messageText.trim())) {
          analysis.isSimpleConfirmation = true;
        }
      }
    }

    // Mensagens muito curtas podem precisar de análise AI
    if (messageText.length < 10 && !analysis.indicatesFinalization) {
      analysis.needsAiAnalysis = true;
    }

    return analysis;
  }

  detectFinalizationLoop(recentMessages) {
    if (recentMessages.length < 4) return { detected: false };

    const lastFour = recentMessages.slice(-4);
    let botResponses = 0;
    let userFinalizations = 0;

    for (const msg of lastFour) {
      const text = (msg.text || msg.content || '').toLowerCase();
      
      if (msg.role === 'assistant') {
        // Verificar se é resposta automática que pode causar loop
        for (const pattern of this.automaticResponsePatterns) {
          if (pattern.test(text)) {
            botResponses++;
            break;
          }
        }
      } else {
        // Verificar finalizações do usuário
        for (const pattern of this.finalizationPatterns) {
          if (pattern.test(text)) {
            userFinalizations++;
            break;
          }
        }
      }
    }

    return {
      detected: botResponses >= 2 && userFinalizations >= 3, // Mais rigoroso
      botResponses,
      userFinalizations,
      confidence: Math.min((botResponses + userFinalizations) * 0.15, 0.85) // Menos confiante
    };
  }

  async performAiFinalizationAnalysis(messageText, conversationHistory) {
    try {
      const aiService = await import('./aiService.js');
      
      if (!aiService.default.openai) {
        return { shouldFinalize: false, reason: 'ai_not_available' };
      }

      // Preparar contexto
      const contextMessages = conversationHistory.slice(-8).map(msg => {
        const role = msg.role === 'user' ? 'Cliente' : 'Assistente';
        return `${role}: ${msg.text || msg.content || '[mensagem não identificada]'}`;
      }).join('\n');

      const analysisPrompt = `
ANÁLISE DE FINALIZAÇÃO DE CONVERSA:

CONTEXTO DA CONVERSA:
${contextMessages}

NOVA MENSAGEM DO CLIENTE: "${messageText}"

CRITÉRIOS PARA FINALIZAR (responda "FINALIZAR"):
- Cliente demonstrou claramente que quer encerrar a conversa
- Conversa chegou a uma conclusão natural
- Cliente agradeceu e não fez nova pergunta
- Padrão de despedida ou confirmação final
- Evitar loops de "tchau", "obrigado", "de nada"

CRITÉRIOS PARA CONTINUAR (responda "CONTINUAR"):
- Cliente fez nova pergunta após agradecimento
- Mensagem indica interesse em continuar
- Não há sinais claros de finalização
- Cliente pode estar esperando mais informações

INSTRUÇÕES:
Analise se esta conversa deve ser finalizada naturalmente para evitar loops.
Responda APENAS com "FINALIZAR" ou "CONTINUAR".
Seja conservador - finalize apenas se realmente apropriado.
`;

      const decision = await aiService.default.evaluateCondition(analysisPrompt);
      const shouldFinalize = decision && decision.toUpperCase().includes('FINALIZAR');
      
      return {
        shouldFinalize,
        reason: shouldFinalize ? 'ai_natural_ending' : 'ai_continue_conversation',
        confidence: 0.85,
        aiDecision: decision
      };

    } catch (error) {
      console.error('Erro na análise AI de finalização:', error);
      return { shouldFinalize: false, reason: 'ai_analysis_error' };
    }
  }

  getRecentAnalysis(phone) {
    const analysis = this.analysisCache.get(phone);
    if (analysis && Date.now() - analysis.timestamp < this.cacheTimeout) {
      return analysis;
    }
    return null;
  }

  async logFinalizationDecision(phone, analysis) {
    try {
      await db.run(`
        INSERT INTO followup_history (phone, message_sent, sent_at, followup_type, success)
        VALUES (?, ?, datetime('now'), 'finalization_detected', 1)
      `, [
        phone, 
        `[FINALIZATION] Motivo: ${analysis.reason}, Confiança: ${(analysis.confidence * 100).toFixed(1)}%`
      ]);
    } catch (error) {
      console.error('Erro ao registrar decisão de finalização:', error);
    }
  }

  // Método para marcar conversa como finalizada e evitar follow-ups
  async markConversationAsFinalized(phone, reason = 'natural_ending') {
    try {
      // Marcar no sistema de follow-up para não gerar follow-ups
      await db.run(`
        INSERT INTO followup_history (phone, message_sent, sent_at, followup_type, success)
        VALUES (?, ?, datetime('now'), 'conversation_finalized', 1)
      `, [
        phone, 
        `[FINALIZED] ${reason} - ${new Date().toISOString()}`
      ]);

      console.log(`✅ Conversa marcada como finalizada: ${phone}`);
      return true;
    } catch (error) {
      console.error('Erro ao marcar conversa como finalizada:', error);
      return false;
    }
  }

  // Verificar se conversa foi recentemente finalizada
  async isConversationRecentlyFinalized(phone) {
    try {
      const result = await db.get(`
        SELECT sent_at FROM followup_history 
        WHERE phone = ? AND followup_type = 'conversation_finalized'
        AND sent_at > datetime('now', '-1 hour')
        ORDER BY sent_at DESC LIMIT 1
      `, [phone]);

      return !!result;
    } catch (error) {
      return false;
    }
  }

  // Resetar conversa finalizada incorretamente
  async resetFinalizationStatus(phone) {
    try {
      // Remove todas as marcações de finalização das últimas 24 horas
      await db.run(`
        DELETE FROM followup_history 
        WHERE phone = ? AND followup_type IN ('conversation_finalized', 'finalization_detected')
        AND sent_at > datetime('now', '-24 hours')
      `, [phone]);

      // Limpar cache de análise
      this.analysisCache.delete(phone);

      console.log(`🔄 Status de finalização resetado para ${phone}`);
      return true;
    } catch (error) {
      console.error('Erro ao resetar status de finalização:', error);
      return false;
    }
  }

  // Auto-reset quando usuário envia nova mensagem após finalização
  async checkAndAutoReset(phone, newMessage) {
    try {
      const isFinalized = await this.isConversationRecentlyFinalized(phone);
      if (isFinalized) {
        const messageText = (newMessage.text || newMessage.content || '').toLowerCase().trim();
        
        // Se a nova mensagem NÃO é uma finalização, resetar automaticamente
        const currentMessageAnalysis = this.analyzeCurrentMessage(messageText);
        if (!currentMessageAnalysis.indicatesFinalization && messageText.length > 3) {
          console.log(`🔄 Auto-resetando conversa finalizada para ${phone} - nova mensagem detectada: "${messageText.substring(0, 50)}..."`);
          await this.resetFinalizationStatus(phone);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Erro no auto-reset:', error);
      return false;
    }
  }

  // Função para diagnóstico/debug
  async getFinalizationDiagnostic(phone) {
    try {
      const recentFinalizations = await db.all(`
        SELECT * FROM followup_history 
        WHERE phone = ? AND followup_type IN ('conversation_finalized', 'finalization_detected')
        AND sent_at > datetime('now', '-24 hours')
        ORDER BY sent_at DESC
      `, [phone]);

      const cacheInfo = this.analysisCache.get(phone);
      
      return {
        phone,
        recentFinalizations: recentFinalizations.length,
        finalizationHistory: recentFinalizations.slice(0, 5), // Últimas 5
        cacheInfo: cacheInfo ? {
          timestamp: new Date(cacheInfo.timestamp).toISOString(),
          result: cacheInfo.result
        } : null,
        isCurrentlyFinalized: await this.isConversationRecentlyFinalized(phone)
      };
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      return { error: error.message };
    }
  }

  // Cleanup periódico do cache
  startPeriodicCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.analysisCache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          this.analysisCache.delete(key);
        }
      }
    }, this.cacheTimeout);
    
    console.log('🧹 Sistema de limpeza de finalização iniciado');
  }
}

const conversationFinalizationService = new ConversationFinalizationService();
export default conversationFinalizationService;