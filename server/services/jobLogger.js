const fs = require('fs');
const path = require('path');

const JOBS_DIR = path.join(__dirname, '..', 'jobs');

// Đảm bảo thư mục jobs tồn tại
if (!fs.existsSync(JOBS_DIR)) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

// Bộ nhớ đệm In-Memory cho trạng thái và kết quả Job (Tránh nghẽn Disk I/O khi polling)
const statusMemoryCache = new Map();
const resultMemoryCache = new Map();
const MAX_CACHE_ITEMS = 500;

function trimCache(map) {
  if (map.size > MAX_CACHE_ITEMS) {
    const firstKey = map.keys().next().value;
    map.delete(firstKey);
  }
}

class JobLogger {
  constructor(jobId) {
    this.jobId = jobId;
    this.jobDir = path.join(JOBS_DIR, jobId);
    if (!fs.existsSync(this.jobDir)) {
      fs.mkdirSync(this.jobDir, { recursive: true });
    }

    this.statusFile = path.join(this.jobDir, 'status.json');
    this.logFile = path.join(this.jobDir, 'log.txt');
    this.llmCallsFile = path.join(this.jobDir, 'llm_calls.json');
    this.apiCallsFile = path.join(this.jobDir, 'api_calls.json');
    this.resultFile = path.join(this.jobDir, 'result.json');

    // Khởi tạo các file rỗng nếu chưa có
    if (!fs.existsSync(this.llmCallsFile)) fs.writeFileSync(this.llmCallsFile, '[]');
    if (!fs.existsSync(this.apiCallsFile)) fs.writeFileSync(this.apiCallsFile, '[]');
    if (!fs.existsSync(this.logFile)) fs.writeFileSync(this.logFile, `[${new Date().toISOString()}] Job ${jobId} initialized\n`);
  }

  updateStatus(status, progress = 0, message = '') {
    const data = {
      jobId: this.jobId,
      status,
      progress,
      message,
      updatedAt: new Date().toISOString()
    };
    // Cập nhật In-Memory Cache trước
    statusMemoryCache.set(this.jobId, data);
    trimCache(statusMemoryCache);

    try {
      fs.writeFileSync(this.statusFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error(`[JOB ${this.jobId}] Lỗi ghi statusFile:`, e.message);
    }
    this.log(`[STATUS -> ${status}] (${progress}%) ${message}`);
  }

  log(text) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${text}\n`;
    fs.appendFileSync(this.logFile, entry, 'utf8');
    console.log(`[JOB ${this.jobId}] ${text}`);
  }

  logApiCall(apiName, payload, response, durationMs, success = true) {
    try {
      const calls = JSON.parse(fs.readFileSync(this.apiCallsFile, 'utf8') || '[]');
      calls.push({
        apiName,
        payload,
        response,
        durationMs,
        success,
        timestamp: new Date().toISOString()
      });
      fs.writeFileSync(this.apiCallsFile, JSON.stringify(calls, null, 2), 'utf8');
      this.log(`[API_CALL] ${apiName} (${durationMs}ms) - Success: ${success}`);
    } catch (err) {
      this.log(`[API_CALL_ERROR] Failed to write api call log: ${err.message}`);
    }
  }

  logLlmCall(prompt, response, tokens = null) {
    try {
      const calls = JSON.parse(fs.readFileSync(this.llmCallsFile, 'utf8') || '[]');
      calls.push({
        prompt,
        response,
        tokens,
        timestamp: new Date().toISOString()
      });
      fs.writeFileSync(this.llmCallsFile, JSON.stringify(calls, null, 2), 'utf8');
      this.log(`[LLM_CALL] Prompt recorded`);
    } catch (err) {
      this.log(`[LLM_CALL_ERROR] Failed to write llm log: ${err.message}`);
    }
  }

  setResult(resultData) {
    const finalResult = {
      jobId: this.jobId,
      ...resultData,
      completedAt: new Date().toISOString()
    };
    resultMemoryCache.set(this.jobId, finalResult);
    trimCache(resultMemoryCache);

    try {
      fs.writeFileSync(this.resultFile, JSON.stringify(finalResult, null, 2), 'utf8');
    } catch (e) {
      console.error(`[JOB ${this.jobId}] Lỗi ghi resultFile:`, e.message);
    }
    this.updateStatus('SUCCESS', 100, 'Video generated successfully');
    this.log(`[RESULT] Job completed successfully`);
  }

  setError(error) {
    const errorMsg = error instanceof Error ? error.stack || error.message : String(error);
    this.log(`[ERROR] ${errorMsg}`);
    this.updateStatus('FAILED', 0, error.message || 'Job failed with error');
  }

  getStatus() {
    // 1. Ưu tiên đọc từ In-Memory Cache (0ms, không tốn disk I/O)
    if (statusMemoryCache.has(this.jobId)) {
      return statusMemoryCache.get(this.jobId);
    }

    // 2. Fallback đọc từ đĩa nếu server vừa restart
    if (fs.existsSync(this.statusFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.statusFile, 'utf8'));
        statusMemoryCache.set(this.jobId, parsed);
        return parsed;
      } catch (e) {
        return { status: 'PENDING', progress: 0, message: 'Reading status' };
      }
    }
    return { status: 'PENDING', progress: 0 };
  }

  getResult() {
    // 1. Ưu tiên đọc từ In-Memory Cache
    if (resultMemoryCache.has(this.jobId)) {
      return resultMemoryCache.get(this.jobId);
    }

    // 2. Fallback đọc từ đĩa
    if (fs.existsSync(this.resultFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.resultFile, 'utf8'));
        resultMemoryCache.set(this.jobId, parsed);
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

module.exports = {
  JobLogger,
  JOBS_DIR
};
