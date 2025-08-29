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

  async checkWhatsAppLinkNotification(response, sourcePhone, clientName, conversation) {
    try {
      const settings = await this.getSettings();
      
      if (!settings.enabled || !settings.whatsapp_links_enabled) {
        console.log('🚫 WhatsApp link notifications disabled in settings');
        return;
      }

      const whatsappLinks = new Set(); // Use Set to avoid duplicates
      
      console.log(`🔍 Searching for WhatsApp links in response: "${response?.substring(0, 100)}..."`);
      
      // Method 1: Check response text for WhatsApp links (backward compatibility)
      const whatsappLinkRegex = /(https:\/\/wa\.me\/[^\s]+)/g;
      const responseMatches = response.match(whatsappLinkRegex);
      
      if (responseMatches) {
        console.log(`✅ Found ${responseMatches.length} WhatsApp links in response:`, responseMatches);
      }
      
      if (responseMatches && responseMatches.length > 0) {
        responseMatches.forEach(link => whatsappLinks.add(link));
      }
      
      // Method 2: Check recent conversation messages for WhatsApp link cards/texts
      if (conversation && conversation.messages) {
        const recentMessages = conversation.messages.slice(-3); // Check last 3 messages
        console.log(`🔍 Checking ${recentMessages.length} recent conversation messages for WhatsApp links`);
        
        for (const message of recentMessages) {
          // Check for messages marked as WhatsApp links (new simplified system)
          if (message.role === 'assistant' && message.messageType === 'whatsapp_links') {
            console.log(`🎯 Found WhatsApp links in conversation with messageType: ${message.messageType}`);
            // Extract links from the text content since we now send them as simple text
            const linkMatches = message.content?.match(/https:\/\/wa\.me\/\d+/g);
            if (linkMatches) {
              linkMatches.forEach(link => whatsappLinks.add(link));
            }
          }
          
          // Also check message content for links (fallback)
          if (message.content) {
            const contentMatches = message.content.match(whatsappLinkRegex);
            if (contentMatches) {
              console.log(`🎯 Found WhatsApp links in message content:`, contentMatches);
              contentMatches.forEach(link => whatsappLinks.add(link));
            }
          }
        }
      } else {
        console.log('⚠️ No conversation data available for link detection');
      }
      
      // Process all found WhatsApp links
      if (whatsappLinks.size > 0) {
        console.log(`📨 Processing ${whatsappLinks.size} unique WhatsApp links for notification`);
        
        for (const fullLink of whatsappLinks) {
          // Extract just the phone number from the link for identification
          const phoneMatch = fullLink.match(/https:\/\/wa\.me\/(\d+)/);
          if (phoneMatch) {
            const phoneForId = phoneMatch[1];
            console.log(`📤 Sending WhatsApp link notification to: ${phoneForId} for link: ${fullLink}`);
            await this.sendWhatsAppLinkNotification(sourcePhone, phoneForId, clientName, response, fullLink);
          } else {
            console.log(`❌ Invalid WhatsApp link format: ${fullLink}`);
          }
        }
      } else {
        console.log('ℹ️ No WhatsApp links found - no external notifications to send');
      }
    } catch (error) {
      console.error('❌ Error checking WhatsApp link notification:', error);
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

  async sendWhatsAppLinkNotification(sourcePhone, phoneForId, clientName, originalResponse, whatsappLink) {
    try {
      const contactsService = await import('./contactsService.js');
      
      // Get client info
      const sourceContact = await contactsService.default.getContact(sourcePhone);
      const clientInfo = {
        name: clientName || sourceContact?.name || 'Cliente não identificado',
        phone: this.formatPhoneForDisplay(sourcePhone)
      };

      // Create notification message with clickable link instead of trying to send directly
      const notificationMessage = `🔔 *Notificação Automática*

📱 *Novo contato compartilhado via WhatsApp*

👤 *Cliente:* ${clientInfo.name}
📞 *Telefone:* ${clientInfo.phone}

💬 *Resumo da conversa:*
O cliente solicitou informações e recebeu seu contato via link do WhatsApp.

🤖 *Resposta da IA:*
"${originalResponse.substring(0, 200)}${originalResponse.length > 200 ? '...' : ''}"

🔗 *Clique no link abaixo para iniciar conversa com o cliente:*
${whatsappLink}

---
_Notificação gerada automaticamente pelo GPTWhats_`;

      // Instead of trying to extract and send via WhatsApp API, 
      // we'll use a webhook or external notification method
      const success = await this.sendExternalNotification(phoneForId, notificationMessage, whatsappLink);

      // Log notification
      await this.logNotification('whatsapp_link', sourcePhone, phoneForId, null, notificationMessage, success);
      
      if (success) {
        console.log(`📧 External WhatsApp link notification processed for ${phoneForId}`);
      } else {
        console.log(`⚠️ External notification fallback: WhatsApp link ${whatsappLink} available for manual contact`);
      }
    } catch (error) {
      console.error('Error sending WhatsApp link notification:', error);
      await this.logNotification('whatsapp_link', sourcePhone, phoneForId, null, 'Failed to send', false, error.message);
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

  async sendExternalNotification(phoneForId, notificationMessage, whatsappLink) {
    try {
      // Try multiple notification methods in order of preference
      
      // Method 1: Try to send via WhatsApp API (attempt direct send even without existing contact)
      try {
        const whatsappService = await import('./whatsappService.js');
        const contactsService = await import('./contactsService.js');
        
        // First, check if we have this contact in our database
        const existingContact = await contactsService.default.getContact(`${phoneForId}@s.whatsapp.net`);
        
        if (existingContact) {
          console.log(`📞 Sending notification via WhatsApp API to known contact: ${phoneForId}`);
        } else {
          console.log(`📞 Attempting to send notification via WhatsApp API to new contact: ${phoneForId}`);
        }
        
        await whatsappService.default.sendMessage(`${phoneForId}@s.whatsapp.net`, {
          text: notificationMessage
        });
        
        console.log(`✅ Notification sent successfully via WhatsApp to ${phoneForId}`);
        return true;
        
      } catch (whatsappError) {
        console.log(`⚠️ WhatsApp API failed for ${phoneForId}:`, whatsappError.message);
      }
      
      // Method 2: Use webhook if configured
      const webhookUrl = await this.getWebhookUrl();
      if (webhookUrl) {
        try {
          const webhook = await import('node:https');
          const webhookData = {
            type: 'whatsapp_link_notification',
            phoneForId: phoneForId,
            whatsappLink: whatsappLink,
            message: notificationMessage,
            timestamp: new Date().toISOString()
          };
          
          // Send to webhook (implementation depends on your webhook service)
          await this.sendWebhookNotification(webhookUrl, webhookData);
          console.log(`🌐 Notification sent via webhook for ${phoneForId}`);
          return true;
        } catch (webhookError) {
          console.log(`⚠️ Webhook failed for ${phoneForId}:`, webhookError.message);
        }
      }
      
      // Method 3: Log to console and database for manual processing
      console.log(`📋 Manual notification required for ${phoneForId}:`);
      console.log(`🔗 WhatsApp Link: ${whatsappLink}`);
      console.log(`📄 Message: ${notificationMessage}`);
      
      return false; // Indicates manual processing needed
      
    } catch (error) {
      console.error('Error in external notification:', error);
      return false;
    }
  }

  async getWebhookUrl() {
    try {
      const settings = await this.getSettings();
      return settings.webhook_url || null;
    } catch (error) {
      return null;
    }
  }

  async sendWebhookNotification(webhookUrl, data) {
    try {
      const fetch = await import('node-fetch').then(m => m.default).catch(() => null);
      if (!fetch) {
        console.log('node-fetch not available for webhook');
        return false;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with status: ${response.status}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Process notifications asynchronously to not block response generation
  async processNotificationsAsync(response, conversation, sourcePhone, clientName) {
    // Run in background without awaiting
    setImmediate(async () => {
      try {
        console.log(`🔔 Processing external notifications for ${clientName} (${sourcePhone})`);
        
        // Get settings first for debugging
        const settings = await this.getSettings();
        console.log('📋 External notification settings:', settings);
        
        if (!settings.enabled) {
          console.log('⚠️ External notifications are disabled in settings');
          return;
        }
        
        // Check WhatsApp link notifications (now includes conversation context)
        if (settings.whatsapp_links_enabled) {
          console.log('🔗 Checking WhatsApp link notifications...');
          await this.checkWhatsAppLinkNotification(response, sourcePhone, clientName, conversation);
        } else {
          console.log('⚠️ WhatsApp link notifications are disabled');
        }
        
        // Check custom rule notifications
        if (settings.custom_rules_enabled) {
          console.log('📝 Checking custom rule notifications...');
          await this.checkCustomRuleNotifications(response, conversation, sourcePhone, clientName);
        } else {
          console.log('⚠️ Custom rule notifications are disabled');
        }
      } catch (error) {
        console.error('❌ Error processing notifications asynchronously:', error);
      }
    });
  }
}

export default new ExternalNotificationsService();