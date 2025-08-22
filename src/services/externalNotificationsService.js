import db from '../config/database.js';

class ExternalNotificationsService {
  async getSettings() {
    try {
      const settings = await db.get(
        `SELECT * FROM external_notifications WHERE id = 1`
      );
      
      return settings || {
        enabled: false,
        whatsapp_links_enabled: false,
        custom_rules_enabled: false
      };
    } catch (error) {
      console.error('Error getting external notifications settings:', error);
      return {
        enabled: false,
        whatsapp_links_enabled: false,
        custom_rules_enabled: false
      };
    }
  }

  async getActiveRules() {
    try {
      const rules = await db.all(
        `SELECT * FROM notification_rules WHERE enabled = 1`
      );
      return rules;
    } catch (error) {
      console.error('Error getting active notification rules:', error);
      return [];
    }
  }

  async checkWhatsAppLinkNotification(response, sourcePhone, clientName) {
    try {
      const settings = await this.getSettings();
      
      if (!settings.enabled || !settings.whatsapp_links_enabled) {
        return;
      }

      // Detect WhatsApp links in response
      const whatsappLinkRegex = /https:\/\/wa\.me\/(\d+)/g;
      const matches = response.match(whatsappLinkRegex);
      
      if (matches && matches.length > 0) {
        for (const link of matches) {
          const phoneMatch = link.match(/https:\/\/wa\.me\/(\d+)/);
          if (phoneMatch) {
            const targetPhone = phoneMatch[1];
            await this.sendWhatsAppLinkNotification(sourcePhone, targetPhone, clientName, response);
          }
        }
      }
    } catch (error) {
      console.error('Error checking WhatsApp link notification:', error);
    }
  }

  async checkCustomRuleNotifications(response, conversation, sourcePhone, clientName) {
    try {
      const settings = await this.getSettings();
      
      if (!settings.enabled || !settings.custom_rules_enabled) {
        return;
      }

      const rules = await this.getActiveRules();
      
      for (const rule of rules) {
        const shouldNotify = await this.evaluateRule(rule, response, conversation);
        
        if (shouldNotify) {
          await this.sendCustomRuleNotification(rule, sourcePhone, clientName, response, conversation);
        }
      }
    } catch (error) {
      console.error('Error checking custom rule notifications:', error);
    }
  }

  async evaluateRule(rule, response, conversation) {
    try {
      // Use GPT-5 mini to evaluate if the rule should trigger
      const aiService = await import('./aiService.js');
      
      const evaluationPrompt = `
Analise a conversa e determine se a seguinte situação foi identificada:

REGRA: ${rule.trigger_prompt}

RESPOSTA ATUAL DA IA: ${response}

CONTEXTO DA CONVERSA: ${this.formatConversationContext(conversation)}

Responda apenas "SIM" se a situação descrita na regra foi claramente identificada na conversa atual, ou "NÃO" caso contrário.
Seja preciso e evite falsos positivos.
`;

      const evaluation = await aiService.default.evaluateCondition(evaluationPrompt);
      return evaluation && evaluation.toLowerCase().includes('sim');
    } catch (error) {
      console.error('Error evaluating rule:', error);
      return false;
    }
  }

  formatConversationContext(conversation) {
    if (!conversation || !conversation.messages) {
      return 'Nenhum contexto disponível';
    }

    const recentMessages = conversation.messages.slice(-5);
    return recentMessages.map(msg => {
      const role = msg.role === 'user' ? 'Cliente' : 'IA';
      return `${role}: ${msg.content}`;
    }).join('\n');
  }

