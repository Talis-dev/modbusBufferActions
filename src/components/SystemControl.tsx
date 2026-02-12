"use client";

// ============================================
// COMPONENTE - CONTROLE DO SISTEMA
// ============================================

import { useState, useEffect } from "react";
import { PlayIcon, StopIcon } from "@heroicons/react/24/solid";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export default function SystemControl() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cleaningMode, setCleaningMode] = useState(false);
  const [cleaningLoading, setCleaningLoading] = useState(false);

  useEffect(() => {
    // Sincronizar estado ao carregar
    syncState();
    checkStatus();

    // Polling a cada 2 segundos para manter estado atualizado
    const interval = setInterval(() => {
      checkStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const syncState = async () => {
    try {
      await fetch("/api/modbus/sync-state", { method: "POST" });
    } catch (error) {
      console.error("Erro ao sincronizar estado:", error);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/modbus/status");
      const data = await response.json();

      // Sistema está rodando se o controlador existe (running=true)
      setRunning(data.running === true);
      setCleaningMode(data.state?.cleaningMode === true);
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      setRunning(false);
      setCleaningMode(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/modbus/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      const data = await response.json();
      if (data.success) {
        setRunning(true);
      } else {
        alert(`Erro ao iniciar: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro ao iniciar sistema: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/modbus/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });

      const data = await response.json();
      if (data.success) {
        setRunning(false);
        setCleaningMode(false);
      } else {
        alert(`Erro ao parar: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro ao parar sistema: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCleaningMode = async () => {
    setCleaningLoading(true);
    try {
      const response = await fetch("/api/modbus/cleaning-mode", {
        method: "POST",
      });

      const data = await response.json();
      if (data.success) {
        setCleaningMode(data.cleaningMode);
      } else {
        alert(`Erro ao alternar modo fachina: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setCleaningLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Controle do Sistema
      </h2>

      <div className="flex gap-4">
        <button
          onClick={handleStart}
          disabled={running || loading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            running
              ? "bg-gray-100 text-gray-400"
              : "bg-green-600 text-white hover:bg-green-700 active:scale-95",
          )}
        >
          <PlayIcon className="w-5 h-5" />
          {loading && !running ? "Iniciando..." : "Iniciar Sistema"}
        </button>

        <button
          onClick={handleStop}
          disabled={!running || loading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !running
              ? "bg-gray-100 text-gray-400"
              : "bg-red-600 text-white hover:bg-red-700 active:scale-95",
          )}
        >
          <StopIcon className="w-5 h-5" />
          {loading && running ? "Parando..." : "Parar Sistema"}
        </button>


        {/* Botão Modo Fachina */}
        <button
          onClick={handleToggleCleaningMode}
          disabled={!running || cleaningLoading}
          className={cn(
            "w-fit flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !running
              ? "bg-gray-100 text-gray-400"
              : cleaningMode
                ? "bg-orange-600 text-white hover:bg-orange-700 active:scale-95 animate-pulse-slow"
                : "bg-purple-600 text-white hover:bg-purple-700 active:scale-95",
          )}
        >
          <SparklesIcon className="w-5 h-5" />
          {cleaningLoading
            ? "Alternando..."
            : cleaningMode
              ? "🔧 Modo Fachina ATIVO"
              : "Ativar Modo Fachina"}
        </button>
      </div>

      {/* Status Indicator */}
      <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                running ? "bg-green-500 animate-pulse-fast" : "bg-gray-300",
              )}
            />
            <span
              className={cn(
                "text-sm font-semibold",
                running ? "text-green-600" : "text-gray-500",
              )}
            >
              {running ? "EM EXECUÇÃO" : "PARADO"}
            </span>
          </div>
        </div>
      </div>

      {/* Alerta Modo Fachina */}
      {cleaningMode && (
        <div className="mt-4 p-4 rounded-lg bg-orange-100 border-2 border-orange-500 animate-pulse-slow">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 animate-ping" />
              <span className="text-sm font-bold text-orange-900">
                ⚠️ MODO FACHINA ATIVO
              </span>
            </div>
            <div className="text-xs text-orange-800 space-y-1 ml-5">
              <p>✓ Módulos levantados</p>
              <p>✓ Roletes ativos</p>
              <p className="font-semibold">
                ⚠️ ATENÇÃO: Máquina em movimento rotativo!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
