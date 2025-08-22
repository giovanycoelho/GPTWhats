import express from 'express';
import audioService from '../services/audioService.js';

const router = express.Router();

// Generate audio preview for voice selection
router.post('/preview', async (req, res) => {
  try {
    const { text, voice } = req.body;
    
    if (!text || !voice) {
      return res.status(400).json({ 
        success: false, 
        message: 'Text and voice parameters are required' 
      });
    }

    // Generate audio using OpenAI TTS
    const audioBuffer = await audioService.generateTTS(text, voice);
    
    if (!audioBuffer) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate audio preview' 
      });
    }

    // Send audio file as response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'no-cache'
    });
    
    res.send(audioBuffer);
    
  } catch (error) {
    console.error('Error generating audio preview:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating audio preview',
      error: error.message 
    });
  }
});

export default router;