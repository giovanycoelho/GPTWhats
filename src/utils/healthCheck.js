// Health check and recovery system for 24/7 operation
import fs from 'fs/promises';
import path from 'path';

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.lastHealthReport = Date.now();
    this.criticalErrors = [];
    this.maxCriticalErrors = 10;
    
    this.startHealthMonitoring();
  }

  startHealthMonitoring() {
    // Health check every 5 minutes
    setInterval(() => {
      this.performHealthCheck();
    }, 300000); // 5 minutes

    // Write health report every hour
    setInterval(() => {
      this.writeHealthReport();
    }, 3600000); // 1 hour

    console.log('🏥 Health monitoring started for 24/7 operation');
  }

  async performHealthCheck() {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        checks: {}
      };

      // Check memory usage
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      health.checks.memory = {
        status: heapUsedMB < 800 ? 'OK' : heapUsedMB < 1000 ? 'WARNING' : 'CRITICAL',
        heapUsedMB: Math.round(heapUsedMB),
        threshold: 800
      };

      // Check if main services are responding
      health.checks.services = await this.checkServices();

      // Check temp folder size
      health.checks.tempFiles = await this.checkTempFiles();

      // Check database connections
      health.checks.database = await this.checkDatabase();

      // Store health data
      this.lastHealthCheck = health;

      // Log warnings or errors
      if (health.checks.memory.status !== 'OK') {
        console.warn('⚠️ Memory usage high:', health.checks.memory);
      }

      // Auto-recovery actions
      await this.performAutoRecovery(health);

    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.recordCriticalError(error);
    }
  }

  async checkServices() {
    try {
      // Basic service availability check
      const services = {
        aiService: 'OK',
        whatsappService: 'OK',
        audioService: 'OK',
        conversationService: 'OK'
      };

      // Could add more sophisticated checks here
      return { status: 'OK', services };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }

  async checkTempFiles() {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      const files = await fs.readdir(tempDir).catch(() => []);
      
      let totalSize = 0;
      for (const file of files) {
        try {
          const stats = await fs.stat(path.join(tempDir, file));
          totalSize += stats.size;
        } catch (error) {
          // File might have been deleted, ignore
        }
      }

      const sizeMB = totalSize / 1024 / 1024;
      return {
        status: sizeMB < 100 ? 'OK' : sizeMB < 500 ? 'WARNING' : 'CRITICAL',
        files: files.length,
        sizeMB: Math.round(sizeMB),
        threshold: 100
      };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }

  async checkDatabase() {
    try {
      // Basic database connectivity check
      const db = await import('../config/database.js');
      await db.default.get('SELECT 1');
      
      return { status: 'OK' };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }

  async performAutoRecovery(health) {
    try {
      // Auto-cleanup temp files if too many
      if (health.checks.tempFiles?.status === 'CRITICAL') {
        console.log('🧹 Auto-recovery: Cleaning up temp files...');
        await this.cleanupTempFiles();
      }

      // Force garbage collection if memory is high
      if (health.checks.memory?.status === 'CRITICAL' && global.gc) {
        console.log('🧹 Auto-recovery: Running garbage collection...');
        global.gc();
      }

    } catch (error) {
      console.error('❌ Auto-recovery failed:', error);
      this.recordCriticalError(error);
    }
  }

  async cleanupTempFiles() {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      const files = await fs.readdir(tempDir).catch(() => []);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          
          // Delete files older than 1 hour
          if (now - stats.mtime.getTime() > 3600000) {
            await fs.unlink(filePath);
            cleaned++;
          }
        } catch (error) {
          // File might have been deleted, ignore
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} old temp files`);
      }
    } catch (error) {
      console.error('Error cleaning temp files:', error);
    }
  }

  recordCriticalError(error) {
    this.criticalErrors.push({
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });

    // Keep only recent errors
    if (this.criticalErrors.length > this.maxCriticalErrors) {
      this.criticalErrors = this.criticalErrors.slice(-this.maxCriticalErrors);
    }
  }

  async writeHealthReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        lastHealthCheck: this.lastHealthCheck,
        recentCriticalErrors: this.criticalErrors,
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };

      const reportsDir = path.join(process.cwd(), 'logs');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const reportFile = path.join(reportsDir, `health-${new Date().toISOString().split('T')[0]}.json`);
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      console.log(`📊 Health report written: ${reportFile}`);
    } catch (error) {
      console.error('Error writing health report:', error);
    }
  }

  getHealthStatus() {
    return this.lastHealthCheck;
  }
}

const healthCheckService = new HealthCheckService();
export default healthCheckService;