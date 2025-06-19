"use client";

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { aeneid } from "@story-protocol/core-sdk";

import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { useTheme } from "next-themes"; 

const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [aeneid],
  ssr: true,
});

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  const { theme } = useTheme();
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
       <RainbowKitProvider
           coolMode
           showRecentTransactions={true}
           theme={theme === "dark" ? darkTheme() : lightTheme()}
         >
           {children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
