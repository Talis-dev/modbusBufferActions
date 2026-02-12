// ============================================
// SISTEMA DE LOGGING CENTRALIZADO
// ============================================

export type LogLevel = "info" | "warning" | "error" | "success" | "debug";

export interface SystemLog {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class SystemLogger {
  private logs: SystemLog[] = [];
  private maxLogs: number = 100;
  private listeners: Set<(logs: SystemLog[]) => void> = new Set();
  private productionMode: boolean = process.env.NODE_ENV === "production";

  /**
   * Adiciona um log ao sistema
   */
  log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    skipConsole: boolean = false,
  ) {
    const logEntry: SystemLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
    };

    // Adiciona ao array mantendo apenas os últimos N logs
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console log (se não for produção ou se for erro crítico)
    if (!skipConsole && (!this.productionMode || level === "error")) {
      const emoji = {
        info: "ℹ️",
        warning: "⚠️",
        error: "❌",
        success: "✅",
        debug: "🔍",
      }[level];

      console.log(`[${category}] ${emoji} ${message}`, data || "");
    }

    // Notifica listeners
    this.notifyListeners();
  }

  /**
   * Log de informação
   */
  info(category: string, message: string, data?: any, skipConsole = false) {
    this.log("info", category, message, data, skipConsole);
  }

  /**
   * Log de sucesso
   */
  success(category: string, message: string, data?: any, skipConsole = false) {
    this.log("success", category, message, data, skipConsole);
  }

  /**
   * Log de aviso
   */
  warning(category: string, message: string, data?: any, skipConsole = false) {
    this.log("warning", category, message, data, skipConsole);
  }

  /**
   * Log de erro
   */
  error(category: string, message: string, data?: any) {
    this.log("error", category, message, data, false); // Sempre mostra erros no console
  }

  /**
   * Log de debug (só em desenvolvimento)
   */
  debug(category: string, message: string, data?: any) {
    if (!this.productionMode) {
      this.log("debug", category, message, data, false);
    }
  }

  /**
   * Retorna todos os logs
   */
  getLogs(): SystemLog[] {
    return [...this.logs];
  }

  /**
   * Retorna os últimos N logs
   */
  getRecentLogs(count: number = 100): SystemLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Limpa todos os logs
   */
  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  /**
   * Adiciona um listener para mudanças nos logs
   */
  subscribe(callback: (logs: SystemLog[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifica todos os listeners
   */
  private notifyListeners() {
    this.listeners.forEach((callback) => callback([...this.logs]));
  }

  /**
   * Define o modo de produção
   */
  setProductionMode(enabled: boolean) {
    this.productionMode = enabled;
  }

  /**
   * Verifica se está em modo produção
   */
  isProductionMode(): boolean {
    return this.productionMode;
  }
}

// Singleton
export const systemLogger = new SystemLogger();
