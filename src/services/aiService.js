import OpenAI from 'openai';
import configService from './configService.js';
import conversationService from './conversationService.js';
import audioService from './audioService.js';
import messageTrackingService from './messageTrackingService.js';
import { extractLinksAndPhones } from '../utils/textUtils.js';

class AIService {
  constructor() {
    this.openai = null;
    this.conversationMemory = new Map();
    this.processingQueue = new Map();
    this.antiLoopTracker = new Map();
  }

  async initialize() {
    const apiKey = await configService.get('openai_api_key');
    if (!apiKey) {
      console.log('⚠️ OpenAI API key not configured');
      return false;
    }

    this.openai = new OpenAI({
      apiKey: apiKey
    });

    console.log('🤖 AI Service initialized');
    return true;
  }

  async reinitialize() {
    return this.initialize();
  }

  async processMessage(phone, messageData, contactName = null, messageId = null) {
    try {
      // Check if AI is initialized
      if (!this.openai) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.log('AI not initialized, skipping message processing');
          return null;
        }
      }

      // Check if we should respond to this phone
      const shouldRespond = await messageTrackingService.shouldRespondToPhone(phone);
      if (!shouldRespond) {
        console.log(`⏭️ Skipping response for ${phone} - already handled or responded recently`);
        return 'skipped';
      }

      // Anti-loop detection
      if (this.isLoopDetected(phone, messageData)) {
        console.log('Loop detected for:', phone);
        return null;
      }

      // Get delay setting
      const delayMs = parseInt(await configService.get('response_delay')) || 10000;
      
      // Add contact name to message data
      if (contactName) {
        messageData.contactName = contactName;
        console.log('✅ Contact name added to messageData:', contactName);
      } else {
        console.log('⚠️ No contact name provided for:', phone);
      }

      // Store message ID for tracking
      if (messageId) {
        messageData.messageId = messageId;
      }
      
      // Queue message for delayed processing
      this.queueMessage(phone, messageData, delayMs);

