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
    const cleanApiUrl = nextPublicApiUrl.replace(/\/$/, ""); // strip trailing slash
    return cleanApiUrl.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://') + '/ws/telemetry';
  }
  return `${protocol}//${window.location.hostname}:8000/ws/telemetry`;
};

const WS_URL = getWsUrl();

export function useWebsocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef<number>(2000); // Start reconnect delay at 2s

  const user = useStore((state) => state.user);
  const token = user?.accessToken;

  const addLog = useStore((state) => state.addLog);
  const updateMetricsFromBackend = useStore((state) => state.updateMetricsFromBackend);
  const handleIncidentCreated = useStore((state) => state.handleIncidentCreated);
  const handleRcaReady = useStore((state) => state.handleRcaReady);
  const handleIncidentResolved = useStore((state) => state.handleIncidentResolved);
  const setBackendState = useStore((state) => state.setBackendState);
  const fetchIncidents = useStore((state) => state.fetchIncidents);
  const fetchMemory = useStore((state) => state.fetchMemory);

  useEffect(() => {
    // Initial REST sync
    fetchIncidents();
    fetchMemory();

    let isExplicitlyClosed = false;

    function connect() {
      // Clear existing reconnect timeout if scheduling new connect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close previous socket if open
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }

      if (!token) {
        console.log("No auth token available, delaying telemetry stream connection.");
        return;
      }

      const socketUrl = `${WS_URL}?token=${token}`;
      console.log(`Connecting to RootRecall Telemetry Stream: ${WS_URL}`);
      const socket = new WebSocket(socketUrl);
      ws.current = socket;

      socket.onopen = () => {
        console.log('Successfully connected to RootRecall Telemetry Stream');
        reconnectDelayRef.current = 2000; // Reset exponential delay back to baseline
      };

      socket.onmessage = (event) => {
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

      socket.onclose = (event) => {
        console.log(`Disconnected from Telemetry Stream. Code: ${event.code}. Reason: ${event.reason}`);
        if (!isExplicitlyClosed) {
          scheduleReconnect();
        }
      };

      socket.onerror = (err) => {
        console.error('WebSocket encountered an error:', err);
        socket.close();
      };
    }

    function scheduleReconnect() {
      if (reconnectTimeoutRef.current) return;

      console.log(`Scheduling reconnect in ${reconnectDelayRef.current}ms`);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, reconnectDelayRef.current);

      // Exponential backoff capped at 16s
      reconnectDelayRef.current = Math.min(16000, reconnectDelayRef.current * 2);
    }

    // Connect immediately if token available
    connect();

    return () => {
      isExplicitlyClosed = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [token]);

}
