"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";

interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  balance: string;
  laceDetected: boolean | null; // null = still checking
  connectedApi: ConnectedAPI | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  isConnected: false,
  isConnecting: false,
  address: null,
  balance: "0",
  laceDetected: null,
  connectedApi: null,
  connect: async () => {},
  disconnect: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState("0");
  const [laceDetected, setLaceDetected] = useState<boolean | null>(null);
  const [connectedApi, setConnectedApi] = useState<ConnectedAPI | null>(null);

  // Detect Lace extension after mount
  useEffect(() => {
    // Lace injects window.midnight asynchronously — poll with increasing delay
    let attempts = 0;
    const check = () => {
      if (typeof window === "undefined") return;
      const mn = window.midnight;
      if (mn) {
        const keys = Object.keys(mn);
        console.log("[VERDICT] window.midnight detected, keys:", keys);
        // Accept mnLace or any available wallet provider
        if (mn.mnLace || keys.length > 0) {
          setLaceDetected(true);
          return;
        }
      }
      attempts++;
      if (attempts < 20) {
        setTimeout(check, 500);
      } else {
        console.log("[VERDICT] Lace wallet not detected after 10s");
        setLaceDetected(false);
      }
    };
    check();
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.midnight) {
      setLaceDetected(false);
      return;
    }

    // Find the wallet provider — try mnLace first, then first available key
    const mn = window.midnight;
    const wallet = mn.mnLace ?? mn[Object.keys(mn)[0]];
    if (!wallet) {
      setLaceDetected(false);
      return;
    }

    setIsConnecting(true);
    try {
      console.log("[VERDICT] Connecting via wallet:", wallet.name, "apiVersion:", wallet.apiVersion);
      const api = await wallet.connect("preprod");
      setConnectedApi(api);

      // Fetch address
      const addresses = await api.getShieldedAddresses();
      const addr = addresses.shieldedAddress ?? null;
      setAddress(addr);

      // Fetch balance
      try {
        const balances = await api.getUnshieldedBalances();
        // balances is a record of token type -> bigint
        const total = Object.values(balances).reduce(
          (sum: bigint, v) => sum + BigInt(v),
          0n
        );
        setBalance(total.toString());
      } catch {
        setBalance("0");
      }

      // Verify connection
      const connStatus = await api.getConnectionStatus();
      if (connStatus.status === "connected") {
        setIsConnected(true);
      }
    } catch (err) {
      console.error("Lace wallet connection failed:", err);
      setIsConnected(false);
      setAddress(null);
      setConnectedApi(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setAddress(null);
    setBalance("0");
    setConnectedApi(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        isConnecting,
        address,
        balance,
        laceDetected,
        connectedApi,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