      return 'queued';
    } catch (error) {
      console.error('Error processing message:', error);
      return null;
    }
  }

  queueMessage(phone, messageData, delayMs) {
    // Clear existing timeout for this phone
    if (this.processingQueue.has(phone)) {
      clearTimeout(this.processingQueue.get(phone).timeout);
    }

    // Get existing messages or create new array
    const existingQueue = this.processingQueue.get(phone);
    const messages = existingQueue ? existingQueue.messages : [];
    messages.push(messageData);

    // Set new timeout
    const timeout = setTimeout(async () => {
      await this.processQueuedMessages(phone, messages);
      this.processingQueue.delete(phone);
    }, delayMs);

    this.processingQueue.set(phone, { messages, timeout });
  }

  async processQueuedMessages(phone, messages) {
    try {
      console.log(`Processing ${messages.length} queued messages for ${phone}`);
      
      // Filter out unsupported messages
      const supportedMessages = messages.filter(msg => 
        msg.type !== 'unsupported' && 
        msg.text !== '[Tipo de mensagem não suportado]'
      );
      
      if (supportedMessages.length === 0) {
        console.log('No supported messages to process, skipping');
        return;
      }
      
      // Get conversation context
      const conversation = await conversationService.getConversation(phone);
      
      // Prepare messages for AI with phone context
      const contextMessages = await this.prepareContextMessages(conversation, supportedMessages, phone);
      
      // Generate response
      const response = await this.generateResponse(contextMessages);
      
      console.log('Generated response:', response ? 'SUCCESS' : 'FAILED');
      
      if (response) {
        // Save conversation - mark user messages correctly
        const userMessages = supportedMessages.map(msg => ({
          ...msg,
          role: 'user',
          content: msg.text || msg.content || '[Mensagem não identificada]',
          timestamp: msg.timestamp || Date.now()
        }));
        
        await conversationService.addMessages(phone, userMessages);
        await conversationService.addMessage(phone, {
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        });

        // Send response
        console.log('Sending humanized response to', phone);
        await this.sendHumanizedResponse(phone, response, supportedMessages);
        console.log('Response sent successfully');

        // Mark messages as responded in tracking system
        const lastMessageId = supportedMessages.length > 0 && supportedMessages[0].messageId ? 
                             supportedMessages[0].messageId : null;
        if (lastMessageId) {
          await messageTrackingService.markResponseSent(phone, lastMessageId, 'ai');
        } else {
          // Mark all recent unresponded messages for this phone as handled
          await messageTrackingService.markConversationResponded(phone, Date.now() - 300000); // Last 5 minutes
        }

        // Process external notifications asynchronously (non-blocking)
        const externalNotificationsService = (await import('./externalNotificationsService.js')).default;
        const firstMessageContactName = supportedMessages.length > 0 ? supportedMessages[0].contactName : null;
        await externalNotificationsService.processNotificationsAsync(response, conversation, phone, firstMessageContactName);
      } else {
        console.error('No response generated, skipping message sending');
      }
    } catch (error) {
      console.error('Error processing queued messages:', error);
    }
  }

  async prepareContextMessages(conversation, newMessages, phone = null) {
    const systemPrompt = await configService.get('system_prompt') || 'Você é um assistente útil e amigável.';
    const maxLength = parseInt(await configService.get('max_response_length')) || 200;
    const useClientName = await configService.get('use_client_name') === 'true';
    
    // Get client name from the latest message or contact info
    let clientName = null;
    if (useClientName) {
      // Try to get name from latest message first
      for (const msg of newMessages) {
        if (msg.contactName && msg.contactName.trim() && !msg.contactName.includes('+')) {
          clientName = msg.contactName.trim();
          console.log('📝 Using contact name from message:', clientName);
          break;
        }
      }
      
      // If no name in messages, try to get from contact service using phone
      if (!clientName && phone) {
        try {
          const contactsService = (await import('./contactsService.js')).default;
          const contact = await contactsService.getContact(phone);
          if (contact && contact.name && contact.name.trim() && !contact.name.includes('+')) {
            clientName = contact.name.trim();
            console.log('📝 Using contact name from database:', clientName);
          }
        } catch (error) {
          console.log('Could not get contact name:', error.message);
        }
      }
      
      if (clientName) {
        console.log('✅ Client name found:', clientName, 'for phone:', phone);
      } else {
        console.log('⚠️ No client name found for phone:', phone);
      }
    }
    
    let systemContent = `${systemPrompt}\n\nIMPORTANTE: Mantenha suas respostas em no máximo ${maxLength} caracteres. Seja conciso, natural e humano.`;
    
    if (clientName && useClientName) {
      systemContent += `\n\nO nome do CLIENTE que está conversando com você é: ${clientName}. Você deve responder PARA o cliente ${clientName}, não se identificar como ele. Use o nome dele de forma natural nas respostas quando apropriado, mas não em todas as mensagens. Seja sutil e natural.`;
    }
    
    systemContent += `\n\nCONTEXTO IMPORTANTE: Nas mensagens de histórico a seguir:
- Mensagens com role "user" = São mensagens QUE VOCÊ RECEBEU do cliente
- Mensagens com role "assistant" = São respostas QUE VOCÊ ENVIOU para o cliente
- Você nunca deve se confundir sobre quem é quem na conversa`;
    
    const messages = [
      {
        role: 'system',
        content: systemContent
      }
    ];

    // Add conversation history (last 10 messages for context)
    if (conversation && conversation.messages) {
      const recentMessages = conversation.messages.slice(-10);
      for (const msg of recentMessages) {
        if (msg && msg.content && typeof msg.content === 'string' && msg.content.trim()) {
          // Ensure role is correctly identified
          let role = msg.role;
          
          // Validate and fix role
          if (!role || (role !== 'user' && role !== 'assistant')) {
            // Default to user for incoming messages, but log the issue
            role = 'user';
            console.log('⚠️ Message with unclear role detected, defaulting to user:', {
              originalRole: msg.role,
              content: msg.content.substring(0, 50) + '...'
            });
          }
          
          console.log(`📝 Adding ${role} message:`, msg.content.substring(0, 50) + '...');
          
          messages.push({
            role: role,
            content: msg.content
          });
        }
      }
    }

    // Add new messages
    for (const msg of newMessages) {
      const content = await this.extractMessageContent(msg);
      if (content && typeof content === 'string' && content.trim()) {
        messages.push({
          role: 'user',
          content: content
        });
      }
    }

    console.log('✅ Prepared', messages.length, 'messages for GPT-5 Mini');
    console.log('📋 Message roles sequence:', messages.map(m => ({ role: m.role, preview: m.content?.substring(0, 50) })));
    
    // Final validation
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    console.log(`📊 Context: ${userMessages} user messages, ${assistantMessages} assistant messages`);
    
    return messages;
  }

  async extractMessageContent(messageData) {
    let content = '';

    try {
      if (messageData.text && typeof messageData.text === 'string') {
        content = messageData.text.trim();
      } else if (messageData.audio) {
        // Transcribe audio
        const transcription = await audioService.transcribeAudio(messageData.audio);
        content = transcription ? `[Áudio transcrito]: ${transcription}` : '[Áudio não pôde ser transcrito]';
      } else if (messageData.image) {
        // Process image
        const imageDescription = await this.processImage(messageData.image);
        content = imageDescription ? `[Imagem]: ${imageDescription}` : '[Imagem recebida]';
      } else if (messageData.document) {
        content = `[Documento enviado]: ${messageData.document.fileName || 'documento'}`;
      } else {
        content = '[Mensagem não suportada]';
      }

      // Ensure content is never null, undefined, or empty
      return content && content.trim() ? content.trim() : '[Mensagem vazia]';
    } catch (error) {
      console.error('Error extracting message content:', error);
      return '[Erro ao processar mensagem]';
    }
  }

  async processImage(imageData) {
    try {
      if (!this.openai) return 'Imagem recebida';
      if (!imageData) return 'Imagem recebida';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Descreva brevemente esta imagem em português.' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageData}`
                }
              }
            ]
          }
        ],
        max_completion_tokens: 100,
        reasoning_effort: 'minimal'
      });

      return response.choices[0]?.message?.content || 'Imagem recebida';
    } catch (error) {
      console.error('Error processing image with GPT-5 Mini:', error);
      return 'Imagem recebida';
    }
  }

  async generateResponse(messages, retryAttempt = 0) {
    try {
      const emojiEnabled = await configService.get('emoji_enabled') === 'true';
      
      // Filter out messages with null content
      const filteredMessages = messages.filter(msg => 
        msg && msg.content && typeof msg.content === 'string'
      );
      
      if (filteredMessages.length === 0) {
        console.error('No valid messages to process');
        return null;
      }
      
      console.log('Sending to GPT-5 Mini:', filteredMessages.length, 'messages');
      
      // Get dynamic reasoning effort from config, with fallback on retry
      let reasoningEffort = await configService.get('reasoning_effort') || 'minimal';
      
      // Use minimal reasoning on retry attempts to ensure response
      if (retryAttempt > 0) {
        reasoningEffort = 'minimal';
        console.log('Retry attempt', retryAttempt, '- using minimal reasoning effort');
      }
      
      const maxTokens = parseInt(await configService.get('max_response_length')) || 200;
      // Convert characters to approximate tokens (1 token ≈ 3.5 chars in Portuguese)
      const baseTokens = Math.ceil(maxTokens / 3.5);
      
      // Add extra tokens for reasoning effort with guaranteed response tokens
      let reasoningBuffer = 0;
      switch (reasoningEffort) {
        case 'minimal':
          reasoningBuffer = 150; // Ensure we have tokens for response
          break;
        case 'low':
          reasoningBuffer = 300;
          break;
        case 'medium':
          reasoningBuffer = 450;
          break;
        case 'high':
          reasoningBuffer = 600;
          break;
      }
      
      const maxCompletionTokens = Math.min(baseTokens + reasoningBuffer, 1000);
      
      console.log('Making API call to GPT-5 Mini with:', {
        model: 'gpt-5-mini',
        messageCount: filteredMessages.length,
        maxTokens: maxCompletionTokens,
        reasoningEffort,
        attempt: retryAttempt + 1
      });

      let response;
      try {
        response = await this.openai.chat.completions.create({
          model: 'gpt-5-mini',
          messages: filteredMessages,
          max_completion_tokens: maxCompletionTokens,
          // GPT-5 Mini only supports temperature: 1 (default)
          reasoning_effort: reasoningEffort
        });
      } catch (modelError) {
        // If GPT-5 Mini fails, try with GPT-4o-mini as fallback
        if (modelError.status === 404 || modelError.message.includes('model')) {
          console.log('GPT-5 Mini not available, falling back to GPT-4o-mini');
          response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: filteredMessages,
            max_completion_tokens: Math.min(maxCompletionTokens, 500),
            temperature: 0.7
          });
        } else {
          throw modelError;
        }
      }

      console.log('GPT-5 Mini response received:', {
        choices: response.choices?.length || 0,
        content: response.choices?.[0]?.message?.content?.substring(0, 100) || 'No content',
        finishReason: response.choices?.[0]?.finish_reason,
        usage: response.usage
      });

      let content = response.choices[0]?.message?.content || '';
      
      // If no content and we haven't retried yet, retry with minimal reasoning
      if (!content && retryAttempt === 0) {
        console.log('Empty response received, retrying with minimal reasoning...');
        return await this.generateResponse(messages, 1);
      }
      
      if (!content) {
        console.error('GPT-5 Mini returned empty content even after retry!');
        // Return a fallback response to ensure user gets something
        return 'Desculpe, tive um problema técnico. Pode repetir sua mensagem?';
      }
      
      // Apply emoji enhancement if enabled (only on successful first attempt)
      if (emojiEnabled && content && retryAttempt === 0) {
        try {
          content = await this.enhanceWithEmojis(content);
        } catch (emojiError) {
          console.log('Emoji enhancement failed, using original content');
        }
      }

      console.log('Final response being returned:', content.substring(0, 200));
      return content;
    } catch (error) {
      console.error('Error generating response with GPT-5 Mini:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
        response: error.response?.data || 'No response data'
      });
      
      // Handle API key issues
      if (error.status === 401 || error.code === 'invalid_api_key') {
        console.error('⚠️ INVALID API KEY: Please check your OpenAI API key configuration');
        return 'Configuração da API OpenAI inválida. Verifique sua chave API nas configurações.';
      }
      
      // Handle quota/billing issues
      if (error.status === 429 && error.message.includes('quota')) {
        console.error('⚠️ API QUOTA EXCEEDED: OpenAI API quota/billing issue');
        return 'Cota da API OpenAI excedida. Verifique sua conta OpenAI.';
      }
      
      // Retry once with minimal settings on other API errors
      if (retryAttempt === 0 && error.status !== 401) {
        console.log('API error, retrying with minimal reasoning...');
        return await this.generateResponse(messages, 1);
      }
      
      // Log the exact error for debugging
      if (error.message.includes('model')) {
        console.error('Model error - GPT-5 Mini may not be available for your account');
        return 'Modelo GPT-5 Mini não disponível. Verifique se sua conta OpenAI tem acesso.';
      }
      
      // Return specific fallback responses based on error type
      if (error.status === 429) {
        return 'API OpenAI está ocupada. Tente novamente em alguns segundos.';
      }
      
      return 'Estou com problemas técnicos no momento. Tente novamente em alguns segundos.';
    }
  }

  async enhanceWithEmojis(text) {
    try {
      if (!text || typeof text !== 'string') {
        return text;
      }
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: 'Adicione emojis naturalmente ao texto fornecido, mantendo-o natural e não exagerado.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_completion_tokens: 200,
        // GPT-5 Mini only supports temperature: 1 (default)
        reasoning_effort: 'minimal'
      });

      return response.choices[0]?.message?.content || text;
    } catch (error) {
      console.error('Error enhancing with emojis:', error);
      return text;
    }
  }

  async sendHumanizedResponse(phone, response, originalMessages) {
    try {
      const whatsappService = (await import('./whatsappService.js')).default;
      const audioEnabled = await configService.get('audio_enabled') === 'true';
      
      // Check if original message contained audio
      const hasAudioInput = originalMessages.some(msg => msg.audio);
      
      let cleanText, links, phones;
      
      if (audioEnabled && hasAudioInput) {
        // For audio: don't extract contacts here, will be handled in sendContactInfoAsText
        cleanText = response;
        links = [];
        phones = [];
      } else {
        // For text: extract normally
        const extracted = extractLinksAndPhones(response);
        cleanText = extracted.text;
        links = extracted.links;
        phones = extracted.phones;
      }
      
      // For audio responses, don't split - send as single audio
      // For text responses, split by punctuation for humanized sending
      const parts = (audioEnabled && hasAudioInput) ? [cleanText] : this.splitResponseParts(cleanText);
      
      for (const part of parts) {
        if (!part.trim()) continue;
        
        // Show typing/recording status
        if (audioEnabled && hasAudioInput) {
          await whatsappService.sendRecordingStatus(phone, true);
          await this.delay(2000); // Recording simulation
          
          // For audio: filter out contact info (phones, emails, addresses, websites)
          const audioText = this.filterContactInfoForAudio(part);
          
          // Generate and send audio only if there's content after filtering
          if (audioText.trim()) {
            const ttsVoice = await configService.get('tts_voice') || 'alloy';
            const audioBuffer = await audioService.generateTTS(audioText, ttsVoice);
            if (audioBuffer) {
              await whatsappService.sendMessage(phone, {
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                ptt: true
              });
            }
          }
          
          await whatsappService.sendRecordingStatus(phone, false);
        } else {
          // Text response with typing simulation
          await whatsappService.sendTypingStatus(phone, true);
          await this.delay(Math.min(part.length * 50, 3000)); // Typing simulation
          
          await whatsappService.sendMessage(phone, { text: part });
          await whatsappService.sendTypingStatus(phone, false);
        }
        
        // For text responses, add delay between parts
        if (!(audioEnabled && hasAudioInput)) {
          await this.delay(1000);
        }
      }
      
      // Send contact information as text after audio/text response
      await this.sendContactInfoAsText(phone, response, links, phones, audioEnabled && hasAudioInput);
      
    } catch (error) {
      console.error('Error sending humanized response:', error);
    }
  }

  async sendContactInfoAsText(phone, originalResponse, links, phones, wasAudioResponse) {
    try {
      const whatsappService = (await import('./whatsappService.js')).default;
      const contactCardConfig = await configService.get('contact_card_enabled');
      const contactCardEnabled = contactCardConfig === 'true';
      
      // Extract contact info that was filtered from audio
      if (wasAudioResponse) {
        // For audio responses, extract ALL contact info from original response
        const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/g;
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        const websiteRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(com|com\.br|net|org))/g;
        
        const extractedPhones = originalResponse.match(phoneRegex) || [];
        const extractedEmails = originalResponse.match(emailRegex) || [];
        const extractedWebsites = originalResponse.match(websiteRegex) || [];
        
        // Send extracted contact info as text
        for (const phoneNumber of extractedPhones) {
          const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
          if (cleanPhoneNumber.length >= 10 && cleanPhoneNumber.length <= 15) {
            await this.delay(500);
            if (contactCardEnabled) {
              await this.sendContactCard(phone, cleanPhoneNumber);
            } else {
              await whatsappService.sendMessage(phone, { text: phoneNumber.trim() });
            }
          }
        }
        
        for (const email of extractedEmails) {
          await this.delay(500);
          await whatsappService.sendMessage(phone, { text: email.trim() });
        }
        
        for (const website of extractedWebsites) {
          await this.delay(500);
          await whatsappService.sendMessage(phone, { text: website.trim() });
        }
      }
      
      // Send extracted links and phones (only for text responses - audio already handled above)
      if (!wasAudioResponse) {
        for (const link of links) {
          await this.delay(500);
          await whatsappService.sendMessage(phone, { text: link });
        }
        
        for (const phoneNum of phones) {
          await this.delay(500);
          const cleanPhone = phoneNum.replace(/\D/g, '');
          if (contactCardEnabled) {
            await this.sendContactCard(phone, cleanPhone);
          } else {
            await whatsappService.sendMessage(phone, { text: phoneNum });
          }
        }
      }
      
    } catch (error) {
      console.error('Error sending contact info as text:', error);
    }
  }

  async sendContactCard(phone, cleanPhone) {
    try {
      const whatsappService = (await import('./whatsappService.js')).default;
      let formattedPhone = cleanPhone;
      
      // Format Brazilian numbers correctly
      if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
        formattedPhone = `55${cleanPhone}`;
      } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('55')) {
        formattedPhone = `55${cleanPhone}`;
      }
      
      const finalFormattedPhone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;
      
      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:Contato\nTEL;type=CELL;waid=${formattedPhone}:${finalFormattedPhone}\nEND:VCARD`;
      
      // Enviar como texto simples em vez de cartão de contato para evitar erros
      const contactText = `📱 *Contato:*\n${finalFormattedPhone}`;
      await whatsappService.sendMessage(phone, { text: contactText });
    } catch (error) {
      console.error('Error sending contact card:', error);
    }
  }

  splitResponseParts(text) {
    // Split by punctuation marks while preserving them
    return text.split(/([.!?]+)/).reduce((parts, part, index, array) => {
      if (index % 2 === 0) {
        // Text part
        if (part.trim()) {
          const nextPart = array[index + 1];
          parts.push(part.trim() + (nextPart || ''));
        }
      }
      return parts;
    }, []).filter(part => part.trim());
  }

  isLoopDetected(phone, messageData) {
    const key = `${phone}_${messageData.text || messageData.type}`;
    const now = Date.now();
    
    if (!this.antiLoopTracker.has(key)) {
      this.antiLoopTracker.set(key, { count: 1, lastSeen: now });
      return false;
    }
    
    const track = this.antiLoopTracker.get(key);
    
    // If same message within 1 minute
    if (now - track.lastSeen < 60000) {
      track.count++;
      if (track.count > 3) {
        return true; // Loop detected
      }
    } else {
      // Reset counter
      track.count = 1;
    }
    
    track.lastSeen = now;
    return false;
  }

  filterContactInfoForAudio(text) {
    // Remove phone numbers, emails, websites, and addresses from audio
    return text
      // Remove phone numbers (various formats)
      .replace(/(\+?[\d\s\-\(\)]{10,})/g, '')
      // Remove emails
      .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '')
      // Remove websites
      .replace(/(https?:\/\/[^\s]+)/g, '')
      .replace(/(www\.[^\s]+)/g, '')
      .replace(/([a-zA-Z0-9.-]+\.(com|com\.br|net|org|gov|edu))/g, '')
      // Remove WhatsApp links
      .replace(/(wa\.me\/[^\s]+)/g, '')
      // Remove addresses (basic patterns for Brazilian addresses)
      .replace(/(\b(Rua|Av|Avenida|R\.|Rod|Rodovia)\s[^,\n]{10,})/gi, '')
      // Remove CEP
      .replace(/(\d{5}-?\d{3})/g, '')
      // Clean up extra spaces and punctuation
      .replace(/\s*[-:,]\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearMemory(phone) {
    if (this.conversationMemory.has(phone)) {
      this.conversationMemory.delete(phone);
    }
  }

  async evaluateCondition(prompt) {
    try {
      if (!this.openai) {
        console.log('OpenAI not initialized for condition evaluation');
        return false;
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um avaliador preciso. Responda apenas "SIM" ou "NÃO" baseado na análise solicitada.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 10,
        temperature: 0.1
      });

      const result = response.choices[0]?.message?.content?.trim() || '';
      console.log('🎯 Condition evaluation result:', result);
      return result;
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }
}

export default new AIService();