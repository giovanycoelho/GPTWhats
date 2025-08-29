import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import OpenAI from 'openai';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import gtts from 'node-gtts';
import configService from './configService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

class AudioService {
  constructor() {
    this.openai = null;
    this.tempDir = path.join(__dirname, '../../temp');
    this.init();
  }

  async init() {
    // Ensure temp directory exists
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('❌ Erro criando diretório temp:', error);
    }

    // Initialize OpenAI for Whisper
    const apiKey = await configService.get('openai_api_key');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      console.log('🤖 AudioService inicializado com OpenAI');
    } else {
      console.error('❌ Chave API OpenAI não encontrada - transcrição não funcionará');
    }
  }

  async convertOggToMp3(oggBuffer) {
    return new Promise((resolve, reject) => {
      const inputPath = path.join(this.tempDir, `${uuidv4()}.ogg`);
      const outputPath = path.join(this.tempDir, `${uuidv4()}.mp3`);

      // Write buffer to temporary file
      fs.writeFile(inputPath, oggBuffer)
        .then(async () => {
          ffmpeg(inputPath)
            .toFormat('mp3')
            .audioCodec('libmp3lame')
            .audioBitrate(128)
            .on('end', async () => {
              try {
                const mp3Buffer = await fs.readFile(outputPath);
                
                // Cleanup temp files
                await this.cleanupFile(inputPath);
                await this.cleanupFile(outputPath);
                
                resolve(mp3Buffer);
              } catch (error) {
                console.error('❌ Erro lendo arquivo MP3 convertido:', error);
                reject(error);
              }
            })
            .on('error', async (error) => {
              console.error('❌ Erro na conversão FFmpeg:', error);
              await this.cleanupFile(inputPath);
              await this.cleanupFile(outputPath);
              reject(error);
            })
            .save(outputPath);
        })
        .catch((error) => {
          console.error('❌ Erro escrevendo arquivo OGG temporário:', error);
          reject(error);
        });
    });
  }

  async transcribeAudio(audioBuffer) {
    try {
      // Initialize OpenAI if not already done
      if (!this.openai) {
        await this.init();
        if (!this.openai) {
          console.error('❌ OpenAI não configurado para transcrição');
          return '[Áudio não pôde ser transcrito - API não configurada]';
        }
      }

      // Validate audioBuffer
      if (!audioBuffer || !Buffer.isBuffer(audioBuffer)) {
        console.error('❌ Buffer de áudio inválido');
        return '[Áudio inválido]';
      }

      // Convert OGG to MP3 if needed
      let processedBuffer = audioBuffer;
      const tempPath = path.join(this.tempDir, `${uuidv4()}.mp3`);

      try {
        // WhatsApp audio is typically OGG Opus, convert to MP3
        processedBuffer = await this.convertOggToMp3(audioBuffer);
        console.log('✅ Áudio convertido para transcrição');
      } catch (conversionError) {
        console.error('❌ Conversão falhou, usando buffer original:', conversionError.message);
        processedBuffer = audioBuffer; // Fallback to original buffer
      }

      // Write to temporary file for Whisper
      await fs.writeFile(tempPath, processedBuffer);

      // Transcribe using Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: createReadStream(tempPath),
        model: 'whisper-1',
        language: 'pt',
        response_format: 'text'
      });

      console.log('✅ Áudio transcrito:', transcription ? `"${transcription.substring(0, 100)}..."` : 'vazio');

      // Cleanup
      await this.cleanupFile(tempPath);

      return transcription || '[Áudio não pôde ser transcrito]';
    } catch (error) {
      console.error('❌ Erro na transcrição:', error.message);
      return '[Erro na transcrição do áudio]';
    }
  }

  async generateAudio(text) {
    try {
      if (!this.openai) {
        console.log('OpenAI not initialized for TTS');
        return null;
      }

      // Use OpenAI TTS
      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
        response_format: 'mp3',
        speed: 1.0
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('Error generating audio with OpenAI TTS:', error);
      
      // Fallback to Google TTS
      try {
        return await this.generateAudioWithGTTS(text);
      } catch (fallbackError) {
        console.error('Error with fallback TTS:', fallbackError);
        return null;
      }
    }
  }

  async generateTTS(text, voice = 'alloy') {
    try {
      if (!this.openai) {
        await this.init();
        if (!this.openai) {
          console.log('OpenAI not initialized for TTS');
          return null;
        }
      }

      // Use OpenAI TTS with specified voice
      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text,
        response_format: 'mp3',
        speed: 1.0
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('Error generating TTS with voice', voice, ':', error);
      return null;
    }
  }

  async generateAudioWithGTTS(text) {
    return new Promise((resolve, reject) => {
      const tts = new gtts('pt-BR');
      const outputPath = path.join(this.tempDir, `${uuidv4()}.mp3`);

      tts.save(outputPath, text, (err) => {
        if (err) {
          reject(err);
          return;
        }

        fs.readFile(outputPath)
          .then(buffer => {
            this.cleanupFile(outputPath);
            resolve(buffer);
          })
          .catch(reject);
      });
    });
  }

  async processWhatsAppAudio(audioMessage) {
    try {
      // Download audio from WhatsApp message
      const audioBuffer = await this.downloadWhatsAppMedia(audioMessage);
      
      if (!audioBuffer) {
        throw new Error('Could not download audio');
      }

      // Convert and transcribe
      const mp3Buffer = await this.convertOggToMp3(audioBuffer);
      const transcription = await this.transcribeAudio(mp3Buffer);

      return {
        transcription,
        audioBuffer: mp3Buffer
      };
    } catch (error) {
      console.error('Error processing WhatsApp audio:', error);
      return {
        transcription: '[Erro ao processar áudio]',
        audioBuffer: null
      };
    }
  }

  async downloadWhatsAppMedia(message) {
    try {
      const whatsappService = (await import('./whatsappService.js')).default;
      
      if (!whatsappService.sock) {
        throw new Error('WhatsApp not connected');
      }

      const buffer = await whatsappService.sock.downloadMediaMessage(message);
      return buffer;
    } catch (error) {
      console.error('Error downloading WhatsApp media:', error);
      return null;
    }
  }

  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore error
    }
  }

  async cleanupTempFiles() {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        // Delete files older than 1 hour
        if (now - stats.mtime.getTime() > 3600000) {
          await this.cleanupFile(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  // Clean up temp files periodically
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupTempFiles();
    }, 300000); // Every 5 minutes
  }
}

const audioService = new AudioService();
audioService.startPeriodicCleanup();

export default audioService;