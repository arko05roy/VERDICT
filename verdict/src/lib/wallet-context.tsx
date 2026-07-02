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

    // Find the Midnight wallet provider among all injected wallets
    const mn = window.midnight;
    const providers = Object.values(mn);
    if (providers.length === 0) {
      setLaceDetected(false);
      return;
    }

    setIsConnecting(true);
    try {
      // Try each provider until one accepts "preprod" (skip Cardano wallets that reject it)
      let api: ConnectedAPI | null = null;
      for (const provider of providers) {
        try {
          console.log("[VERDICT] Trying provider:", provider.name, "rdns:", provider.rdns);
          api = await provider.connect("preprod");
          console.log("[VERDICT] Connected via:", provider.name, "rdns:", provider.rdns);
          break;
        } catch {
          console.warn(`[VERDICT] Provider "${provider.name}" rejected preprod, skipping`);
        }
      }
      if (!api) {
        throw new Error("No wallet provider accepted preprod network. Check Lace Midnight Preview is installed.");
      }
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
      console.log("[VERDICT] Connection status:", connStatus);
      if (connStatus.status === "connected") {
        console.log("[VERDICT] Connected to network:", connStatus.networkId);
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
