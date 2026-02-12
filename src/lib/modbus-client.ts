// ============================================
// CLIENTE MODBUS TCP
// ============================================

import { ModbusReadResponse, ModbusWriteCommand } from "@/types";
import { criticalAlerts } from "./critical-alerts";
import { systemLogger } from "./system-logger";

const net = require("net");
const Modbus = require("jsmodbus");

export class ModbusClient {
  private client: any;
  private socket: any;
  private host: string;
  private port: number;
  private timeout: number;
  private connected: boolean = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private shouldAutoReconnect: boolean = true; // Flag para controlar auto-reconexão

  constructor(host: string, port: number, timeout: number = 5000) {
    this.host = host;
    this.port = port;
    this.timeout = timeout;
  }

  /**
   * Conecta ao servidor Modbus TCP
   */
  async connect(): Promise<boolean> {
    // Reabilitar auto-reconexão ao conectar explicitamente
    this.shouldAutoReconnect = true;

    return new Promise((resolve, reject) => {
      try {
        this.socket = new net.Socket();
        this.client = new Modbus.client.TCP(this.socket);

        // Configura timeout alto para não derrubar conexão
        this.socket.setTimeout(30000); // 30 segundos

        // Ativa keepalive para manter conexão viva
        this.socket.setKeepAlive(true, 5000); // Envia keepalive a cada 5s
        this.socket.setNoDelay(true); // Desabilita Nagle para respostas rápidas

        this.socket.on("connect", () => {
          this.connected = true;
          systemLogger.success(
            "Modbus Client",
            `Conectado a ${this.host}:${this.port}`,
          );
          resolve(true);
        });

        this.socket.on("error", (err: Error) => {
          this.connected = false;
          systemLogger.error(
            "Modbus Client",
            `Erro de conexão: ${err.message}`,
          );
          criticalAlerts.addAlert(
            "client_error",
            "critical",
            `Erro ao conectar com Slave Pool (${this.host}:${this.port}): ${err.message}`,
            { host: this.host, port: this.port, error: err.message },
          );
          // Só reconecta se auto-reconexão estiver habilitada
          if (this.shouldAutoReconnect && !this.reconnectInterval) {
            this.startReconnect();
          }
        });

        this.socket.on("close", () => {
          this.connected = false;
          systemLogger.warning(
            "Modbus Client",
            `Conexão fechada com ${this.host}:${this.port}`,
          );
          // Só tenta reconectar se auto-reconexão estiver habilitada
          if (this.shouldAutoReconnect) {
            criticalAlerts.addAlert(
              "connection_lost",
              "warning",
              `Conexão perdida com Slave Pool (${this.host}:${this.port}). Tentando reconectar...`,
              { host: this.host, port: this.port },
            );
            // Inicia reconexão automática
            if (!this.reconnectInterval) {
              this.startReconnect();
            }
          }
        });

        this.socket.on("timeout", () => {
          systemLogger.warning(
            "Modbus Client",
            `Timeout na conexão com ${this.host}:${this.port}`,
          );
          // NÃO fecha a conexão - apenas avisa
          // this.socket.end();
        });

        this.socket.connect({ host: this.host, port: this.port });
      } catch (error) {
        this.connected = false;
        reject(error);
      }
    });
  }

  /**
   * Inicia reconexão automática
   */
  private startReconnect(): void {
    if (this.reconnectInterval) return;

    systemLogger.info(
      "Modbus Client",
      `Tentando reconectar a ${this.host}:${this.port}...`,
    );

    this.reconnectInterval = setInterval(async () => {
      if (!this.connected) {
        try {
          await this.connect();
          if (this.connected && this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
          }
        } catch (error) {
          // Continua tentando
        }
      } else {
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      }
    }, 5000); // Tenta reconectar a cada 5s
  }

  /**
   * Desconecta do servidor Modbus
   */
  disconnect(): void {
    // IMPORTANTE: Desabilitar auto-reconexão antes de fechar
    this.shouldAutoReconnect = false;

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.socket) {
      this.socket.end();
      this.socket.destroy();
    }

