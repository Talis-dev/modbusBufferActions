"use client";

// ============================================
// PÁGINA DE VISUALIZAÇÃO DE LOGS DO SISTEMA
// ============================================

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SystemLog } from "@/lib/system-logger";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  CalendarIcon,
  FunnelIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  BugAntIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(""); // Vazio = será definido após buscar datas
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false); // Desabilitado por padrão

  // Busca logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);

      let url = "/api/logs?source=";

      if (selectedDate === "memory") {
        url += "memory";
      } else {
        url += `file&date=${selectedDate}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("❌ Erro ao buscar logs:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Busca datas disponíveis e define data de hoje como padrão
  const fetchAvailableDates = useCallback(async () => {
    try {
      const response = await fetch("/api/logs?source=file");
      const data = await response.json();

      if (data.success && data.dates) {
        setAvailableDates(data.dates);

        // Define a data de hoje como padrão se ainda não foi definida
        if (!selectedDate && data.dates.length > 0) {
          const today = data.dates[0]; // Primeira data é sempre a mais recente

          setSelectedDate(today);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar datas:", error);
    }
  }, [selectedDate]);

  // Limpa logs em memória
  const clearLogs = async () => {
    if (!confirm("Deseja limpar todos os logs em memória?")) return;

    try {
      const response = await fetch("/api/logs", { method: "DELETE" });
      const data = await response.json();

      if (data.success) {
        setLogs([]);
        alert("Logs limpos com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao limpar logs:", error);
      alert("Erro ao limpar logs");
    }
  };

  // Exporta logs
  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs-${selectedDate}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtra logs
  useEffect(() => {
    let filtered = logs;

    // Filtro por nível
    if (selectedLevel !== "all") {
      filtered = filtered.filter((log) => log.level === selectedLevel);
    }

    // Filtro por categoria
    if (selectedCategory !== "all") {
      filtered = filtered.filter((log) => log.category === selectedCategory);
    }

    // Filtro por busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(search) ||
          log.category.toLowerCase().includes(search) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(search)),
      );
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, selectedLevel, selectedCategory]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs();
      }, 3000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [autoRefresh, fetchLogs]);

  // Busca datas disponíveis apenas uma vez (ao montar componente)
  useEffect(() => {
    fetchAvailableDates();
  }, [fetchAvailableDates]);

  // Busca inicial e quando mudar a data (só executa se selectedDate estiver definido)
  useEffect(() => {
    if (selectedDate) {
      fetchLogs();
    }
  }, [selectedDate, fetchLogs]);

  // Categorias únicas
  const categories = Array.from(
    new Set(logs.map((log) => log.category)),
  ).sort();

  // Ícone por nível
  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <ExclamationCircleIcon className="w-4 h-4 text-red-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      case "success":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "debug":
        return <BugAntIcon className="w-4 h-4 text-purple-500" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  // Cor por nível
  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "bg-red-50 border-red-200 text-red-900";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-900";
      case "success":
        return "bg-green-50 border-green-200 text-green-900";
      case "debug":
        return "bg-purple-50 border-purple-200 text-purple-900";
      default:
        return "bg-blue-50 border-blue-200 text-blue-900";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/config"
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                Voltar
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Logs do Sistema
                </h1>
                <p className="text-gray-600 mt-1">
                  Visualize e filtre todos os eventos do sistema
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchLogs}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Atualizar
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                  autoRefresh
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                <ArrowPathIcon
                  className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`}
                />
                Auto-Refresh
              </button>
              <button
                onClick={exportLogs}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Exportar
              </button>
              {selectedDate === "memory" && (
                <button
                  onClick={clearLogs}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {/* Busca */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Nível */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Todos os níveis</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="debug">Debug</option>
              </select>
            </div>

            {/* Filtro Categoria */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Todas as categorias</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Data */}
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="memory">Memória (Real-time)</option>
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString("pt-BR")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-4 text-sm text-gray-600">
            <span>
              Total: <strong>{logs.length}</strong> logs
            </span>
            <span>
              Filtrados: <strong>{filteredLogs.length}</strong> logs
            </span>
            <span>
              Fonte:{" "}
              <strong>
                {selectedDate === "memory" ? "Memória" : "Arquivo"}
              </strong>
            </span>
          </div>
        </div>

        {/* Logs List */}
        <div className="space-y-2">
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...filteredLogs].reverse().map((log) => (
                <div
                  key={log.id}
                  className={`rounded-lg border-2 p-4 transition hover:shadow-md ${getLevelColor(log.level)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getLevelIcon(log.level)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-xs px-2 py-1 bg-white rounded">
                          {log.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString("pt-BR")}
                        </span>
                        <span className="text-xs font-mono px-2 py-1 bg-white rounded opacity-75">
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-2">{log.message}</p>
                      {log.data && (
                        <details className="text-xs">
                          <summary className="cursor-pointer hover:underline mb-1">
                            Dados adicionais
                          </summary>
                          <pre className="bg-white p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
