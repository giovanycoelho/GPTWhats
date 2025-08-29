import OpenAI from 'openai';
import configService from './configService.js';
import conversationService from './conversationService.js';
import audioService from './audioService.js';
import messageTrackingService from './messageTrackingService.js';
import conversationFinalizationService from './conversationFinalizationService.js';
import { extractLinksAndPhones } from '../utils/textUtils.js';

class AIService {
  constructor() {
    this.openai = null;
    this.conversationMemory = new Map();
    this.processingQueue = new Map();
    this.antiLoopTracker = new Map();
    this.activeResponses = new Map(); // Track active response generation
    
    // Start periodic cleanup for 24/7 stability
    this.startPeriodicCleanup();
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
    
    // Initialize conversation finalization service cleanup
    conversationFinalizationService.startPeriodicCleanup();
    
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

      // REGRA FUNDAMENTAL: Não responder automaticamente a mensagens de recovery ou pendentes
      // O sistema só deve responder quando o usuário envia uma mensagem nova
      if (messageData.isRecoveryMessage) {
        console.log(`🚫 Não respondendo a mensagem de recovery para ${phone} - aguardando nova mensagem do usuário`);
        return 'recovery_skipped';
      }

      if (messageData.isPendingRecovery) {
        console.log(`🚫 Não respondendo a mensagem pendente para ${phone} - aguardando nova mensagem do usuário`);
        return 'pending_skipped';
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
    // Cancel any active response generation for this phone
    if (this.activeResponses.has(phone)) {
      console.log(`🚫 Cancelando resposta ativa para ${phone} devido a nova mensagem`);
      const activeResponse = this.activeResponses.get(phone);
      activeResponse.cancelled = true;
      // Don't delete immediately - let the processing function clean it up
    }

    // Clear existing timeout for this phone
    if (this.processingQueue.has(phone)) {
      clearTimeout(this.processingQueue.get(phone).timeout);
    }

    // Get existing messages or create new array
    const existingQueue = this.processingQueue.get(phone);
    const messages = existingQueue ? existingQueue.messages : [];
    messages.push(messageData);

    console.log(`📝 Mensagem adicionada à fila para ${phone}. Total na fila: ${messages.length}`);

    // Use um delay mínimo de 3 segundos para permitir batching de mensagens rápidas
    const minDelay = 3000;
    const actualDelay = Math.max(delayMs, minDelay);
    
    // Se já existe uma fila e a última mensagem foi há menos de 2 segundos, 
    // use um delay mais curto para permitir agrupamento natural
    const timeSinceLastMessage = existingQueue ? Date.now() - existingQueue.timestamp : 0;
    const batchingDelay = timeSinceLastMessage < 2000 ? Math.min(actualDelay, 5000) : actualDelay;

    console.log(`⏱️ Aguardando ${batchingDelay}ms antes de processar ${messages.length} mensagem(ns) de ${phone}`);

    // Set new timeout
    const timeout = setTimeout(async () => {
      console.log(`🚀 Processando ${messages.length} mensagem(ns) agrupadas para ${phone}`);
      await this.processQueuedMessages(phone, messages);
      this.processingQueue.delete(phone);
    }, batchingDelay);

    this.processingQueue.set(phone, { 
      messages, 
      timeout, 
      timestamp: Date.now() // Add timestamp for cleanup
    });
  }

  combineMessagesNaturally(messages) {
    if (messages.length === 1) {
      const singleMessage = messages[0];
      // Garantir que a mensagem única tem pelo menos um texto vazio
      if (!singleMessage.text) {
        singleMessage.text = singleMessage.audio ? '[Mensagem de áudio]' :
                            singleMessage.image ? '[Mensagem de imagem]' :
                            singleMessage.document ? '[Documento]' :
                            '[Mensagem sem conteúdo]';
      }
      return singleMessage;
    }

    // Combine text messages naturally
    const textMessages = messages.filter(msg => msg.text && msg.text.trim());
    const nonTextMessages = messages.filter(msg => !msg.text || !msg.text.trim());
    
    let combinedText = '';
    
    if (textMessages.length > 0) {
      // Combine texts with natural separators
      const texts = textMessages.map(msg => msg.text.trim());
      
      // Se as mensagens são curtas (< 20 chars cada), combine com espaço
      if (texts.every(text => text.length < 20)) {
        combinedText = texts.join(' ');
      } else {
        // Para mensagens mais longas, combine com quebra de linha
        combinedText = texts.join('\n');
      }
    }

    // Use a primeira mensagem como base e substitua o texto
    const baseMessage = messages[0];
    const combinedMessage = {
      ...baseMessage,
      text: combinedText || '', // Garantir que text nunca seja undefined
      timestamp: messages[messages.length - 1].timestamp, // Use timestamp da última mensagem
      messageCount: messages.length, // Indicar quantas mensagens foram combinadas
      originalMessages: messages.map(msg => ({ text: msg.text || '', timestamp: msg.timestamp }))
    };

    // Se há mensagens não-texto (áudio, imagem), adicione informação
    if (nonTextMessages.length > 0) {
      const mediaTypes = [...new Set(nonTextMessages.map(msg => msg.type))].filter(Boolean);
      if (mediaTypes.length > 0) {
        // Garantir que temos um texto base antes de concatenar
        combinedMessage.text = (combinedMessage.text || '') + `\n[Mensagem também contém: ${mediaTypes.join(', ')}]`;
      }
    }

    // Se não há texto mas há outras propriedades da mensagem, usar essas
    if (!combinedMessage.text && baseMessage.audio) {
      combinedMessage.text = '[Mensagem de áudio]';
    } else if (!combinedMessage.text && baseMessage.image) {
      combinedMessage.text = '[Mensagem de imagem]';
    } else if (!combinedMessage.text && baseMessage.document) {
      combinedMessage.text = '[Documento enviado]';
    } else if (!combinedMessage.text) {
      combinedMessage.text = '[Mensagem não identificada]';
    }

    return combinedMessage;
  }

  async processQueuedMessages(phone, messages) {
    try {
      console.log(`🔄 Processando ${messages.length} mensagens agrupadas para ${phone}`);
      
      // Registrar que estamos processando uma resposta para este telefone
      this.activeResponses.set(phone, { 
        cancelled: false, 
        startTime: Date.now() 
      });
      
      // Filter out unsupported messages
      const supportedMessages = messages.filter(msg => 
        msg.type !== 'unsupported' && 
        msg.text !== '[Tipo de mensagem não suportado]'
      );
      
      if (supportedMessages.length === 0) {
        console.log('❌ Nenhuma mensagem suportada para processar, ignorando');
        this.activeResponses.delete(phone);
        return;
      }

      // Se há múltiplas mensagens, combine-as de forma natural
      const combinedMessage = this.combineMessagesNaturally(supportedMessages);
      
      // Use a mensagem combinada como uma única mensagem
      const processedMessages = [combinedMessage];
      
      // Get conversation context
      const conversation = await conversationService.getConversation(phone);
      
      // Check if conversation was incorrectly finalized and auto-reset if needed
      const wasAutoReset = await conversationFinalizationService.checkAndAutoReset(phone, processedMessages[0]);
      
      // Check if conversation should be finalized (to avoid loops) - apenas se não foi resetada
      let finalizationAnalysis = { shouldFinalize: false };
      if (!wasAutoReset) {
        const lastMessage = processedMessages[processedMessages.length - 1];
        finalizationAnalysis = await conversationFinalizationService.analyzeConversationFinalization(
          phone, 
          lastMessage, 
          conversation?.messages || []
        );
      }
      
      if (finalizationAnalysis.shouldFinalize) {
        console.log(`🏁 Conversa será finalizada naturalmente: ${phone} - ${finalizationAnalysis.reason}`);
        
        // Marcar conversa como finalizada para evitar follow-ups
        await conversationFinalizationService.markConversationAsFinalized(phone, finalizationAnalysis.reason);
        
        // Não gerar resposta automática
        return;
      }
      
      // Check if cancelled before preparing context
      if (this.activeResponses.get(phone)?.cancelled) {
        console.log(`🚫 Resposta cancelada para ${phone} antes de preparar contexto`);
        this.activeResponses.delete(phone);
        return;
      }
      
      // Prepare messages for AI with phone context
      const contextMessages = await this.prepareContextMessages(conversation, processedMessages, phone);
      
      // Check if cancelled before generating response
      if (this.activeResponses.get(phone)?.cancelled) {
        console.log(`🚫 Resposta cancelada para ${phone} antes de gerar resposta`);
        this.activeResponses.delete(phone);
        return;
      }
      
      // Generate response
      const response = await this.generateResponse(contextMessages, phone);
      
      console.log('Generated response:', response ? 'SUCCESS' : 'FAILED');
      
      // Check if cancelled after generating response
      if (this.activeResponses.get(phone)?.cancelled) {
        console.log(`🚫 Resposta cancelada para ${phone} após gerar resposta`);
        this.activeResponses.delete(phone);
        return;
      }
      
      if (response) {
        // Save conversation with combined message approach
        if (processedMessages[0].messageCount > 1) {
          // Para mensagens combinadas, salve como uma única mensagem do usuário
          await conversationService.addMessage(phone, {
            role: 'user',
            content: processedMessages[0].text,
            timestamp: processedMessages[0].timestamp,
            messageType: 'combined_message',
            originalMessageCount: processedMessages[0].messageCount
          });
        } else {
          // Para mensagem única, salve normalmente
          await conversationService.addMessage(phone, {
            role: 'user',
            content: processedMessages[0].text || '[Mensagem não identificada]',
            timestamp: processedMessages[0].timestamp || Date.now()
          });
        }
        
        await conversationService.addMessage(phone, {
          role: 'assistant',
          content: response,
          timestamp: Date.now(),
          messageType: 'main_response' // Mark as main response
        });

        // Final check before sending response
        if (this.activeResponses.get(phone)?.cancelled) {
          console.log(`🚫 Resposta cancelada para ${phone} antes de enviar`);
          this.activeResponses.delete(phone);
          return;
        }

        // Send response
        console.log('Sending humanized response to', phone);
        await this.sendHumanizedResponse(phone, response, supportedMessages);
        console.log('Response sent successfully');

        // Mark all messages in the batch as responded in tracking system
        for (const msg of supportedMessages) {
          if (msg.messageId) {
            await messageTrackingService.markResponseSent(phone, msg.messageId, 'ai');
          }
        }
        
        // Also mark conversation as responded to catch any missed messages
        await messageTrackingService.markConversationResponded(phone, Date.now() - 300000); // Last 5 minutes

        // Process external notifications asynchronously (non-blocking)
        const externalNotificationsService = (await import('./externalNotificationsService.js')).default;
        const firstMessageContactName = supportedMessages.length > 0 ? supportedMessages[0].contactName : null;
        await externalNotificationsService.processNotificationsAsync(response, conversation, phone, firstMessageContactName);

        // Schedule followup analysis for this conversation (non-blocking)
        this.scheduleFollowupAnalysis(phone);
      } else {
        console.error('No response generated, skipping message sending');
      }
      
      // Clear active response state
      this.activeResponses.delete(phone);
    } catch (error) {
      console.error('Error processing queued messages:', error);
      // Clear active response state on error
      this.activeResponses.delete(phone);
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
      
    }
    
    // Criar um prompt mais restritivo e estruturado
    let systemContent = `PAPEL E PERSONALIDADE:
${systemPrompt}

REGRAS CRÍTICAS - SIGA RIGOROSAMENTE:
1. LIMITE DE CARACTERES: Suas respostas devem ter NO MÁXIMO ${maxLength} caracteres. Conte os caracteres e não exceda este limite jamais.
2. FIDELIDADE AO PAPEL: Você DEVE responder apenas conforme sua personalidade definida acima. NÃO saia do seu papel definido.
3. PROIBIDO INVENTAR: Não invente informações, dados, números de telefone, endereços ou fatos que não foram fornecidos.
4. MANTENHA O FOCO: Responda apenas sobre os tópicos relacionados ao seu papel. Se perguntado sobre algo fora do seu escopo, redirecione educadamente.
5. SEJA CONSISTENTE: Mantenha o mesmo tom e personalidade em todas as respostas.

INSTRUÇÕES DE RESPOSTA:
- Seja conciso, natural e humano
- Responda de forma direta ao que foi perguntado
- Use linguagem apropriada para WhatsApp (informal, mas educada)
- Evite respostas muito longas ou técnicas demais`;
    
    if (clientName && useClientName) {
      systemContent += `\n\nINFORMAÇÕES DO CLIENTE:
- Nome do cliente: ${clientName}
- Use o nome de forma natural e sutil, não em todas as mensagens
- Você está respondendo PARA o cliente ${clientName}, não se identifique como ele`;
    }
    
    systemContent += `\n\nCONTEXTO DA CONVERSA:
- Mensagens com role "user" = mensagens que VOCÊ RECEBEU do cliente
- Mensagens com role "assistant" = respostas que VOCÊ ENVIOU para o cliente
- Mantenha a continuidade da conversa baseada no histórico
- Não repita informações já fornecidas recentemente

VALIDAÇÃO FINAL:
Antes de responder, certifique-se de que:
✓ A resposta está dentro do limite de ${maxLength} caracteres
✓ A resposta está alinhada com sua personalidade definida
✓ Você não inventou nenhuma informação
✓ A resposta é relevante para a pergunta do cliente`;
    
    const messages = [
      {
        role: 'system',
        content: systemContent
      }
    ];

    // Add conversation history (last 20 messages for better context)
    if (conversation && conversation.messages) {
      const recentMessages = conversation.messages.slice(-20);
      
      // Extract context information to avoid repetitive greetings
      const conversationContext = await conversationService.extractContextFromMessages(conversation.messages);
      
      // Add context information to system prompt
      if (conversationContext.hasGreeted) {
        systemContent += `\n\nCONTEXTO DA CONVERSA: Você já cumprimentou este cliente anteriormente nesta conversa. NÃO cumprimente novamente a menos que seja apropriado (ex: após muitas horas). Continue a conversa de forma natural sem repetir saudações.`;
      }
      
      if (conversationContext.recentTopics.length > 0) {
        systemContent += `\n\nTÓPICOS RECENTES: ${conversationContext.recentTopics.join(', ')}. Use essas informações para manter a continuidade da conversa.`;
      }
      
      for (const msg of recentMessages) {
        if (msg && msg.content && typeof msg.content === 'string' && msg.content.trim()) {
          // Skip contact info messages from context to avoid confusion
          if (msg.messageType === 'contact_info') {
            console.log('📝 Skipping contact info message from context:', msg.content.substring(0, 50) + '...');
            continue;
          }
          
          // Ensure role is correctly identified
          let role = msg.role;
          
          // Validate and fix role
          if (!role || (role !== 'user' && role !== 'assistant')) {
            role = 'user';
          }
          
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

    console.log(`✅ Prepared ${messages.length} messages for GPT-5 Mini`);
    
    return messages;
  }

  async extractMessageContent(messageData) {
    let content = '';

    try {

      // Priority: Process audio even if there's fallback text
      if (messageData.audio) {
        // Transcribe audio
        try {
          // Check if audio is a buffer or needs to be downloaded
          let audioBuffer = messageData.audio;
          
          if (!Buffer.isBuffer(audioBuffer)) {
            // It might be a message object, try to download it
            audioBuffer = await audioService.downloadWhatsAppMedia(messageData.audio);
          }
          
          if (!audioBuffer) {
            throw new Error('Não foi possível obter buffer de áudio');
          }
          
          const transcription = await audioService.transcribeAudio(audioBuffer);
          if (transcription && transcription.trim()) {
            content = `[Áudio transcrito]: ${transcription.trim()}`;
          } else {
            content = '[Áudio não pôde ser transcrito - sem conteúdo]';
          }
        } catch (audioError) {
          console.error('❌ Erro na transcrição de áudio:', audioError.message);
          content = '[Erro na transcrição de áudio]';
        }
      } else if (messageData.text && typeof messageData.text === 'string') {
        content = messageData.text.trim();
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

  async generateResponse(messages, phone = null, retryAttempt = 0) {
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

      // Check if cancelled before making API call
      if (phone && this.activeResponses.get(phone)?.cancelled) {
        console.log(`🚫 Resposta cancelada para ${phone} antes da chamada API`);
        return null;
      }

      let response;
      try {
        response = await this.openai.chat.completions.create({
          model: 'gpt-5-mini',
          messages: filteredMessages,
          max_completion_tokens: maxCompletionTokens,
          // GPT-5 Mini only supports temperature: 1 (default)
          reasoning_effort: reasoningEffort
        });
        
        // Check if cancelled after API call
        if (phone && this.activeResponses.get(phone)?.cancelled) {
          console.log(`🚫 Resposta cancelada para ${phone} após chamada API`);
          return null;
        }
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
        return await this.generateResponse(messages, phone, 1);
      }
      
      if (!content) {
        console.error('GPT-5 Mini returned empty content even after retry!');
        // Return a fallback response to ensure user gets something
        return 'Desculpe, tive um problema técnico. Pode repetir sua mensagem?';
      }
      
      // Validação adicional da resposta para garantir conformidade com as regras
      content = await this.validateAndImproveResponse(content, messages, retryAttempt);
      
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
        return await this.generateResponse(messages, phone, 1);
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
      // Check if response was cancelled before starting
      if (this.activeResponses.get(phone)?.cancelled) {
        console.log(`🚫 Resposta cancelada para ${phone} antes de enviar humanizada`);
        return;
      }
      
      const whatsappService = (await import('./whatsappService.js')).default;
      const audioEnabled = await configService.get('audio_enabled') === 'true';
      
      // Check if original message contained audio
      const hasAudioInput = originalMessages.some(msg => msg.audio);
      
      let cleanText, links, phones, whatsappLinks;
      
      if (audioEnabled && hasAudioInput) {
        // For audio: don't extract contacts here, will be handled in sendContactInfoAsText
        cleanText = response;
        links = [];
        phones = [];
        whatsappLinks = [];
      } else {
        // For text: extract normally
        const extracted = extractLinksAndPhones(response);
        cleanText = extracted.text;
        links = extracted.links;
        phones = extracted.phones;
        whatsappLinks = extracted.whatsappLinks || [];
      }
      
      // For audio responses, don't split - send as single audio
      // For text responses, split by punctuation for humanized sending
      const parts = (audioEnabled && hasAudioInput) ? [cleanText] : this.splitResponseParts(cleanText);
      
      for (const part of parts) {
        if (!part.trim()) continue;
        
        // Check if cancelled before sending each part
        if (this.activeResponses.get(phone)?.cancelled) {
          console.log(`🚫 Resposta cancelada para ${phone} durante envio de partes`);
          return;
        }
        
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
      await this.sendContactInfoAsText(phone, response, links, phones, whatsappLinks, audioEnabled && hasAudioInput);
      
    } catch (error) {
      console.error('Error sending humanized response:', error);
    }
  }

  async sendContactInfoAsText(phone, originalResponse, links, phones, whatsappLinks, wasAudioResponse) {
    try {
      // Check if response was cancelled before sending contact info
      if (this.activeResponses.get(phone)?.cancelled) {
        console.log(`🚫 Resposta cancelada para ${phone} antes de enviar informações de contato`);
        return;
      }
      
      const whatsappService = (await import('./whatsappService.js')).default;
      const contactCardConfig = await configService.get('contact_card_enabled');
      const contactCardEnabled = contactCardConfig === 'true';
      
      // Collect all contact information to send as a grouped message
      const contactInfo = [];
      
      // Extract contact info that was filtered from audio
      if (wasAudioResponse) {
        // For audio responses, extract contact info from original response but avoid duplicates
        const { links: extractedLinks, phones: extractedPhones, whatsappLinks: extractedWhatsappLinks } = extractLinksAndPhones(originalResponse);
        
        // Add phones to contact info (avoiding duplicates with Set)
        const uniquePhones = new Set();
        extractedPhones.forEach(phoneNumber => {
          const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
          if (cleanPhoneNumber.length >= 10 && cleanPhoneNumber.length <= 15 && !uniquePhones.has(cleanPhoneNumber)) {
            uniquePhones.add(cleanPhoneNumber);
            contactInfo.push({ type: 'phone', value: phoneNumber.trim(), clean: cleanPhoneNumber });
          }
        });
        
        // Add extracted links and WhatsApp links (merge with parameters)
        extractedLinks.forEach(link => {
          if (!links.includes(link)) {
            contactInfo.push({ type: 'link', value: link });
          }
        });
        
        // Merge WhatsApp links avoiding duplicates
        extractedWhatsappLinks.forEach(waLink => {
          if (!whatsappLinks.includes(waLink)) {
            whatsappLinks.push(waLink);
          }
        });
      }
      
      // Add extracted links and phones (only for text responses - audio already handled above)
      if (!wasAudioResponse) {
        // Use Sets to avoid duplicate links and phones
        const uniqueLinks = new Set();
        const uniquePhones = new Set();
        
        links.forEach(link => {
          if (!uniqueLinks.has(link)) {
            uniqueLinks.add(link);
            contactInfo.push({ type: 'link', value: link });
          }
        });
        
        phones.forEach(phoneNum => {
          const cleanPhone = phoneNum.replace(/\D/g, '');
          if (!uniquePhones.has(cleanPhone)) {
            uniquePhones.add(cleanPhone);
            contactInfo.push({ type: 'phone', value: phoneNum, clean: cleanPhone });
          }
        });
      }
      
      // Handle WhatsApp links separately (always send as cards)
      if (whatsappLinks && whatsappLinks.length > 0) {
        for (const whatsappLink of whatsappLinks) {
          await this.delay(500);
          await this.sendWhatsAppLinkAsCard(phone, whatsappLink);
        }
      }
      
      // If there's contact info to send, group it intelligently
      if (contactInfo.length > 0) {
        // Group by type for better organization and remove final duplicates
        const phoneContacts = contactInfo.filter(item => item.type === 'phone');
        const emailContacts = contactInfo.filter(item => item.type === 'email');
        const linkContacts = contactInfo.filter(item => ['website', 'link'].includes(item.type));
        
        // Final deduplication by clean phone number to prevent multiple mentions
        const uniquePhoneContacts = [];
        const seenCleanPhones = new Set();
        phoneContacts.forEach(phoneContact => {
          if (!seenCleanPhones.has(phoneContact.clean)) {
            seenCleanPhones.add(phoneContact.clean);
            uniquePhoneContacts.push(phoneContact);
          }
        });
        
        // Send phone contacts (as cards if enabled, or grouped text)
        if (uniquePhoneContacts.length > 0) {
          if (contactCardEnabled) {
            // Send each phone as a contact card
            for (const phoneContact of uniquePhoneContacts) {
              await this.delay(500);
              await this.sendContactCard(phone, phoneContact.clean);
            }
          } else {
            // Group phones in a single message
            const phoneText = `📱 *Contatos:*\n${uniquePhoneContacts.map(p => p.value).join('\n')}`;
            await whatsappService.sendMessage(phone, { text: phoneText });
            
            // Save grouped contact message to conversation with special marking
            await conversationService.addMessage(phone, {
              role: 'assistant',
              content: phoneText,
              timestamp: Date.now(),
              messageType: 'contact_info' // Mark as contact info, not main conversation
            });
          }
        }
        
        // Send emails and links grouped
        const otherContacts = [...emailContacts, ...linkContacts];
        if (otherContacts.length > 0) {
          await this.delay(500);
          const contactText = `📧 *Informações:*\n${otherContacts.map(c => c.value).join('\n')}`;
          await whatsappService.sendMessage(phone, { text: contactText });
          
          // Save grouped contact message to conversation with special marking
          await conversationService.addMessage(phone, {
            role: 'assistant',
            content: contactText,
            timestamp: Date.now(),
            messageType: 'contact_info' // Mark as contact info, not main conversation
          });
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
      
      // Try to send as contact card first, fallback to text if it fails
      try {
        await whatsappService.sendMessage(phone, {
          contacts: {
            displayName: 'Contato',
            contacts: [{
              vcard: vcard
            }]
          }
        });
      } catch (contactError) {
        console.log('Contact card failed, sending as text:', contactError.message);
        const contactText = `📱 *Contato:*\n${finalFormattedPhone}`;
        await whatsappService.sendMessage(phone, { text: contactText });
      }
    } catch (error) {
      console.error('Error sending contact card:', error);
    }
  }

  async sendWhatsAppLinkAsCard(phone, whatsappLink) {
    try {
      const whatsappService = (await import('./whatsappService.js')).default;
      const conversationService = (await import('./conversationService.js')).default;
      
      // Extract phone number from WhatsApp link
      const phoneMatch = whatsappLink.match(/https:\/\/wa\.me\/(\d+)/);
      if (!phoneMatch) {
        console.error('Invalid WhatsApp link format:', whatsappLink);
        return;
      }
      
      let contactPhone = phoneMatch[1];
      let formattedPhone = contactPhone;
      
      // Format Brazilian numbers correctly for contact card
      if (contactPhone.length === 11 && !contactPhone.startsWith('55')) {
        formattedPhone = `55${contactPhone}`;
      } else if (contactPhone.length === 10 && !contactPhone.startsWith('55')) {
        formattedPhone = `55${contactPhone}`;
      }
      
      const finalFormattedPhone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;
      const displayPhone = finalFormattedPhone;
      
      // Create contact card with WhatsApp link information
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:Contato WhatsApp
TEL;type=CELL;waid=${formattedPhone}:${finalFormattedPhone}
URL:${whatsappLink}
END:VCARD`;
      
      try {
        // Use Baileys-compatible contact format
        await whatsappService.sendMessage(phone, {
          contacts: {
            displayName: 'Contato WhatsApp',
            contacts: [{
              vcard: vcard
            }]
          }
        });
        
        console.log(`📇 WhatsApp link sent as contact card: ${whatsappLink}`);
        
        // Save to conversation for external notification processing
        await conversationService.addMessage(phone, {
          role: 'assistant',
          content: `Cartão de contato WhatsApp enviado: ${whatsappLink}`,
          timestamp: Date.now(),
          messageType: 'whatsapp_link_card',
          originalLink: whatsappLink // Keep original link for external notifications
        });
        
      } catch (contactError) {
        console.log('⚠️ Contact card failed, sending as formatted text with link:', contactError.message);
        
        // Fallback: Send as formatted text with clickable link
        const cardText = `📱 *Contato WhatsApp*

👤 Telefone: ${displayPhone}
🔗 Link: ${whatsappLink}

_Clique no link para iniciar conversa diretamente_`;

        await whatsappService.sendMessage(phone, { text: cardText });
        
        // Save to conversation for external notification processing
        await conversationService.addMessage(phone, {
          role: 'assistant',
          content: cardText,
          timestamp: Date.now(),
          messageType: 'whatsapp_link_text',
          originalLink: whatsappLink // Keep original link for external notifications
        });
      }
      
    } catch (error) {
      console.error('Error sending WhatsApp link as card:', error);
    }
  }

  splitResponseParts(text) {
    // Split by punctuation marks while preserving them
    const initialParts = text.split(/([.!?]+)/).reduce((parts, part, index, array) => {
      if (index % 2 === 0) {
        // Text part
        if (part.trim()) {
          const nextPart = array[index + 1];
          parts.push(part.trim() + (nextPart || ''));
        }
      }
      return parts;
    }, []).filter(part => part.trim());

    // Limitar a máximo 4 partes (excluindo telefones e links que são enviados separadamente)
    const MAX_PARTS = 4;
    
    if (initialParts.length <= MAX_PARTS) {
      return initialParts;
    }

    // Se há muitas partes, combine as partes menores
    const combinedParts = [];
    let currentCombined = '';
    const targetLength = Math.ceil(text.length / MAX_PARTS);

    for (let i = 0; i < initialParts.length; i++) {
      const part = initialParts[i];
      
      if (currentCombined.length === 0) {
        currentCombined = part;
      } else if (currentCombined.length + part.length < targetLength * 1.5 && combinedParts.length < MAX_PARTS - 1) {
        // Combine with current if under target length and not the last allowed part
        currentCombined += ' ' + part;
      } else {
        // Save current and start new
        combinedParts.push(currentCombined);
        currentCombined = part;
      }
    }

    // Add the last combined part
    if (currentCombined) {
      combinedParts.push(currentCombined);
    }

    console.log(`📝 Mensagem dividida em ${combinedParts.length} partes (máximo ${MAX_PARTS})`);
    return combinedParts;
  }

  isLoopDetected(phone, messageData) {
    const messageText = messageData.text || messageData.type || '';
    const key = `${phone}_${messageText}`;
    const now = Date.now();
    
    // Clean up old entries (older than 10 minutes)
    for (const [trackedKey, data] of this.antiLoopTracker) {
      if (now - data.lastSeen > 600000) { // 10 minutes
        this.antiLoopTracker.delete(trackedKey);
      }
    }
    
    if (!this.antiLoopTracker.has(key)) {
      this.antiLoopTracker.set(key, { 
        count: 1, 
        lastSeen: now,
        messageHistory: [messageText.substring(0, 50)] // Store snippet for debugging
      });
      return false;
    }
    
    const track = this.antiLoopTracker.get(key);
    
    // If same message within 2 minutes (increased from 1 minute)
    if (now - track.lastSeen < 120000) {
      track.count++;
      track.messageHistory.push(messageText.substring(0, 50));
      
      // Keep only last 5 message snippets
      if (track.messageHistory.length > 5) {
        track.messageHistory = track.messageHistory.slice(-5);
      }
      
      if (track.count > 2) { // Reduced threshold from 3 to 2
        console.log(`🔄 Loop detected for ${phone}:`, {
          count: track.count,
          timeWindow: now - track.lastSeen,
          recentMessages: track.messageHistory
        });
        return true; // Loop detected
      }
    } else {
      // Reset counter but keep some history
      track.count = 1;
      track.messageHistory = [messageText.substring(0, 50)];
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

  async validateAndImproveResponse(content, originalMessages, retryAttempt) {
    try {
      const maxLength = parseInt(await configService.get('max_response_length')) || 200;
      const systemPrompt = await configService.get('system_prompt') || 'Você é um assistente útil e amigável.';
      const validationEnabled = await configService.get('response_validation_enabled') === 'true';
      
      // Verificação básica de tamanho (sempre ativa)
      if (content.length > maxLength) {
        console.log(`⚠️ Resposta muito longa (${content.length}/${maxLength} chars), truncando...`);
        content = content.substring(0, maxLength - 3) + '...';
      }
      
      // Se validação não está ativada ou já tentamos uma vez, retornar sem validação avançada
      if (!validationEnabled || retryAttempt > 0) {
        return content;
      }
      
      // Validação avançada: verificar se a resposta está alinhada com o prompt
      const validationPrompt = `Analise se a resposta abaixo está seguindo as regras definidas:

PROMPT ORIGINAL: "${systemPrompt.substring(0, 500)}..."

RESPOSTA PARA VALIDAR: "${content}"

REGRAS A VERIFICAR:
1. A resposta está alinhada com a personalidade/papel definido?
2. A resposta não inventa informações não fornecidas?
3. A resposta é apropriada para o contexto?
4. A resposta mantém o foco no tópico?

Responda apenas:
- "APROVADA" se a resposta segue todas as regras
- "CORRIGIR: [explicação breve]" se precisa ajustes

Seja rigoroso na avaliação.`;

      const validationResponse = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um validador rigoroso de respostas de IA. Seja crítico e preciso.'
          },
          {
            role: 'user',
            content: validationPrompt
          }
        ],
        max_completion_tokens: 100,
        reasoning_effort: 'minimal'
      });

      const validationResult = validationResponse.choices[0]?.message?.content || 'APROVADA';
      
      if (validationResult.includes('CORRIGIR')) {
        console.log('🔍 Resposta precisa de correção:', validationResult);
        
        // Tentar corrigir a resposta
        const correctionPrompt = `Corrija a resposta abaixo para que siga rigorosamente as regras:

PROMPT ORIGINAL: "${systemPrompt.substring(0, 300)}..."
RESPOSTA ATUAL: "${content}"
PROBLEMA IDENTIFICADO: "${validationResult}"

REGRAS OBRIGATÓRIAS:
- Máximo ${maxLength} caracteres
- Seguir exatamente a personalidade definida
- Não inventar informações
- Manter foco no tópico

Forneça apenas a resposta corrigida, sem explicações:`;

        const correctionResponse = await this.openai.chat.completions.create({
          model: 'gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: 'Corrija a resposta para seguir as regras. Responda apenas com a versão corrigida.'
            },
            {
              role: 'user',
              content: correctionPrompt
            }
          ],
          max_completion_tokens: Math.min(maxLength, 200),
          reasoning_effort: 'minimal'
        });

        const correctedContent = correctionResponse.choices[0]?.message?.content || content;
        
        // Verificar se a correção não ultrapassou o limite
        if (correctedContent.length <= maxLength) {
          console.log('✅ Resposta corrigida aplicada');
          return correctedContent;
        } else {
          console.log('⚠️ Correção muito longa, mantendo original truncada');
          return content;
        }
      } else {
        console.log('✅ Resposta aprovada na validação');
        return content;
      }
      
    } catch (error) {
      console.error('Erro na validação da resposta:', error);
      // Em caso de erro, retornar a resposta original
      return content;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearMemory(phone) {
    if (this.conversationMemory.has(phone)) {
      this.conversationMemory.delete(phone);
    }
  }

  // Critical: Periodic cleanup for 24/7 stability
  startPeriodicCleanup() {
    // Clean up memory maps every 30 minutes
    setInterval(() => {
      try {
        this.cleanupMemoryMaps();
        this.logMemoryUsage();
      } catch (error) {
        console.error('Error in periodic cleanup:', error);
      }
    }, 1800000); // 30 minutes

    // Force garbage collection every hour (if available)
    setInterval(() => {
      try {
        if (global.gc) {
          console.log('🧹 Running manual garbage collection...');
          global.gc();
        }
      } catch (error) {
        console.error('Error running garbage collection:', error);
      }
    }, 3600000); // 1 hour

    console.log('🔄 Started periodic cleanup for 24/7 stability');
  }

  cleanupMemoryMaps() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    let cleaned = 0;

    // Clean old conversation memory
    for (const [key, data] of this.conversationMemory) {
      if (now - (data.lastActivity || 0) > maxAge) {
        this.conversationMemory.delete(key);
        cleaned++;
      }
    }

    // Clean completed processing queues (they should auto-delete, but safety net)
    for (const [phone, data] of this.processingQueue) {
      if (now - (data.timestamp || 0) > 600000) { // 10 minutes
        if (data.timeout) clearTimeout(data.timeout);
        this.processingQueue.delete(phone);
        cleaned++;
      }
    }

    // Clean old anti-loop tracker entries (already implemented in isLoopDetected)
    // but add extra safety net
    for (const [key, data] of this.antiLoopTracker) {
      if (now - data.lastSeen > 1800000) { // 30 minutes
        this.antiLoopTracker.delete(key);
        cleaned++;
      }
    }

    // Clean old active responses (stuck responses)
    for (const [phone, data] of this.activeResponses) {
      if (now - (data.startTime || 0) > 300000) { // 5 minutes
        console.log(`🧹 Limpando resposta ativa travada para ${phone}`);
        this.activeResponses.delete(phone);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old memory entries`);
    }
  }

  logMemoryUsage() {
    const memUsage = process.memoryUsage();
    const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
    
    console.log('📊 Memory Usage:', {
      rss: formatBytes(memUsage.rss),
      heapUsed: formatBytes(memUsage.heapUsed),
      heapTotal: formatBytes(memUsage.heapTotal),
      external: formatBytes(memUsage.external),
      maps: {
        conversationMemory: this.conversationMemory.size,
        processingQueue: this.processingQueue.size,
        antiLoopTracker: this.antiLoopTracker.size,
        activeResponses: this.activeResponses.size
      }
    });

    // Alert if memory usage is too high
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 500) { // 500MB threshold
      console.warn('⚠️ HIGH MEMORY USAGE detected:', formatBytes(memUsage.heapUsed));
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

  // Schedule followup analysis (non-blocking)
  scheduleFollowupAnalysis(phone) {
    // Run asynchronously to not block current response
    setImmediate(async () => {
      try {
        const followupService = (await import('./followupService.js')).default;
        
        // Check if follow-up is enabled before scheduling
        const settings = await followupService.getSettings();
        if (!settings?.enabled) {
          console.log(`⏭️ Follow-up desativado, ignorando agendamento para ${phone}`);
          return;
        }
        
        await followupService.scheduleFollowupAnalysis(phone);
      } catch (error) {
        console.error('Error scheduling followup analysis:', error);
      }
    });
  }
}

export default new AIService();