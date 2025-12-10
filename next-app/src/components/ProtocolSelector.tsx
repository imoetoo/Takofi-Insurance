"use client";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import Image from "next/image";

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
  const getProtocolLogo = (title: string): string => {
    const logoMap: { [key: string]: string } = {
      SushiSwap: "/protocols/sushiswap.png",
      "Curve Finance": "/protocols/Curve.png",
      Aave: "/protocols/aave.png",
      "Uniswap V3": "/protocols/uniswap.png",
      Uniswap: "/protocols/uniswap.png",
      Compound: "/protocols/compound.png",
      PancakeSwap: "/protocols/pancakeswap.png",
      Yearn: "/protocols/sushiswap.png",
    };
    return logoMap[title] || "/protocols/sushiswap.png";
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
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.paper",
                border: "2px solid",
                borderColor: "divider",
              }}
            >
              <Image
                src={getProtocolLogo(selectedProtocol.title)}
                alt={`${selectedProtocol.title} logo`}
                width={32}
                height={32}
                style={{ objectFit: "contain" }}
              />
            </Box>
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
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Image
                        src={getProtocolLogo(protocol.title)}
                        alt={`${protocol.title} logo`}
                        width={20}
                        height={20}
                        style={{ objectFit: "contain" }}
                      />
                    </Box>
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
