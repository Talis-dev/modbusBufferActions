"use client";

import { useState, useEffect, useRef } from "react";

interface SystemLog {
  id: string;
  timestamp: number;
  level: "info" | "warning" | "error" | "success" | "debug";
  category: string;
  message: string;
  data?: any;
}

interface ConnectionInfo {
  id: string;
  ip: string;
  port: number;
  connectedAt: number;
  lastActivity: number;
}

export default function TestCLPPage() {
  const [serverRunning, setServerRunning] = useState(false);
  const [port, setPort] = useState(502);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedCoil, setSelectedCoil] = useState(1);
  const [duration, setDuration] = useState(1000);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [serverInfo, setServerInfo] = useState({ ip: "0.0.0.0", port: 502 });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logsPaused, setLogsPaused] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus();
      fetchConnections();
      if (!logsPaused) {
        fetchLogs();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [logsPaused]);

  useEffect(() => {
    if (!logsPaused && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, logsPaused]);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/modbus/test-clp");
      const data = await response.json();
      setServerRunning(data.running);
      setHistory(data.history || []);
    } catch (error) {
      console.error("Erro ao buscar status:", error);
    }
  };

  const fetchConnections = async () => {
    try {
      const response = await fetch("/api/system/connections");
      const data = await response.json();
      setConnections(data.connections || []);
      if (data.server) {
        setServerInfo(data.server);
      }
    } catch (error) {
      console.error("Erro ao buscar conexões:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/system/logs?count=100");
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    }
  };

  const startServer = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", port }),
      });
      const data = await response.json();
      if (data.success) {
        setServerRunning(true);
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const stopServer = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      const data = await response.json();
      if (data.success) {
        setServerRunning(false);
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendPulse = async () => {
    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pulse",
          coilAddress: selectedCoil,
          value: duration,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const setCoil = async (address: number, value: boolean) => {
    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", coilAddress: address, value }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch("/api/system/logs", { method: "DELETE" });
      setLogs([]);
    } catch (error) {
      console.error("Erro ao limpar logs:", error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("pt-BR");
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      case "success":
        return "text-green-400";
      case "info":
        return "text-blue-400";
      case "debug":
        return "text-gray-400";
      default:
        return "text-gray-300";
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "success":
        return "✅";
      case "info":
        return "ℹ️";
      case "debug":
        return "🔍";
      default:
        return "•";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Teste de Diagnóstico CLP</h1>

        {/* Informações do Servidor e Conexões */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Servidor</h3>
            <p className="text-sm text-gray-600">
              IP: <span className="font-mono">{serverInfo.ip}</span>
            </p>
            <p className="text-sm text-gray-600">
              Porta: <span className="font-mono">{serverInfo.port}</span>
            </p>
            <p className="text-sm text-gray-600">
              Conexões:{" "}
              <span className="font-semibold">{connections.length}</span>
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Conexões Ativas</h3>
            {connections.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma conexão</p>
            ) : (
              <div className="space-y-1">
                {connections.map((conn) => (
                  <div key={conn.id} className="text-sm">
                    <span className="font-mono text-blue-600">
                      {conn.ip}:{conn.port}
                    </span>
                    <span className="text-gray-500 ml-2">
                      há {formatDuration(Date.now() - conn.connectedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Controles do Servidor */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Controle do Servidor</h2>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Porta</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value))}
                disabled={serverRunning}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {!serverRunning ? (
              <button
                onClick={startServer}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                ▶️ Iniciar Servidor
              </button>
            ) : (
              <button
                onClick={stopServer}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
              >
                ⏹️ Parar Servidor
              </button>
            )}

            <div
              className={`flex items-center px-4 py-2 rounded-lg ${
                serverRunning
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  serverRunning ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              {serverRunning ? "Online" : "Offline"}
            </div>
          </div>
        </div>

        {/* Teste de Pulsos */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Enviar Pulso</h2>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Coil (0-11)
              </label>
              <input
                type="number"
                min="0"
                max="11"
                value={selectedCoil}
                onChange={(e) => setSelectedCoil(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Duração (ms)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={sendPulse}
                disabled={!serverRunning}
                className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                📤 Enviar Pulso
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">Acesso Rápido</h3>
            <div className="grid grid-cols-6 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((coil) => (
                <button
                  key={coil}
                  onClick={() => {
                    setSelectedCoil(coil);
                    sendPulse();
                  }}
                  disabled={!serverRunning}
                  className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 text-sm"
                >
                  C{coil}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Histórico */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">
            Histórico (últimos 50 eventos)
          </h2>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-gray-500">Nenhum evento ainda</p>
            ) : (
              history.map((item, index) => (
                <div
                  key={index}
                  className="text-sm border-l-4 border-blue-500 pl-3 py-1"
                >
                  <span className="text-gray-500">
                    {formatTime(item.timestamp)}
                  </span>
                  <span className="mx-2">•</span>
                  <span className="font-medium">{item.action}</span>
                  {item.message && (
                    <>
                      <span className="mx-2">-</span>
                      <span className="text-gray-700">{item.message}</span>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logs do Sistema em Tempo Real */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              📝 Logs do Sistema (Últimos 100) - Realtime
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setLogsPaused(!logsPaused)}
                className={`px-4 py-2 rounded-lg text-white ${
                  logsPaused
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                {logsPaused ? "▶️ Retomar" : "⏸️ Pausar"}
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                🗑️ Limpar
              </button>
            </div>
          </div>

          {logsPaused && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm">
              ⏸️ Logs pausados para análise técnica. Clique em "Retomar" para
              continuar.
            </div>
          )}

          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">Nenhum log ainda...</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3 text-gray-100">
                    <span className="text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        fractionalSecondDigits: 3,
                      })}
                    </span>
                    <span>{getLogIcon(log.level)}</span>
                    <span className="text-cyan-400">[{log.category}]</span>
                    <span className={getLogColor(log.level)}>
                      {log.message}
                    </span>
                    {log.data && (
                      <span className="text-gray-400">
                        {JSON.stringify(log.data)}
                      </span>
                    )}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
