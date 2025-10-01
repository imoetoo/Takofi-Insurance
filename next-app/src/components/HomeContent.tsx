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
    <main className={homeContentStyles.classNames.mainContainer}>
      {/* Hero Section */}
      <section className={homeContentStyles.classNames.heroSection}>
        {/* Background Gradient color*/}
        <div className={homeContentStyles.classNames.heroBackgroundPattern}>
          <div
            className={homeContentStyles.classNames.heroBackgroundGradient1}
          />
          <div
            className={homeContentStyles.classNames.heroBackgroundGradient2}
          />
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
          <div className={homeContentStyles.classNames.ctaButtonContainer}>
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
              <div
                className={homeContentStyles.classNames.connectButtonContainer}
              >
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
          <div className={homeContentStyles.classNames.statsGrid}>
            <div className={homeContentStyles.classNames.statsItem}>
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
            <div className={homeContentStyles.classNames.statsItem}>
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
            <div className={homeContentStyles.classNames.statsItem}>
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
      <section className={homeContentStyles.classNames.featuresSection}>
        <Container maxWidth="lg" sx={homeContentStyles.sectionContainerStyles}>
          <div className={homeContentStyles.classNames.sectionTextCenter}>
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
          <div className={homeContentStyles.classNames.featuresGrid}>
            {/* Smart Contract Protection */}
            <Card
              sx={{
                ...homeContentStyles.featureCardStyles,
                ...homeContentStyles.featureCardHoverStyles.blue,
              }}
            >
              <CardContent sx={homeContentStyles.cardContentStyles}>
                <div
                  className={
                    homeContentStyles.classNames.featureIconContainer.blue
                  }
                >
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
                  Safeguard your DeFi investments against protocol
                  vulnerabilities and risks.
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
                <div
                  className={
                    homeContentStyles.classNames.featureIconContainer.green
                  }
                >
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
                <div
                  className={
                    homeContentStyles.classNames.featureIconContainer.purple
                  }
                >
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
      <section className={homeContentStyles.classNames.howItWorksSection}>
        <Container maxWidth="lg" sx={homeContentStyles.sectionContainerStyles}>
          <div className={homeContentStyles.classNames.sectionTextCenter}>
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

          <div className={homeContentStyles.classNames.howItWorksGrid}>
            <div className={homeContentStyles.classNames.howItWorksItem}>
              <div
                className={
                  homeContentStyles.classNames.howItWorksStepIcon.step1
                }
              >
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

            <div className={homeContentStyles.classNames.howItWorksItem}>
              <div
                className={
                  homeContentStyles.classNames.howItWorksStepIcon.step2
                }
              >
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

            <div className={homeContentStyles.classNames.howItWorksItem}>
              <div
                className={
                  homeContentStyles.classNames.howItWorksStepIcon.step3
                }
              >
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
      <section className={homeContentStyles.classNames.ctaSection}>
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