    this.connected = false;
    console.log(`[Modbus] Desconectado de ${this.host}:${this.port}`);
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Lê registradores (Holding Registers)
   */
  async readHoldingRegisters(
    startAddress: number,
    quantity: number,
  ): Promise<ModbusReadResponse> {
    if (!this.connected) {
      return {
        success: false,
        error: "Cliente Modbus não conectado",
        timestamp: Date.now(),
      };
    }

    try {
      const response = await this.client.readHoldingRegisters(
        startAddress,
        quantity,
      );

      if (response.response && response.response.body) {
        return {
          success: true,
          registers: response.response.body.valuesAsArray,
          timestamp: Date.now(),
        };
      }

      return {
        success: false,
        error: "Resposta inválida do servidor Modbus",
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error(`[Modbus] Erro ao ler registradores: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Lê coils (bobinas digitais)
   */
  async readCoils(
    startAddress: number,
    quantity: number,
  ): Promise<ModbusReadResponse> {
    if (!this.connected) {
      return {
        success: false,
        error: "Cliente Modbus não conectado",
        timestamp: Date.now(),
      };
    }

    try {
      const response = await this.client.readCoils(startAddress, quantity);

      if (response.response && response.response.body) {
        return {
          success: true,
          coils: response.response.body.valuesAsArray,
          timestamp: Date.now(),
        };
      }

      return {
        success: false,
        error: "Resposta inválida do servidor Modbus",
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error(`[Modbus] Erro ao ler coils: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Escreve um único registrador
   */
  async writeSingleRegister(address: number, value: number): Promise<boolean> {
    if (!this.connected) {
      console.error("[Modbus] Cliente não conectado para escrita");
      return false;
    }

    try {
      const response = await this.client.writeSingleRegister(address, value);
      return response.response && !response.response.isError;
    } catch (error: any) {
      console.error(
        `[Modbus] Erro ao escrever registrador ${address}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Escreve uma única coil
   */
  async writeSingleCoil(address: number, value: boolean): Promise<boolean> {
    if (!this.connected) {
      console.error("[Modbus] Cliente não conectado para escrita");
      return false;
    }

    try {
      const response = await this.client.writeSingleCoil(address, value);
      return response.response && !response.response.isError;
    } catch (error: any) {
      console.error(
        `[Modbus] Erro ao escrever coil ${address}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Escreve múltiplos registradores
   */
  async writeMultipleRegisters(
    startAddress: number,
    values: number[],
  ): Promise<boolean> {
    if (!this.connected) {
      console.error("[Modbus] Cliente não conectado para escrita");
      return false;
    }

    try {
      const response = await this.client.writeMultipleRegisters(
        startAddress,
        values,
      );
      return response.response && !response.response.isError;
    } catch (error: any) {
      console.error(
        `[Modbus] Erro ao escrever múltiplos registradores: ${error.message}`,
      );
      return false;
    }
  }
}

// Singleton para gerenciar as conexões Modbus
class ModbusManager {
  private slaveClient: ModbusClient | null = null;
  private clpClient: ModbusClient | null = null;

  getSlaveClient(host: string, port: number, timeout: number): ModbusClient {
    if (!this.slaveClient) {
      this.slaveClient = new ModbusClient(host, port, timeout);
    }
    return this.slaveClient;
  }

  getCLPClient(host: string, port: number, timeout: number): ModbusClient {
    if (!this.clpClient) {
      this.clpClient = new ModbusClient(host, port, timeout);
    }
    return this.clpClient;
  }

  disconnectAll(): void {
    if (this.slaveClient) {
      this.slaveClient.disconnect();
      this.slaveClient = null;
    }
    if (this.clpClient) {
      this.clpClient.disconnect();
      this.clpClient = null;
    }
  }
}

export const modbusManager = new ModbusManager();
