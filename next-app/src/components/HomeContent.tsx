"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
} from "@mui/material";
import { TrendingUp, Shield, Lock } from "@mui/icons-material";

// Import styles
import * as homeContentStyles from "@/styles/homeContentStyles";
import * as commonStyles from "@/styles/commonStyles";

export default function HomeContent() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(139,92,246,0.2),transparent_50%)]" />
        </div>

        <Container maxWidth="lg" sx={homeContentStyles.heroContainerStyles}>
          {/* Main Heading */}
          <Typography variant="h1" sx={homeContentStyles.heroTitleStyles}>
            Your All-Reliable
            <br />
            DeFi Insurance Protocol
          </Typography>

          {/* Subtitle */}
          <Typography variant="h5" sx={homeContentStyles.heroSubtitleStyles}>
            Protect your DeFi investments with cutting-edge insurance tokens.
            Mint, trade, and earn yields while safeguarding your digital assets
            against smart contract risks.
          </Typography>

          {/* Connection Status */}
          {!isConnected ? (
            <Box sx={homeContentStyles.connectionStatusBoxStyles}>
              <Typography
                sx={homeContentStyles.connectionStatusTextStyles.disconnected}
              >
                Please connect your wallet to get started
              </Typography>
            </Box>
          ) : (
            <Box sx={homeContentStyles.connectionStatusBoxStyles}>
              <Typography
                sx={homeContentStyles.connectionStatusTextStyles.connected}
              >
                Wallet Connected - Ready to mint tokens!
              </Typography>
            </Box>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            {isConnected ? (
              <Link href="/mint-tokens">
                <Button
                  variant="contained"
                  size="large"
                  sx={homeContentStyles.primaryGradientButtonStyles}
                >
                  Start Minting Now
                </Button>
              </Link>
            ) : (
              <div className="flex justify-center">
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <Button
                      onClick={openConnectModal}
                      variant="contained"
                      size="large"
                      sx={homeContentStyles.primaryGradientButtonStyles}
                    >
                      Connect Wallet to Start
                    </Button>
                  )}
                </ConnectButton.Custom>
              </div>
            )}
            <Link href="/insurance-market">
              <Button
                variant="outlined"
                size="large"
                sx={homeContentStyles.outlinedButtonStyles}
              >
                Explore Markets
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center py-4">
              <Typography
                variant="h3"
                sx={homeContentStyles.statsValueStyles.blue}
              >
                $0M+
              </Typography>
              <Typography sx={homeContentStyles.statsLabelStyles}>
                Total Value Locked
              </Typography>
            </div>
            <div className="text-center py-4">
              <Typography
                variant="h3"
                sx={homeContentStyles.statsValueStyles.purple}
              >
                4+
              </Typography>
              <Typography sx={homeContentStyles.statsLabelStyles}>
                Protocols Protected
              </Typography>
            </div>
            <div className="text-center py-4">
              <Typography
                variant="h3"
                sx={homeContentStyles.statsValueStyles.green}
              >
                0+
              </Typography>
              <Typography sx={homeContentStyles.statsLabelStyles}>
                Active Users
              </Typography>
            </div>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-900">
        <Container maxWidth="lg" sx={homeContentStyles.sectionContainerStyles}>
          <div className="text-center mb-16">
            <Typography
              variant="h2"
              sx={{
                ...homeContentStyles.sectionTitleStyles,
                ...commonStyles.commonSpacing.mediumMargin,
              }}
            >
              Why Choose TakoFi?
            </Typography>
            <Typography
              variant="h6"
              sx={homeContentStyles.sectionSubtitleStyles}
            >
              Built for the future of decentralized finance with security and
              innovation at its core
            </Typography>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Smart Contract Protection */}
            <Card
              sx={{
                ...homeContentStyles.featureCardStyles,
                ...homeContentStyles.featureCardHoverStyles.blue,
              }}
            >
              <CardContent sx={homeContentStyles.cardContentStyles}>
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield sx={{ color: "white" }} fontSize="large" />
                </div>
                <Typography
                  variant="h5"
                  sx={{
                    ...homeContentStyles.cardTitleStyles,
                    ...commonStyles.commonSpacing.smallMargin,
                  }}
                >
                  Smart Contract Protection
                </Typography>
                <Typography
                  sx={{
                    ...homeContentStyles.cardDescriptionStyles,
                    ...commonStyles.commonSpacing.mediumMargin,
                  }}
                >
                  Safeguard your DeFi investments against smart contract
                  vulnerabilities and protocol risks.
                </Typography>
                <Link href="/insurance-market">
                  <Button
                    variant="outlined"
                    sx={homeContentStyles.featureButtonStyles.blue}
                  >
                    Explore Protection
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Yield Generation */}
            <Card
              sx={{
                ...homeContentStyles.featureCardStyles,
                ...homeContentStyles.featureCardHoverStyles.green,
              }}
            >
              <CardContent sx={homeContentStyles.cardContentStyles}>
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp sx={{ color: "white" }} fontSize="large" />
                </div>
                <Typography
                  variant="h5"
                  sx={{
                    ...homeContentStyles.cardTitleStyles,
                    ...commonStyles.commonSpacing.smallMargin,
                  }}
                >
                  Yield Optimization
                </Typography>
                <Typography
                  sx={{
                    ...homeContentStyles.cardDescriptionStyles,
                    ...commonStyles.commonSpacing.mediumMargin,
                  }}
                >
                  Maximize returns by trading principal tokens while maintaining
                  exposure to underlying assets.
                </Typography>
                <Link href="/principal-market">
                  <Button
                    variant="outlined"
                    sx={homeContentStyles.featureButtonStyles.green}
                  >
                    View Yields
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Easy Minting */}
            <Card
              sx={{
                ...homeContentStyles.featureCardStyles,
                ...homeContentStyles.featureCardHoverStyles.purple,
              }}
            >
              <CardContent sx={homeContentStyles.cardContentStyles}>
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock sx={{ color: "white" }} fontSize="large" />
                </div>
                <Typography
                  variant="h5"
                  sx={{
                    ...homeContentStyles.cardTitleStyles,
                    ...commonStyles.commonSpacing.smallMargin,
                  }}
                >
                  Seamless Token Minting
                </Typography>
                <Typography
                  sx={{
                    ...homeContentStyles.cardDescriptionStyles,
                    ...commonStyles.commonSpacing.mediumMargin,
                  }}
                >
                  Convert your USDT/USDC into insurance and principal tokens
                  with our intuitive process.
                </Typography>
                <Link href="/mint-tokens">
                  <Button
                    variant="outlined"
                    sx={homeContentStyles.featureButtonStyles.purple}
                    disabled={!isConnected}
                  >
                    {isConnected ? "Start Minting" : "Connect Wallet"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-black">
        <Container maxWidth="lg" sx={homeContentStyles.sectionContainerStyles}>
          <div className="text-center mb-16">
            <Typography
              variant="h2"
              sx={{
                ...homeContentStyles.sectionTitleStyles,
                ...commonStyles.commonSpacing.mediumMargin,
              }}
            >
              How It Works
            </Typography>
            <Typography
              variant="h6"
              sx={homeContentStyles.sectionSubtitleStyles}
            >
              Three simple steps to protect and grow your DeFi investments
            </Typography>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                1
              </div>
              <Typography
                variant="h5"
                sx={homeContentStyles.howItWorksStepTitleStyles}
              >
                Connect & Deposit
              </Typography>
              <Typography
                sx={homeContentStyles.howItWorksStepDescriptionStyles}
              >
                Connect your wallet and deposit USDT or USDC to start protecting
                your DeFi positions.
              </Typography>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                2
              </div>
              <Typography
                variant="h5"
                sx={homeContentStyles.howItWorksStepTitleStyles}
              >
                Mint Tokens
              </Typography>
              <Typography
                sx={homeContentStyles.howItWorksStepDescriptionStyles}
              >
                Receive insurance and principal tokens that represent your
                protected investment and yield potential.
              </Typography>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                3
              </div>
              <Typography
                variant="h5"
                sx={homeContentStyles.howItWorksStepTitleStyles}
              >
                Trade & Earn
              </Typography>
              <Typography
                sx={homeContentStyles.howItWorksStepDescriptionStyles}
              >
                Trade your tokens in our markets or hold them to earn yields
                while staying protected.
              </Typography>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900">
        <Container
          maxWidth="lg"
          sx={homeContentStyles.ctaSectionContainerStyles}
        >
          <Typography variant="h2" sx={homeContentStyles.ctaTitleStyles}>
            Ready to Secure Your DeFi Future?
          </Typography>
          <Typography variant="h6" sx={homeContentStyles.ctaSubtitleStyles}>
            Join the future of decentralized insurance with TakoFi
          </Typography>
          <Link href="/mint-tokens">
            <Button
              variant="contained"
              size="large"
              sx={homeContentStyles.ctaButtonStyles}
              disabled={!isConnected}
            >
              {isConnected ? "Get Started Today" : "Connect Wallet First"}
            </Button>
          </Link>
        </Container>
      </section>
    </main>
  );
}
