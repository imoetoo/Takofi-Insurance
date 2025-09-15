"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { darkTheme as rainbowDarkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import config from "@/rainbowKitConfig";
import darkTheme from "@/theme/darkTheme";
import "@rainbow-me/rainbowkit/styles.css";

export function Providers(props: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={rainbowDarkTheme({
              borderRadius: "medium",
              accentColor: "#3b82f6",
            })}
          >
            {props.children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