  async sendWhatsAppLinkNotification(sourcePhone, targetPhone, clientName, originalResponse) {
    try {
      const contactsService = await import('./contactsService.js');
      const whatsappService = await import('./whatsappService.js');
      
      // Get client info
      const sourceContact = await contactsService.default.getContact(sourcePhone);
      const clientInfo = {
        name: clientName || sourceContact?.name || 'Cliente não identificado',
        phone: this.formatPhoneForDisplay(sourcePhone)
      };

      // Create notification message
      const notificationMessage = `🔔 *Notificação Automática*

📱 *Novo contato compartilhado via WhatsApp*

👤 *Cliente:* ${clientInfo.name}
📞 *Telefone:* ${clientInfo.phone}

💬 *Resumo da conversa:*
O cliente solicitou informações e recebeu seu contato via link do WhatsApp.

🤖 *Resposta da IA:*
"${originalResponse.substring(0, 200)}${originalResponse.length > 200 ? '...' : ''}"

---
_Notificação gerada automaticamente pelo GPTWhats_`;

      // Send notification
      await whatsappService.default.sendMessage(`${targetPhone}@s.whatsapp.net`, {
        text: notificationMessage
      });

      // Log notification
      await this.logNotification('whatsapp_link', sourcePhone, targetPhone, null, notificationMessage, true);
      
      console.log(`📧 WhatsApp link notification sent to ${targetPhone}`);
    } catch (error) {
      console.error('Error sending WhatsApp link notification:', error);
      await this.logNotification('whatsapp_link', sourcePhone, targetPhone, null, 'Failed to send', false, error.message);
    }
  }

  async sendCustomRuleNotification(rule, sourcePhone, clientName, response, conversation) {
    try {
      const contactsService = await import('./contactsService.js');
      const whatsappService = await import('./whatsappService.js');
      
      // Get client info
      const sourceContact = await contactsService.default.getContact(sourcePhone);
      const clientInfo = {
        name: clientName || sourceContact?.name || 'Cliente não identificado',
        phone: this.formatPhoneForDisplay(sourcePhone)
      };

      // Create notification message
      const notificationMessage = `🔔 *Notificação Automática*

⚡ *Regra ativada:* ${rule.name}
${rule.description ? `📝 *Descrição:* ${rule.description}` : ''}

👤 *Cliente:* ${clientInfo.name}
📞 *Telefone:* ${clientInfo.phone}

💬 *Resumo da situação:*
${rule.trigger_prompt}

🤖 *Última resposta da IA:*
"${response.substring(0, 200)}${response.length > 200 ? '...' : ''}"

📋 *Contexto da conversa:*
${this.formatConversationContext(conversation)}

---
_Notificação gerada automaticamente pelo GPTWhats_`;

      // Send notification
      await whatsappService.default.sendMessage(`${rule.target_phone}@s.whatsapp.net`, {
        text: notificationMessage
      });

      // Log notification
      await this.logNotification('custom_rule', sourcePhone, rule.target_phone, rule.id, notificationMessage, true);
      
      console.log(`📧 Custom rule notification sent: ${rule.name} to ${rule.target_phone}`);
    } catch (error) {
      console.error('Error sending custom rule notification:', error);
      await this.logNotification('custom_rule', sourcePhone, rule.target_phone, rule.id, 'Failed to send', false, error.message);
    }
  }

  async logNotification(type, sourcePhone, targetPhone, ruleId, content, sent, errorMessage = null) {
    try {
      await db.run(
        `INSERT INTO notification_logs (type, source_phone, target_phone, rule_id, content, sent, error_message) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [type, sourcePhone, targetPhone, ruleId, content, sent, errorMessage]
      );
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  formatPhoneForDisplay(phone) {
    // Remove WhatsApp suffix and format Brazilian numbers
    const cleanPhone = phone.replace(/@.*$/, '');
    
    if (cleanPhone.startsWith('55') && cleanPhone.length === 13) {
      return `+${cleanPhone.slice(0, 2)} (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`;
    }
    
    return cleanPhone;
  }

  // Process notifications asynchronously to not block response generation
  async processNotificationsAsync(response, conversation, sourcePhone, clientName) {
    // Run in background without awaiting
    setImmediate(async () => {
      try {
        // Check WhatsApp link notifications
        await this.checkWhatsAppLinkNotification(response, sourcePhone, clientName);
        
        // Check custom rule notifications
        await this.checkCustomRuleNotifications(response, conversation, sourcePhone, clientName);
      } catch (error) {
        console.error('Error processing notifications asynchronously:', error);
      }
    });
  }
}

export default new ExternalNotificationsService();