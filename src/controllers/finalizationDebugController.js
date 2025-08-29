import conversationFinalizationService from '../services/conversationFinalizationService.js';

class FinalizationDebugController {
  // GET /api/finalization/diagnostic/:phone
  async getDiagnostic(req, res) {
    try {
      const { phone } = req.params;
      
      if (!phone) {
        return res.status(400).json({ error: 'Telefone é obrigatório' });
      }

      const diagnostic = await conversationFinalizationService.getFinalizationDiagnostic(phone);
      
      res.json({
        success: true,
        diagnostic
      });
    } catch (error) {
      console.error('Erro ao obter diagnóstico:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  // POST /api/finalization/reset/:phone
  async resetFinalization(req, res) {
    try {
      const { phone } = req.params;
      
      if (!phone) {
        return res.status(400).json({ error: 'Telefone é obrigatório' });
      }

      const success = await conversationFinalizationService.resetFinalizationStatus(phone);
      
      if (success) {
        res.json({
          success: true,
          message: `Status de finalização resetado para ${phone}`
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Erro ao resetar status'
        });
      }
    } catch (error) {
      console.error('Erro ao resetar finalização:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  // GET /api/finalization/list-finalized
  async listFinalized(req, res) {
    try {
      const db = (await import('../config/database.js')).default;
      
      const recentFinalizations = await db.all(`
        SELECT phone, message_sent, sent_at, followup_type
        FROM followup_history 
        WHERE followup_type IN ('conversation_finalized', 'finalization_detected')
        AND sent_at > datetime('now', '-24 hours')
        ORDER BY sent_at DESC
        LIMIT 50
      `);

      res.json({
        success: true,
        count: recentFinalizations.length,
        finalizations: recentFinalizations
      });
    } catch (error) {
      console.error('Erro ao listar finalizações:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }

  // POST /api/finalization/reset-all
  async resetAllFinalizations(req, res) {
    try {
      const db = (await import('../config/database.js')).default;
      
      const result = await db.run(`
        DELETE FROM followup_history 
        WHERE followup_type IN ('conversation_finalized', 'finalization_detected')
        AND sent_at > datetime('now', '-24 hours')
      `);

      // Limpar cache
      conversationFinalizationService.analysisCache.clear();

      res.json({
        success: true,
        message: `${result.changes} finalizações resetadas`,
        resetCount: result.changes
      });
    } catch (error) {
      console.error('Erro ao resetar todas as finalizações:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }
}

export default new FinalizationDebugController();