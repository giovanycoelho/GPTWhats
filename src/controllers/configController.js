import express from 'express';
import configService from '../services/configService.js';
import aiService from '../services/aiService.js';

const router = express.Router();

// Get all configurations
router.get('/', async (req, res) => {
  try {
    const configs = await configService.getAll();
    
    // Don't expose sensitive data in response
    const safeConfigs = { ...configs };
    if (safeConfigs.openai_api_key) {
      safeConfigs.openai_api_key = safeConfigs.openai_api_key.replace(/.(?=.{4})/g, '*');
    }
    
    res.json({ success: true, configs: safeConfigs });
  } catch (error) {
    console.error('Error getting configurations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting configurations',
      error: error.message 
    });
  }
});

// Get specific configuration
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await configService.get(key);
    
    // Mask API key
    let maskedValue = value;
    if (key === 'openai_api_key' && value) {
      maskedValue = value.replace(/.(?=.{4})/g, '*');
    }
    
    res.json({ success: true, key, value: maskedValue });
  } catch (error) {
    console.error('Error getting configuration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting configuration',
      error: error.message 
    });
  }
});

// Update configuration
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined || value === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'Value is required' 
      });
    }
    
    const success = await configService.set(key, value.toString());
    
    if (success) {
      // If OpenAI API key was updated, reinitialize AI service
      if (key === 'openai_api_key') {
        await aiService.reinitialize();
      }
      
      res.json({ success: true, message: 'Configuration updated' });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update configuration' 
      });
    }
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating configuration',
      error: error.message 
    });
  }
});

// Update multiple configurations
router.put('/', async (req, res) => {
  try {
    const { configs } = req.body;
    
    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: 'Configurations object is required' 
      });
    }
    
    const success = await configService.setMultiple(configs);
    
    if (success) {
      // If OpenAI API key was updated, reinitialize AI service
      if (configs.openai_api_key) {
        await aiService.reinitialize();
      }
      
      res.json({ success: true, message: 'Configurations updated' });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update configurations' 
      });
    }
  } catch (error) {
    console.error('Error updating configurations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating configurations',
      error: error.message 
    });
  }
});

// Reset configuration to default
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    // Define default values
    const defaults = {
      system_prompt: 'Você é um assistente útil e amigável. Responda de forma natural e humana, mantendo conversas fluidas e contextualizadas.',
      response_delay: '10000',
      audio_enabled: 'false',
      emoji_enabled: 'true',
      call_rejection_enabled: 'true',
      call_rejection_message: 'Desculpe, não posso atender chamadas no momento. Por favor, envie uma mensagem de texto.',
      max_response_length: '200',
      use_client_name: 'true',
      contact_card_enabled: 'true',
      tts_voice: 'alloy'
    };
    
    const defaultValue = defaults[key] || '';
    const success = await configService.set(key, defaultValue);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Configuration reset to default',
        value: defaultValue
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to reset configuration' 
      });
    }
  } catch (error) {
    console.error('Error resetting configuration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error resetting configuration',
      error: error.message 
    });
  }
});

// Test OpenAI API key
router.post('/test-openai', async (req, res) => {
  try {
    const apiKey = await configService.get('openai_api_key');
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'OpenAI API key not configured' 
      });
    }
    
    // Test the API key with a simple request
    const testResult = await aiService.processMessage('test@test.com', {
      text: 'Hello, this is a test.',
      timestamp: Date.now(),
      role: 'user'
    });
    
    if (testResult) {
      res.json({ 
        success: true, 
        message: 'OpenAI API key is valid and working' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'OpenAI API key test failed' 
      });
    }
  } catch (error) {
    console.error('Error testing OpenAI API:', error);
    res.status(400).json({ 
      success: false, 
      message: 'OpenAI API key test failed',
      error: error.message 
    });
  }
});

// Get configuration schema/metadata
router.get('/schema/all', (req, res) => {
  const schema = {
    openai_api_key: {
      type: 'string',
      sensitive: true,
      description: 'Chave da API OpenAI para GPT-5 Mini',
      required: true,
      placeholder: 'sk-...'
    },
    system_prompt: {
      type: 'textarea',
      description: 'Prompt de sistema que define o comportamento da IA',
      required: true,
      placeholder: 'Você é um assistente útil e amigável...'
    },
    response_delay: {
      type: 'number',
      description: 'Tempo em milissegundos para aguardar antes de processar mensagens',
      min: 1000,
      max: 60000,
      step: 1000,
      default: 10000
    },
    audio_enabled: {
      type: 'boolean',
      description: 'Responder com áudio quando receber áudio',
      default: false
    },
    emoji_enabled: {
      type: 'boolean',
      description: 'Adicionar emojis naturalmente nas respostas',
      default: true
    },
    call_rejection_enabled: {
      type: 'boolean',
      description: 'Rejeitar chamadas automaticamente após 3 segundos',
      default: true
    },
    call_rejection_message: {
      type: 'string',
      description: 'Mensagem enviada após rejeitar uma chamada',
      placeholder: 'Desculpe, não posso atender chamadas...'
    },
    max_response_length: {
      type: 'number',
      description: 'Comprimento máximo das respostas em caracteres',
      min: 50,
      max: 1000,
      step: 10,
      default: 200
    },
    reasoning_effort: {
      type: 'select',
      description: 'Nível de reflexão do GPT-5 Mini para gerar respostas',
      options: [
        { value: 'minimal', label: 'Mínimo', description: 'Respostas rápidas e diretas' },
        { value: 'low', label: 'Baixo', description: 'Pensamento básico, ainda rápido' },
        { value: 'medium', label: 'Médio', description: 'Bem elaborado, mais tempo' },
        { value: 'high', label: 'Alto', description: 'Máxima reflexão, mais lento' }
      ],
      default: 'minimal'
    },
    use_client_name: {
      type: 'boolean',
      description: 'Usar o nome do WhatsApp do cliente nas respostas de forma natural',
      default: true
    },
    contact_card_enabled: {
      type: 'boolean',
      description: 'Enviar números de telefone no formato de cartão do WhatsApp',
      default: true
    },
    tts_voice: {
      type: 'select',
      description: 'Voz selecionada para respostas em áudio',
      options: [
        { value: 'alloy', label: 'Alloy - Neutra e equilibrada' },
        { value: 'echo', label: 'Echo - Masculina clara' },
        { value: 'fable', label: 'Fable - Feminina expressiva' },
        { value: 'onyx', label: 'Onyx - Masculina profunda' },
        { value: 'nova', label: 'Nova - Feminina jovem e energética' },
        { value: 'shimmer', label: 'Shimmer - Feminina suave e calorosa' }
      ],
      default: 'alloy'
    }
  };
  
  res.json({ success: true, schema });
});

export default router;