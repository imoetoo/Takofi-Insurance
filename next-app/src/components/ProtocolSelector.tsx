"use client";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";

interface Protocol {
  title: string;
  provider: string;
  minRate: string;
  maxRate: string;
  capacity: string;
  capacityUSD: string;
  isNew: boolean;
  protocol: string;
}

interface ProtocolSelectorProps {
  selectedProtocol: Protocol;
  onProtocolChange: (protocol: Protocol) => void;
  protocols: Protocol[];
}

export default function ProtocolSelector({
  selectedProtocol,
  onProtocolChange,
  protocols,
}: ProtocolSelectorProps) {
  const getProtocolColor = (title: string) => {
    const colors: { [key: string]: string } = {
      SushiSwap: "#ff007a",
      "Curve Finance": "#40e0d0",
      Aave: "#b6509e",
      Compound: "#00d395",
      Uniswap: "#ff007a",
      MakerDAO: "#1aab9b",
      Yearn: "#006ae3",
    };
    return colors[title] || "#6366f1";
  };

  const getProtocolIcon = (title: string) => {
    const icons: { [key: string]: string } = {
      SushiSwap: "🍣",
      "Curve Finance": "📈",
      Aave: "🅰️",
      Compound: "🏛️",
      Uniswap: "🦄",
      MakerDAO: "🏭",
      Yearn: "💰",
    };
    return icons[title] || "🏦";
  };

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{ mb: 1.5, color: "text.secondary", fontWeight: 600 }}
      >
        Select Protocol
      </Typography>
      <Card
        sx={{
          backgroundColor: "#1f2937",
          border: "1px solid #4b5563",
          borderRadius: "12px",
          "&:hover": {
            borderColor: "#6b7280",
          },
        }}
      >
        <CardContent
          sx={{
            p: 2,
            "&:last-child": { pb: 2 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
            <Avatar
              sx={{
                bgcolor: getProtocolColor(selectedProtocol.title),
                width: 40,
                height: 40,
                fontSize: "1.2rem",
              }}
            >
              {getProtocolIcon(selectedProtocol.title)}
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "text.primary", mb: 0 }}
              >
                {selectedProtocol.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Capacity: {selectedProtocol.capacity} • Rate:{" "}
                {selectedProtocol.minRate}%-{selectedProtocol.maxRate}%
              </Typography>
            </Box>
          </Box>
          <FormControl sx={{ minWidth: 120 }}>
            <Select
              value={selectedProtocol.title}
              onChange={(e) => {
                const protocol = protocols.find(
                  (p) => p.title === e.target.value
                );
                if (protocol) onProtocolChange(protocol);
              }}
              sx={{
                "& .MuiSelect-select": {
                  py: 1,
                  fontSize: "0.875rem",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#4b5563",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#6b7280",
                },
              }}
            >
              {protocols.map((protocol) => (
                <MenuItem key={protocol.title} value={protocol.title}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: getProtocolColor(protocol.title),
                        width: 24,
                        height: 24,
                        fontSize: "0.8rem",
                      }}
                    >
                      {getProtocolIcon(protocol.title)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{protocol.title}</Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.7rem" }}
                      >
                        {protocol.minRate}%-{protocol.maxRate}%
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>
    </Box>
  );
}
