import db from '../config/database.js';

class FollowupService {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
    this.checkInterval = 300000; // 5 minutes
    
    // Delay startup to not block main initialization
    setTimeout(() => {
      this.startPeriodicCheck();
    }, 10000); // 10 second delay
  }

  async getSettings() {
    try {
      let settings = await db.get(`SELECT * FROM followup_settings WHERE id = 1`);
      
      if (!settings) {
        // Create default settings
        await db.run(`
          INSERT INTO followup_settings (
            id, enabled, generate_prompt, no_generate_prompt, 
            inactivity_hours, delay_hours, max_followups_per_conversation, followup_interval_hours
          ) VALUES (1, 0, ?, ?, 24, 2, 2, 168)
        `, [
          'Analise a conversa e identifique se o cliente demonstrou interesse em produtos/serviços mas não finalizou a compra, ou se ficou com dúvidas pendentes, ou se a conversa terminou sem conclusão satisfatória.',
          'NÃO gere followup se: cliente já comprou, cliente disse que não tem interesse, cliente pediu para não entrar em contato, conversa foi finalizada satisfatoriamente, cliente demonstrou irritação.'
        ]);
        
        settings = await db.get(`SELECT * FROM followup_settings WHERE id = 1`);
      }
      
      return settings;
    } catch (error) {
      console.error('Error getting followup settings:', error);
      return null;
    }
  }

  async updateSettings(newSettings) {
    try {
      await db.run(`
        UPDATE followup_settings 
        SET enabled = ?, generate_prompt = ?, no_generate_prompt = ?, 
            inactivity_hours = ?, delay_hours = ?, max_followups_per_conversation = ?, 
            followup_interval_hours = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [
        newSettings.enabled,
        newSettings.generate_prompt,
        newSettings.no_generate_prompt,
        newSettings.inactivity_hours,
        newSettings.delay_hours,
        newSettings.max_followups_per_conversation,
        newSettings.followup_interval_hours
      ]);
      
      return true;
    } catch (error) {
      console.error('Error updating followup settings:', error);
      return false;
    }
  }

  // Called when a conversation becomes inactive
  async scheduleFollowupAnalysis(phone) {
    try {
      const settings = await this.getSettings();
      if (!settings?.enabled) return;

      // Check if we already have a pending followup for this phone
      const existingPending = await db.get(`
        SELECT id FROM followup_queue 
        WHERE phone = ? AND status = 'pending'
      `, [phone]);

      if (existingPending) {
        console.log(`⏭️ Followup already scheduled for ${phone}`);
        return;
      }

      // Check if follow-ups were stopped for this conversation
      const stopMarker = await db.get(`
        SELECT * FROM followup_history 
        WHERE phone = ? AND followup_type = 'stop_marker' 
        AND sent_at > datetime('now', '-${settings.followup_interval_hours} hours')
      `, [phone]);

      if (stopMarker) {
        console.log(`🚫 Follow-ups stopped for ${phone}: ${stopMarker.message_sent}`);
        return;
      }

      // Check if conversation was recently finalized naturally
      const finalizationMarker = await db.get(`
        SELECT * FROM followup_history 
        WHERE phone = ? AND followup_type = 'conversation_finalized' 
        AND sent_at > datetime('now', '-24 hours')
      `, [phone]);

      if (finalizationMarker) {
        console.log(`🏁 Follow-ups skipped for ${phone}: conversation was finalized naturally`);
        return;
      }

      // Check followup limits
      const recentFollowups = await db.get(`
        SELECT COUNT(*) as count FROM followup_history 
        WHERE phone = ? AND followup_type != 'stop_marker'
        AND sent_at > datetime('now', '-${settings.followup_interval_hours} hours')
      `, [phone]);

      if (recentFollowups.count >= settings.max_followups_per_conversation) {
        console.log(`📊 Followup limit reached for ${phone}`);
        return;
      }

      // Schedule analysis after inactivity period
      const analysisTime = new Date(Date.now() + (settings.inactivity_hours * 60 * 60 * 1000));
      
      await db.run(`
        INSERT INTO followup_queue (phone, status, scheduled_for)
        VALUES (?, 'scheduled_for_analysis', ?)
      `, [phone, analysisTime.toISOString()]);

      console.log(`📅 Followup analysis scheduled for ${phone} at ${analysisTime.toLocaleString()}`);
    } catch (error) {
      console.error('Error scheduling followup analysis:', error);
    }
  }

  startPeriodicCheck() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processFollowupQueue();
      }
    }, this.checkInterval);

    console.log('🔄 Started followup periodic check every 5 minutes (non-blocking)');
  }

  async processFollowupQueue() {
    if (this.isProcessing) return;
    
    try {
      this.isProcessing = true;
      const settings = await this.getSettings();
      
      if (!settings?.enabled) return;

      // Process items ready for analysis
      await this.processAnalysisQueue();
      
      // Process items ready to send
      await this.processSendQueue();

    } catch (error) {
      console.error('Error processing followup queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processAnalysisQueue() {
    try {
      const itemsToAnalyze = await db.all(`
        SELECT * FROM followup_queue 
        WHERE status = 'scheduled_for_analysis' 
        AND scheduled_for <= datetime('now')
        LIMIT 5
      `);

      for (const item of itemsToAnalyze) {
        await this.analyzeConversationForFollowup(item);
        await this.delay(1000); // Prevent API overload
      }

    } catch (error) {
      console.error('Error processing analysis queue:', error);
    }
  }

  async processSendQueue() {
    try {
      const itemsToSend = await db.all(`
        SELECT * FROM followup_queue 
        WHERE status = 'scheduled_for_send' 
        AND scheduled_for <= datetime('now')
        LIMIT 3
      `);

      for (const item of itemsToSend) {
        await this.sendFollowupMessage(item);
        await this.delay(2000); // Space out sends
      }

    } catch (error) {
      console.error('Error processing send queue:', error);
    }
  }

  async analyzeConversationForFollowup(queueItem) {
    try {
      const settings = await this.getSettings();
      
      // Get conversation context
      const conversationService = await import('./conversationService.js');
      const conversation = await conversationService.default.getConversation(queueItem.phone);
      
      if (!conversation || !conversation.messages || conversation.messages.length < 2) {
        await this.markAsCompleted(queueItem.id, 'no_conversation_data');
        return;
      }

      // Get last 15 messages for analysis
      const recentMessages = conversation.messages.slice(-15);
      const contextText = this.formatConversationForAnalysis(recentMessages);

      // Prepare analysis prompt
      const analysisPrompt = `
ANÁLISE PARA FOLLOWUP:

CRITÉRIOS PARA GERAR FOLLOWUP:
${settings.generate_prompt}

CRITÉRIOS PARA NÃO GERAR FOLLOWUP:
${settings.no_generate_prompt}

CONTEXTO DA CONVERSA:
${contextText}

INSTRUÇÕES:
1. Analise a conversa acima considerando AMBOS os critérios (gerar e não gerar)
2. Se a conversa atende aos critérios de GERAR followup, responda com "GERAR_FOLLOWUP"
3. Se a conversa atende aos critérios de NÃO GERAR followup, responda com "NAO_GERAR"
4. Se não há dados suficientes, responda com "NAO_GERAR"

IMPORTANTE: Responda APENAS com "GERAR_FOLLOWUP" ou "NAO_GERAR". Não adicione explicações.
`;

      // Use AI to analyze
      const aiService = await import('./aiService.js');
      const decision = await aiService.default.evaluateCondition(analysisPrompt);
      
      console.log(`🤖 Followup analysis for ${queueItem.phone}: ${decision}`);

      if (decision && decision.toUpperCase().includes('GERAR_FOLLOWUP')) {
        await this.generateFollowupMessage(queueItem, conversation, settings);
      } else {
        await this.markAsCompleted(queueItem.id, 'analysis_negative');
      }

    } catch (error) {
      console.error('Error analyzing conversation for followup:', error);
      await this.markAsFailed(queueItem.id, error.message);
    }
  }

  async generateFollowupMessage(queueItem, conversation, settings) {
    try {
      const recentMessages = conversation.messages.slice(-10);
      const contextText = this.formatConversationForAnalysis(recentMessages);

      const followupPrompt = `
GERAÇÃO DE MENSAGEM DE FOLLOWUP:

CONTEXTO DA CONVERSA:
${contextText}

INSTRUÇÕES:
1. Crie uma mensagem natural e personalizada de followup
2. Seja útil e não invasivo
3. Referencie a conversa anterior de forma sutil
4. Ofereça ajuda adicional ou esclarecimento
5. Mantenha o tom profissional mas amigável
6. Máximo de 200 caracteres

Gere APENAS a mensagem de followup, sem explicações ou formatação adicional.
`;

      const aiService = await import('./aiService.js');
      const messages = [
        { role: 'system', content: 'Você é um assistente que gera mensagens de followup naturais e úteis.' },
        { role: 'user', content: followupPrompt }
      ];

      const followupMessage = await aiService.default.generateResponse(messages);
      
      if (!followupMessage || followupMessage.length < 10) {
        await this.markAsFailed(queueItem.id, 'failed_to_generate_message');
        return;
      }

      // Schedule for sending
      const sendTime = new Date(Date.now() + (settings.delay_hours * 60 * 60 * 1000));
      
      await db.run(`
        UPDATE followup_queue 
        SET status = 'scheduled_for_send', 
            followup_message = ?, 
            conversation_context = ?,
            scheduled_for = ?,
            analysis_result = 'positive',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [followupMessage.trim(), contextText, sendTime.toISOString(), queueItem.id]);

      console.log(`📝 Followup message generated for ${queueItem.phone}, scheduled for ${sendTime.toLocaleString()}`);

    } catch (error) {
      console.error('Error generating followup message:', error);
      await this.markAsFailed(queueItem.id, error.message);
    }
  }

  async sendFollowupMessage(queueItem) {
    try {
      const whatsappService = await import('./whatsappService.js');
      const conversationService = await import('./conversationService.js');
      
      // Send the message
      await whatsappService.default.sendMessage(queueItem.phone, {
        text: queueItem.followup_message
      });

      // Add to conversation history
      await conversationService.default.addMessage(queueItem.phone, {
        role: 'assistant',
        content: queueItem.followup_message,
        timestamp: Date.now(),
        messageType: 'followup'
      });

      // Record in history
      await db.run(`
        INSERT INTO followup_history (phone, followup_queue_id, message_sent, sent_at, followup_type)
        VALUES (?, ?, ?, datetime('now'), 'automatic')
      `, [queueItem.phone, queueItem.id, queueItem.followup_message]);

      // Mark as completed
      await db.run(`
        UPDATE followup_queue 
        SET status = 'completed', attempts = attempts + 1, last_attempt = datetime('now')
        WHERE id = ?
      `, [queueItem.id]);

      console.log(`✅ Followup sent to ${queueItem.phone}: "${queueItem.followup_message.substring(0, 50)}..."`);

    } catch (error) {
      console.error('Error sending followup message:', error);
      
      // Increment attempts and retry if under limit
      const maxAttempts = 3;
      const newAttempts = queueItem.attempts + 1;
      
      if (newAttempts < maxAttempts) {
        // Retry in 30 minutes
        const retryTime = new Date(Date.now() + 30 * 60 * 1000);
        await db.run(`
          UPDATE followup_queue 
          SET attempts = ?, last_attempt = datetime('now'), scheduled_for = ?
          WHERE id = ?
        `, [newAttempts, retryTime.toISOString(), queueItem.id]);
      } else {
        await this.markAsFailed(queueItem.id, error.message);
      }
    }
  }

  formatConversationForAnalysis(messages) {
    return messages.map(msg => {
      const role = msg.role === 'user' ? 'Cliente' : 'Assistente';
      const time = new Date(msg.timestamp).toLocaleString('pt-BR');
      return `[${time}] ${role}: ${msg.content}`;
    }).join('\n');
  }

  async markAsCompleted(queueId, reason) {
    await db.run(`
      UPDATE followup_queue 
      SET status = 'completed', analysis_result = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [reason, queueId]);
  }

  async markAsFailed(queueId, error) {
    await db.run(`
      UPDATE followup_queue 
      SET status = 'failed', analysis_result = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [error, queueId]);
  }

  async getStats() {
    try {
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_scheduled,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'scheduled_for_analysis' THEN 1 END) as scheduled_analysis,
          COUNT(CASE WHEN status = 'scheduled_for_send' THEN 1 END) as scheduled_send,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM followup_queue
      `);

      const historyStats = await db.get(`
        SELECT COUNT(*) as total_sent, 
               COUNT(CASE WHEN response_received = 1 THEN 1 END) as responses
        FROM followup_history 
        WHERE sent_at > datetime('now', '-30 days')
      `);

      return {
        queue: stats,
        history: historyStats,
        isEnabled: (await this.getSettings())?.enabled || false
      };
    } catch (error) {
      console.error('Error getting followup stats:', error);
      return null;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup old completed records
  async cleanup() {
    try {
      // Remove completed followups older than 30 days
      await db.run(`
        DELETE FROM followup_queue 
        WHERE status IN ('completed', 'failed') 
        AND updated_at < datetime('now', '-30 days')
      `);

      // Remove old history older than 90 days
      await db.run(`
        DELETE FROM followup_history 
        WHERE sent_at < datetime('now', '-90 days')
      `);

      console.log('🧹 Followup cleanup completed');
    } catch (error) {
      console.error('Error in followup cleanup:', error);
    }
  }
}

const followupService = new FollowupService();
export default followupService;