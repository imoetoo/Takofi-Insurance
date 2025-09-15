"use client";

import { Box, TextField, Typography, InputAdornment } from "@mui/material";
import * as commonStyles from "@/styles/commonStyles";

interface AmountInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rightAdornment?: React.ReactNode;
  helperText?: string;
  disabled?: boolean;
}

export default function AmountInput({
  label,
  value,
  onChange,
  placeholder = "0",
  rightAdornment,
  helperText,
  disabled = false,
}: AmountInputProps) {
  return (
    <Box>
      {label && (
        <Typography
          variant="body2"
          sx={{ mb: 1.5, color: "text.secondary", fontWeight: 600 }}
        >
          {label}
        </Typography>
      )}
      <TextField
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        slotProps={{
          input: {
            sx: {
              ...commonStyles.inputFieldStyles,
              fontSize: "2rem",
              fontWeight: "bold",
              color: "text.primary",
              "& input": {
                textAlign: "right",
              },
            },
            endAdornment: rightAdornment && (
              <InputAdornment position="end">{rightAdornment}</InputAdornment>
            ),
          },
        }}
      />
      {helperText && (
        <Typography
          variant="caption"
          sx={{ mt: 1, color: "text.secondary", display: "block" }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
