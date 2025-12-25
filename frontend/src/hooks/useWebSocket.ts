/**
 * Custom WebSocket Hook for real-time data.
 */
import { useState, useEffect, useRef } from "react";

export interface WebSocketMessage {
    ticker: string;
    price: number;
    timestamp: string;
}

export function useWebSocket(url: string) {
    const [data, setData] = useState<WebSocketMessage | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        let ws: WebSocket;
        let shouldReconnect = true;

        const connect = () => {
            if (!shouldReconnect) return;

            ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("WS Connected", url);
                if (shouldReconnect) setIsConnected(true);
            };

            ws.onmessage = (event) => {
                if (!shouldReconnect) return;
                try {
                    const parsed = JSON.parse(event.data);
                    setData(parsed);
                } catch (e) {
                    console.error("WS Parse Error", e);
                }
            };

            ws.onclose = () => {
                console.log("WS Disconnected", url);
                if (shouldReconnect) {
                    setIsConnected(false);
                    console.log("Reconnecting...", url);
                    setTimeout(connect, 3000);
                }
            };

            ws.onerror = (err) => {
                console.error("WS Error", err);
                ws.close();
            };
        };

        connect();

        return () => {
            shouldReconnect = false;
            // Remove listeners to prevent zombie callbacks
            if (ws) {
                ws.onclose = null; // Prevent trigger during manual close
                ws.close();
            }
        };
    }, [url]);

    return { data, isConnected };
}
