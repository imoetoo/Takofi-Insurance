"use client";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  Stack,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useState } from "react";
import InsuranceListingCard from "@/components/InsuranceListingCard";
import { RoundedTabs, Tab } from "@/components/RoundedTabs";
import * as commonStyles from "@/styles/commonStyles";
import { insuranceListings } from "./insuranceListings";

// Available categories based on protocols
const categories = ["All categories", "Exchange", "DeFi", "Lending"];

export default function InsuranceMarket() {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Filter listings based on search term and category
  const filteredListings = insuranceListings.filter((listing) => {
    const matchesSearch =
      listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.provider.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "All categories" ||
      listing.protocol.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <Box sx={commonStyles.pageContainerStyles}>
      <Container maxWidth="lg">
        {/* Tab Navigation */}
        <RoundedTabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Trade Tokenized Insurance" />
          <Tab label="My Tokenized Insurance" />
        </RoundedTabs>

        {/* Main Content Card */}
        <Card sx={commonStyles.cardStyles}>
          <CardContent sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={commonStyles.headerSectionStyles}>
              <Typography
                variant="h4"
                component="h1" /* for SEO */
                sx={{
                  fontWeight: "bold",
                  color: "text.primary",
                }}
              >
                Browse Tokens
              </Typography>
            </Box>

            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="Search for an insurance token listing"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  sx: commonStyles.inputFieldStyles,
                },
              }}
            />

            {/* Filters and Results Count */}
            <Box sx={commonStyles.filtersContainerStyles}>
              <Stack direction="row" spacing={2}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    sx={commonStyles.selectStyles}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Box sx={{ color: "text.secondary" }}>
                <Typography
                  component="span"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  {filteredListings.length}{" "}
                  {filteredListings.length === 1 ? "Listing" : "Listings"}
                </Typography>
                <Typography component="span" sx={{ ml: 2 }}>
                  Annual Fee / TVL
                </Typography>
              </Box>
            </Box>

            {/* Listings */}
            <Stack spacing={2}>
              {filteredListings.length > 0 ? (
                filteredListings.map((listing, index) => (
                  <InsuranceListingCard
                    key={index}
                    title={listing.title}
                    provider={listing.provider}
                    minRate={listing.minRate}
                    maxRate={listing.maxRate}
                    capacity={listing.capacity}
                    capacityUSD={listing.capacityUSD}
                    isNew={listing.isNew}
                    protocol={listing.protocol}
                  />
                ))
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No insurance listings found for &quot;{searchTerm}&quot;
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Try searching with different keywords or clear your search.
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
