"use client";

import { Box, IconButton } from "@mui/material";
import { SwapVert } from "@mui/icons-material";

interface SwapArrowsProps {
  onSwap: () => void;
}

export default function SwapArrows({ onSwap }: SwapArrowsProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        my: 2,
      }}
    >
      <IconButton
        onClick={onSwap}
        sx={{
          backgroundColor: "#1f2937",
          border: "2px solid #374151",
          borderRadius: "12px",
          width: 48,
          height: 48,
          "&:hover": {
            backgroundColor: "#374151",
            transform: "rotate(180deg)",
          },
          transition: "all 0.3s ease",
        }}
      >
        <SwapVert sx={{ color: "text.primary", fontSize: 24 }} />
      </IconButton>
    </Box>
  );
}
