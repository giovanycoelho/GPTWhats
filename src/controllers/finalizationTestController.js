import express from 'express';
import conversationFinalizationService from '../services/conversationFinalizationService.js';

const router = express.Router();

// Test finalization detection with different scenarios
router.post('/test-finalization', async (req, res) => {
  try {
    const { phone, message, conversationHistory } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        error: 'Phone and message are required'
      });
    }

    // Create test message object
    const testMessage = {
      text: message,
      content: message,
      role: 'user',
      timestamp: Date.now()
    };

    // Create test conversation history if not provided
    const testHistory = conversationHistory || [
      { role: 'assistant', content: 'Olá! Como posso ajudá-lo?', timestamp: Date.now() - 300000 },
      { role: 'user', content: 'Quero informações sobre o produto', timestamp: Date.now() - 250000 },
      { role: 'assistant', content: 'Claro! Nosso produto tem várias funcionalidades...', timestamp: Date.now() - 200000 },
      { role: 'user', content: 'Muito bom, obrigado!', timestamp: Date.now() - 150000 },
      { role: 'assistant', content: 'De nada! Fico feliz em ajudar.', timestamp: Date.now() - 100000 }
    ];

    // Test finalization analysis
    const analysis = await conversationFinalizationService.analyzeConversationFinalization(
      phone,
      testMessage,
      testHistory
    );

    res.json({
      success: true,
      testMessage: message,
      analysis: analysis,
      recommendation: analysis.shouldFinalize ? 
        'Conversa deve ser finalizada - não responder automaticamente' : 
        'Conversa deve continuar normalmente',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in finalization test:', error);
    res.status(500).json({
      error: 'Failed to test finalization',
      details: error.message
    });
  }
});

// Test specific finalization patterns
router.post('/test-patterns', async (req, res) => {
  try {
    const testCases = [
      // Despedidas
      { message: 'tchau', expected: true, category: 'goodbye' },
      { message: 'xau obrigado', expected: true, category: 'goodbye_with_thanks' },
      { message: 'até logo', expected: true, category: 'goodbye' },
      { message: 'falou', expected: true, category: 'goodbye' },
      
      // Agradecimentos
      { message: 'obrigado', expected: true, category: 'thanks' },
      { message: 'muito obrigado pela ajuda', expected: true, category: 'thanks' },
      { message: 'valeu', expected: true, category: 'thanks' },
      
      // Confirmações simples
      { message: 'ok', expected: true, category: 'simple_confirmation' },
      { message: 'beleza', expected: true, category: 'simple_confirmation' },
      { message: 'certo', expected: true, category: 'simple_confirmation' },
      
      // Mensagens que NÃO devem finalizar
      { message: 'ok, mas tenho outra dúvida', expected: false, category: 'continuation' },
      { message: 'obrigado, pode me enviar mais informações?', expected: false, category: 'thanks_with_request' },
      { message: 'quanto custa?', expected: false, category: 'question' },
      { message: 'oi, tudo bem?', expected: false, category: 'greeting' }
    ];

    const results = [];
    const testPhone = 'test@s.whatsapp.net';

    for (const testCase of testCases) {
      const testMessage = {
        text: testCase.message,
        content: testCase.message,
        role: 'user',
        timestamp: Date.now()
      };

      // Simple conversation history for pattern testing
      const simpleHistory = [
        { role: 'assistant', content: 'Olá! Como posso ajudá-lo?', timestamp: Date.now() - 60000 },
        { role: 'user', content: 'Quero informações', timestamp: Date.now() - 30000 },
        { role: 'assistant', content: 'Aqui estão as informações...', timestamp: Date.now() - 15000 }
      ];

      const analysis = await conversationFinalizationService.analyzeConversationFinalization(
        testPhone,
        testMessage,
        simpleHistory
      );

      results.push({
        message: testCase.message,
        category: testCase.category,
        expected: testCase.expected,
        actual: analysis.shouldFinalize,
        correct: testCase.expected === analysis.shouldFinalize,
        analysis: analysis,
        confidence: analysis.confidence
      });
    }

    // Calculate accuracy
    const correct = results.filter(r => r.correct).length;
    const total = results.length;
    const accuracy = (correct / total) * 100;

    res.json({
      success: true,
      testResults: results,
      summary: {
        total: total,
        correct: correct,
        accuracy: accuracy.toFixed(1) + '%',
        failed: results.filter(r => !r.correct)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in pattern test:', error);
    res.status(500).json({
      error: 'Failed to test patterns',
      details: error.message
    });
  }
});

// Get finalization statistics
router.get('/stats', async (req, res) => {
  try {
    const db = (await import('../config/database.js')).default;
    
    const stats = await db.all(`
      SELECT 
        followup_type,
        COUNT(*) as count,
        DATE(sent_at) as date
      FROM followup_history 
      WHERE followup_type IN ('conversation_finalized', 'finalization_detected')
      AND sent_at > datetime('now', '-7 days')
      GROUP BY followup_type, DATE(sent_at)
      ORDER BY sent_at DESC
    `);

    const totalFinalized = await db.get(`
      SELECT COUNT(*) as count 
      FROM followup_history 
      WHERE followup_type = 'conversation_finalized'
      AND sent_at > datetime('now', '-24 hours')
    `);

    res.json({
      success: true,
      recentStats: stats,
      last24Hours: totalFinalized.count,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting finalization stats:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      details: error.message
    });
  }
});

// Clear test data
router.delete('/clear-test-data', async (req, res) => {
  try {
    const db = (await import('../config/database.js')).default;
    
    await db.run(`
      DELETE FROM followup_history 
      WHERE phone = 'test@s.whatsapp.net'
    `);

    res.json({
      success: true,
      message: 'Test data cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing test data:', error);
    res.status(500).json({
      error: 'Failed to clear test data',
      details: error.message
    });
  }
});

export default router;