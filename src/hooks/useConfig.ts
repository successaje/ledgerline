"use client";
import { useEffect, useState } from "react";
import type { AppConfig } from "@/domain/types";
import { getConfig } from "@/services/api";

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getConfig().then(setConfig).catch(e => setError(e.message)); }, []);
  const ready = Boolean(config?.schemas.payEvent && config?.relayerReady);
  return { config, ready, error };
}
