import { useEffect, useRef } from 'react';
import { useStore } from '@/store';

const getWsUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8000/ws/telemetry';
  }
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (nextPublicApiUrl) {
    // If NEXT_PUBLIC_API_URL is configured, convert its scheme and use it
    const cleanApiUrl = nextPublicApiUrl.replace(/\/$/, ""); // strip trailing slash
    return cleanApiUrl.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://') + '/ws/telemetry';
  }
  return `${protocol}//${window.location.hostname}:8000/ws/telemetry`;
};

const WS_URL = getWsUrl();

export function useWebsocket() {
  const ws = useRef<WebSocket | null>(null);
  const user = useStore((state) => state.user);
  const addLog = useStore((state) => state.addLog);
  const updateMetricsFromBackend = useStore((state) => state.updateMetricsFromBackend);
  const handleIncidentCreated = useStore((state) => state.handleIncidentCreated);
  const handleRcaReady = useStore((state) => state.handleRcaReady);
  const handleIncidentResolved = useStore((state) => state.handleIncidentResolved);
  const setBackendState = useStore((state) => state.setBackendState);
  const fetchIncidents = useStore((state) => state.fetchIncidents);
  const fetchMemory = useStore((state) => state.fetchMemory);

  useEffect(() => {
    // Initial fetch from backend REST APIs
    fetchIncidents();
    fetchMemory();

    if (user && (user as any).accessToken) {
      ws.current = new WebSocket(`${WS_URL}?token=${(user as any).accessToken}`);
    } else {
      // Still connect, but backend will close if unauthorized.
      ws.current = new WebSocket(WS_URL);
    }
    ws.current.onopen = () => {
      console.log('Connected to RootRecall Telemetry Stream');
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'telemetry':
            updateMetricsFromBackend({
              latencyP99: data.data.latency,
              errorRate: data.data.errors,
              cpuUsage: data.data.cpu,
              memoryUsage: data.data.cpu * 0.8, // Approximation
              requestRate: 4000 - data.data.latency
            });
            if (data.data.service_metrics) {
              useStore.getState().updateServicesFromBackend(data.data.service_metrics);
            }
            break;
            
          case 'status_change':
            setBackendState(data.data.state);
            addLog({
              id: `log-${Date.now()}-${Math.random()}`,
              timestamp: new Date(data.timestamp),
              service: "system",
              level: "INFO",
              message: data.data.message
            });
            
            if (data.data.state === "ANOMALY") {
              addLog({
                id: `log-${Date.now()}-${Math.random()}`,
                timestamp: new Date(data.timestamp),
                service: "system",
                level: "WARN",
                message: "Anomaly detected in telemetry stream."
              });
            }
            break;

          case 'ai_thinking':
            addLog({
              id: `log-${Date.now()}-${Math.random()}`,
              timestamp: new Date(data.timestamp),
              service: "ai-copilot",
              level: "INFO",
              message: data.data.message
            });
            break;
            
          case 'incident_created':
            handleIncidentCreated(data.data);
            break;
            
          case 'rca_ready':
            handleRcaReady(data.data);
            break;
            
          case 'incident_resolved':
            handleIncidentResolved(data.data);
            break;
        }
      } catch (err) {
        console.error('Error parsing websocket message', err);
      }
    };

    ws.current.onclose = () => {
      console.log('Disconnected from Telemetry Stream');
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

}
