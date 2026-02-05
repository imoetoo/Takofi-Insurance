"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useProtocolITBalances } from "@/hooks/useProtocolITBalances";
import { useSubmitClaim } from "@/hooks/useSubmitClaim";
import { useUserClaims } from "@/hooks/useUserClaims";
import { useUpdateClaim } from "@/hooks/useUpdateClaim";
import { usePendingClaims } from "@/hooks/usePendingClaims";
import { useAllProcessedClaims } from "@/hooks/useAllProcessedClaims";
import { useApproveClaim, useRejectClaim } from "@/hooks/useClaimManager";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  CircularProgress,
  Stack,
  Divider,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Snackbar,
} from "@mui/material";
import {
  Assignment,
  Add,
  AttachFile,
  Description,
  Visibility,
  CheckCircle,
  Cancel,
  Pending,
  Edit,
} from "@mui/icons-material";

const SUPERADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

interface Claim {
  claimId: number;
  protocolName: string;
  hackAmount: string;
  hackDate: number;
  submissionTime: number;
  details: string;
  attachmentURI: string;
  status: number;
}

export default function RedeemITPage() {
  const { address, isConnected } = useAccount();
  const {
    protocolBalances,
    loading: balancesLoading,
    error: balancesError,
  } = useProtocolITBalances(isConnected && address ? address : undefined);
  const {
    claims,
    loading: claimsLoading,
    refetch: refetchClaims,
  } = useUserClaims();
  const { claims: pendingClaims, loading: pendingLoading } = usePendingClaims();
  const { claims: allProcessedClaims, loading: processedLoading } =
    useAllProcessedClaims();

  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success",
  );

  const isSuperadmin =
    address?.toLowerCase() === SUPERADMIN_ADDRESS.toLowerCase();

  const handleShowSnackbar = (
    message: string,
    severity: "success" | "error",
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <Assignment /> Insurance Claim Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Submit breach claims for protocol hacks and track your claim status
        </Typography>
        {isSuperadmin && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You are logged in as the Superadmin. You can review and
            approve/reject claims.
          </Alert>
        )}
      </Box>

      {!isConnected ? (
        <Alert severity="info">
          Please connect your wallet to submit claims and view your insurance
          tokens.
        </Alert>
      ) : (
        <>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setCurrentTab(newValue)}
            sx={{ mb: 3 }}
          >
            <Tab
              label="My Insurance Tokens"
              icon={<Assignment />}
              iconPosition="start"
            />
            <Tab
              label="My Claims"
              icon={<Description />}
              iconPosition="start"
            />
            <Tab
              label="Processed Claims"
              icon={<CheckCircle />}
              iconPosition="start"
            />
            {isSuperadmin && (
              <Tab
                label="All Pending Claims"
                icon={<Pending />}
                iconPosition="start"
              />
            )}
          </Tabs>

          {/* Tab 0: Insurance Tokens */}
          {currentTab === 0 && (
            <>
              {balancesError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Error loading insurance tokens:{" "}
                  {balancesError.message || "Unknown error"}
                </Alert>
              )}
              {balancesLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : protocolBalances.length === 0 ? (
                <Alert severity="info">
                  You do not have any Insurance Tokens. Mint some tokens first
                  to submit claims.
                </Alert>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)",
                    },
                    gap: 3,
                  }}
                >
                  {protocolBalances.map((protocol) => {
                    // Check if user has a pending claim for this protocol
                    const pendingClaim = claims.find(
                      (c) => c.protocolName === protocol.name && c.status === 0,
                    );

                    return (
                      <Box key={protocol.name}>
                        <ProtocolCard
                          protocol={protocol}
                          pendingClaim={pendingClaim}
                          onSubmitClaim={() => {
                            setSelectedProtocol(protocol.name);
                            setSubmitDialogOpen(true);
                          }}
                          onViewClaim={() => {
                            setCurrentTab(1); // Switch to My Claims tab
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}
            </>
          )}

          {/* Tab 1: My Claims */}
          {currentTab === 1 && (
            <ClaimsTable
              claims={claims}
              loading={claimsLoading}
              emptyMessage="You haven't submitted any claims yet."
              onEditClaim={(claim) => {
                setSelectedClaim(claim);
                setEditDialogOpen(true);
              }}
              onViewClaim={(claim) => {
                setSelectedClaim(claim);
                setViewDialogOpen(true);
              }}
            />
          )}

          {/* Tab 2: Processed Claims */}
          {currentTab === 2 && (
            <ClaimsTable
              claims={
                isSuperadmin
                  ? allProcessedClaims
                  : claims.filter((claim) => claim.status !== 0)
              }
              loading={isSuperadmin ? processedLoading : claimsLoading}
              emptyMessage={
                isSuperadmin
                  ? "No processed claims in the system."
                  : "No processed claims. All your claims are still pending."
              }
              onViewClaim={(claim) => {
                setSelectedClaim(claim);
                setViewDialogOpen(true);
              }}
            />
          )}

          {/* Tab 3: All Pending Claims (Superadmin only) */}
          {currentTab === 3 && isSuperadmin && (
            <ClaimsTable
              claims={pendingClaims}
              loading={pendingLoading}
              emptyMessage="No pending claims to review."
              onViewClaim={(claim) => {
                setSelectedClaim(claim);
                setViewDialogOpen(true);
              }}
            />
          )}
        </>
      )}

      {/* Submit Claim Dialog */}
      {selectedProtocol && (
        <SubmitClaimDialog
          open={submitDialogOpen}
          onClose={() => setSubmitDialogOpen(false)}
          protocol={selectedProtocol}
          onSuccess={async () => {
            handleShowSnackbar(
              "Claim submitted successfully! View it in the My Claims tab.",
              "success",
            );
            setSubmitDialogOpen(false);
            setCurrentTab(1); // Switch to My Claims tab
            await refetchClaims();
          }}
          onError={(errorMsg: string) => {
            handleShowSnackbar(`Error: ${errorMsg}`, "error");
          }}
        />
      )}

      {/* Edit Claim Dialog */}
      {selectedClaim && (
        <EditClaimDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedClaim(null);
          }}
          claim={selectedClaim}
          onSuccess={async () => {
            handleShowSnackbar("Claim updated successfully!", "success");
            setEditDialogOpen(false);
            setSelectedClaim(null);
            await refetchClaims();
          }}
          onError={(errorMsg: string) => {
            handleShowSnackbar(`Error: ${errorMsg}`, "error");
          }}
        />
      )}

      {/* View Claim Dialog */}
      {selectedClaim && (
        <ViewClaimDialog
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setSelectedClaim(null);
          }}
          claim={selectedClaim}
          isSuperadmin={isSuperadmin}
          onClaimApproved={async () => {
            handleShowSnackbar("Claim approved successfully!", "success");
            await refetchClaims();
            setViewDialogOpen(false);
            setSelectedClaim(null);
            setCurrentTab(2); // Switch to Processed Claims tab
          }}
          onClaimRejected={async () => {
            handleShowSnackbar("Claim rejected successfully!", "success");
            await refetchClaims();
            setViewDialogOpen(false);
            setSelectedClaim(null);
            setCurrentTab(2); // Switch to Processed Claims tab
          }}
        />
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

interface ProtocolCardProps {
  protocol: {
    name: string;
    balance: string;
    maturityLabel: string;
    isExpired: boolean;
  };
  pendingClaim?: {
    claimId: number;
    status: number;
  };
  onSubmitClaim: () => void;
  onViewClaim: () => void;
}

function ProtocolCard({
  protocol,
  pendingClaim,
  onSubmitClaim,
  onViewClaim,
}: ProtocolCardProps) {
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {protocol.name}
            </Typography>
            <Chip label={protocol.maturityLabel} size="small" color="primary" />
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Your IT Balance
            </Typography>
            <Typography variant="h5">
              {parseFloat(protocol.balance).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              IT
            </Typography>
          </Box>

          <Divider />

          {protocol.isExpired ? (
            <Alert severity="error" icon={<Cancel />}>
              Maturity has expired. Cannot submit new claims.
            </Alert>
          ) : pendingClaim ? (
            <Stack spacing={1}>
              <Alert severity="warning" icon={<Pending />}>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  Active Claim Exists
                </Typography>
                <Typography variant="caption">
                  Claim #{pendingClaim.claimId} is pending review. You can only
                  have one active claim per protocol. Please wait for this claim
                  to be approved or rejected before submitting a new one.
                </Typography>
              </Alert>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Visibility />}
                onClick={onViewClaim}
              >
                View Pending Claim
              </Button>
            </Stack>
          ) : (
            <Button
              variant="contained"
              fullWidth
              startIcon={<Add />}
              onClick={onSubmitClaim}
            >
              Submit Breach Claim
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

interface SubmitClaimDialogProps {
  open: boolean;
  onClose: () => void;
  protocol: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function SubmitClaimDialog({
  open,
  onClose,
  protocol,
  onSuccess,
  onError,
}: SubmitClaimDialogProps) {
  type UploadedFile = { name: string; size: number; url: string };
  const [hackAmount, setHackAmount] = useState("");
  const [hackDate, setHackDate] = useState("");
  const [details, setDetails] = useState("");
  const [attachmentURL, setAttachmentURL] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const { submitClaim, isSubmitting, error, txHash } = useSubmitClaim();

  const uploadFiles = async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Upload failed");
    }

    const data = await res.json();
    return data.uploaded as UploadedFile[];
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const filesList = event.target.files;
    if (!filesList || filesList.length === 0) return;

    const validTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];
    const newFiles: File[] = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];

      if (!validTypes.includes(file.type)) {
        onError(
          `${file.name}: Please upload only PDF or image files (PNG, JPG)`,
        );
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        onError(`${file.name}: File size must be less than 10MB`);
        continue;
      }

      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      setUploadingFile(true);
      try {
        const uploaded = await uploadFiles(newFiles);
        setSelectedFiles([...selectedFiles, ...uploaded]);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to upload files";
        onError(msg);
      } finally {
        setUploadingFile(false);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const getCombinedAttachments = () => {
    const attachments: string[] = [];

    if (selectedFiles.length > 0) {
      attachments.push(...selectedFiles.map((f) => f.url));
    }

    if (attachmentURL.trim()) {
      attachments.push(attachmentURL.trim());
    }

    return attachments.join(" | ");
  };

  const handleSubmit = async () => {
    try {
      await submitClaim({
        protocol,
        hackAmount,
        hackDate,
        details,
        attachmentURI: getCombinedAttachments(),
      });

      setHackAmount("");
      setHackDate("");
      setDetails("");
      setAttachmentURL("");
      setSelectedFiles([]);

      onSuccess();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to submit claim";
      onError(errorMsg);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" gap={1}>
          <Assignment />
          Submit Breach Claim - {protocol}
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {txHash && (
            <Alert severity="success">
              Claim submitted! Transaction hash: {txHash.substring(0, 10)}...
            </Alert>
          )}

          <TextField
            label="Hack Amount (USD)"
            type="number"
            fullWidth
            value={hackAmount}
            onChange={(e) => setHackAmount(e.target.value)}
            disabled={isSubmitting}
            helperText="Total amount lost in the breach (in USD)"
            required
          />

          <TextField
            label="Hack Date"
            type="date"
            fullWidth
            value={hackDate}
            onChange={(e) => setHackDate(e.target.value)}
            disabled={isSubmitting}
            InputLabelProps={{ shrink: true }}
            helperText="Date when the breach occurred"
            required
          />

          <TextField
            label="Claim Details"
            multiline
            rows={6}
            fullWidth
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            disabled={isSubmitting}
            helperText="Provide detailed information about the breach incident"
            required
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Attachment (Optional)
            </Typography>
            <Stack spacing={2}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFile />}
                disabled={isSubmitting || uploadingFile}
                fullWidth
              >
                {uploadingFile
                  ? "Uploading..."
                  : "Upload PDF or Images (Multiple)"}
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                />
              </Button>

              {selectedFiles.length > 0 && (
                <Stack spacing={1}>
                  {selectedFiles.map((file, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Description fontSize="small" />
                          <Box>
                            <Typography variant="body2">{file.name}</Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {(file.size / 1024).toFixed(2)} KB
                            </Typography>
                          </Box>
                        </Stack>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveFile(index)}
                          disabled={isSubmitting}
                        >
                          <Cancel />
                        </IconButton>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}

              <Divider>AND/OR</Divider>

              <TextField
                label="Additional URL"
                fullWidth
                value={attachmentURL}
                onChange={(e) => setAttachmentURL(e.target.value)}
                disabled={isSubmitting}
                placeholder="https://..."
                helperText="Add URL to external documents or evidence"
                size="small"
              />
            </Stack>
          </Box>

          <Alert severity="info">
            Your claim will be reviewed by the superadmin (0xf39F...2266). You
            will be notified once a decision is made.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || !hackAmount || !hackDate || !details}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <Add />}
        >
          {isSubmitting ? "Submitting..." : "Submit Claim"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ViewClaimDialogProps {
  open: boolean;
  onClose: () => void;
  claim: Claim;
  isSuperadmin?: boolean;
  onClaimApproved?: () => void;
  onClaimRejected?: () => void;
}
function ViewClaimDialog({
  open,
  onClose,
  claim,
  isSuperadmin = false,
  onClaimApproved,
  onClaimRejected,
}: ViewClaimDialogProps) {
  const { approveClaim, isApproving } = useApproveClaim();
  const { rejectClaim, isRejecting } = useRejectClaim();
  const [approvalNotes, setApprovalNotes] = useState("");
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalAction, setApprovalAction] = useState<
    "approve" | "reject" | null
  >(null);

  const handleApproveClick = () => {
    setApprovalAction("approve");
    setShowApprovalForm(true);
  };

  const handleRejectClick = () => {
    setApprovalAction("reject");
    setShowApprovalForm(true);
  };

  const handleSubmitApproval = async () => {
    if (!approvalAction) return;

    try {
      if (approvalAction === "approve") {
        await approveClaim(claim.claimId, approvalNotes);
        setApprovalNotes("");
        setShowApprovalForm(false);
        setApprovalAction(null);
        onClaimApproved?.();
        onClose();
      } else if (approvalAction === "reject") {
        await rejectClaim(claim.claimId, approvalNotes);
        setApprovalNotes("");
        setShowApprovalForm(false);
        setApprovalAction(null);
        onClaimRejected?.();
        onClose();
      }
    } catch (error) {
      console.error("Error submitting approval:", error);
    }
  };

  const handleCancelApproval = () => {
    setShowApprovalForm(false);
    setApprovalAction(null);
    setApprovalNotes("");
  };

  const getStatusText = (status: number) => {
    const statuses = ["Pending", "Approved", "Rejected", "Settled"];
    return statuses[status] || "Unknown";
  };

  const getStatusColor = (status: number) => {
    const colors = ["warning", "success", "error", "info"] as const;
    return colors[status] || "default";
  };

  const attachmentParts = (claim.attachmentURI || "")
    .split(" | ")
    .map((part) => part.trim())
    .filter(Boolean);

  // All attachments should be viewable, regardless of prefix
  // Convert any IPFS hash or URL to a proper gateway URL
  const allAttachments = attachmentParts.map((part) => {
    // Remove file: prefix if present
    const cleanPart = part.startsWith("file:") ? part.substring(5) : part;

    // If it's an IPFS URL
    if (cleanPart.startsWith("ipfs://")) {
      return {
        url: `https://gateway.pinata.cloud/ipfs/${cleanPart.replace(
          "ipfs://",
          "",
        )}`,
        display: cleanPart,
        type: "ipfs",
      };
    }

    // If it's a plain IPFS hash (starts with Qm)
    if (cleanPart.match(/^Qm[a-zA-Z0-9]{44}$/)) {
      return {
        url: `https://gateway.pinata.cloud/ipfs/${cleanPart}`,
        display: cleanPart,
        type: "ipfs",
      };
    }

    // If it's an HTTP/HTTPS URL
    if (cleanPart.startsWith("http://") || cleanPart.startsWith("https://")) {
      return {
        url: cleanPart,
        display: cleanPart,
        type: "url",
      };
    }

    // Otherwise, it's a local file reference
    return {
      url: null,
      display: cleanPart,
      type: "local",
    };
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <Description />
            Claim #{claim.claimId} - {claim.protocolName}
          </Stack>
          <Chip
            label={getStatusText(claim.status)}
            color={getStatusColor(claim.status)}
            size="small"
          />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Protocol
            </Typography>
            <Typography variant="body1">{claim.protocolName}</Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Hack Amount
            </Typography>
            <Typography variant="h6" color="error.main">
              ${parseFloat(claim.hackAmount).toLocaleString()}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Breach Date
            </Typography>
            <Typography variant="body1">
              {new Date(claim.hackDate * 1000).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Submitted On
            </Typography>
            <Typography variant="body1">
              {new Date(claim.submissionTime * 1000).toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Claim Details
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {claim.details || "No details provided"}
              </Typography>
            </Paper>
          </Box>

          {allAttachments.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Attachments ({allAttachments.length})
              </Typography>
              <Stack spacing={1}>
                {allAttachments.map((attachment, index) => (
                  <Stack
                    key={index}
                    direction="row"
                    alignItems="center"
                    gap={1}
                    sx={{ flexWrap: "wrap" }}
                  >
                    <AttachFile fontSize="small" color="primary" />
                    {attachment.url ? (
                      <Typography
                        variant="body2"
                        component="a"
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          color: "primary.main",
                          textDecoration: "none",
                          "&:hover": { textDecoration: "underline" },
                          wordBreak: "break-all",
                        }}
                      >
                        📄{" "}
                        {attachment.type === "ipfs"
                          ? "View File on IPFS"
                          : attachment.display}
                      </Typography>
                    ) : (
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Chip label={attachment.display} size="small" />
                        <Typography variant="caption" color="text.secondary">
                          (local reference - file not accessible)
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {!showApprovalForm ? (
          <>
            {isSuperadmin && claim.status === 0 && (
              <>
                <Button
                  onClick={handleRejectClick}
                  variant="outlined"
                  color="error"
                  disabled={isRejecting}
                >
                  {isRejecting ? "Rejecting..." : "Reject"}
                </Button>
                <Button
                  onClick={handleApproveClick}
                  variant="contained"
                  color="success"
                  disabled={isApproving}
                >
                  {isApproving ? "Approving..." : "Approve"}
                </Button>
              </>
            )}
            <Button onClick={onClose} variant="contained">
              Close
            </Button>
          </>
        ) : (
          <>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes (Optional)"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              disabled={isApproving || isRejecting}
              placeholder="Add notes for this decision..."
              size="small"
            />
            <Stack direction="row" spacing={1}>
              <Button
                onClick={handleCancelApproval}
                variant="outlined"
                disabled={isApproving || isRejecting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitApproval}
                variant="contained"
                color={approvalAction === "approve" ? "success" : "error"}
                disabled={isApproving || isRejecting}
              >
                {isApproving || isRejecting
                  ? "Processing..."
                  : `${
                      approvalAction === "approve"
                        ? "Confirm Approve"
                        : "Confirm Reject"
                    }`}
              </Button>
            </Stack>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

interface EditClaimDialogProps {
  open: boolean;
  onClose: () => void;
  claim: Claim;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function EditClaimDialog({
  open,
  onClose,
  claim,
  onSuccess,
  onError,
}: EditClaimDialogProps) {
  type UploadedFile = { name: string; size: number; url: string };
  const { updateClaim, isUpdating, error, txHash } = useUpdateClaim();

  // Initialize with existing claim data
  const [hackAmount, setHackAmount] = useState(claim.hackAmount);
  const [hackDate, setHackDate] = useState(() => {
    const date = new Date(claim.hackDate * 1000);
    return date.toISOString().split("T")[0];
  });
  const [details, setDetails] = useState(claim.details || "");
  const [attachmentURL, setAttachmentURL] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);

  useEffect(() => {
    if (!claim.attachmentURI) return;
    const parts = claim.attachmentURI
      .split(" | ")
      .map((s) => s.trim())
      .filter(Boolean);
    const files: string[] = [];
    const urls: string[] = [];

    parts.forEach((part) => {
      if (part.startsWith("file:")) {
        files.push(part.substring(5));
      } else if (part.startsWith("http") || part.startsWith("ipfs")) {
        urls.push(part);
      }
    });

    setExistingFiles(files);
    setAttachmentURL(urls.join(" | "));
  }, [claim.attachmentURI]);

  const uploadFiles = async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Upload failed");
    }

    const data = await res.json();
    return data.uploaded as UploadedFile[];
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const filesList = event.target.files;
    if (!filesList || filesList.length === 0) return;

    const validTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];
    const newFiles: File[] = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];

      if (!validTypes.includes(file.type)) {
        onError(
          `${file.name}: Please upload only PDF or image files (PNG, JPG)`,
        );
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        onError(`${file.name}: File size must be less than 10MB`);
        continue;
      }

      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      setUploadingFile(true);
      try {
        const uploaded = await uploadFiles(newFiles);
        setSelectedFiles([...selectedFiles, ...uploaded]);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to upload files";
        onError(msg);
      } finally {
        setUploadingFile(false);
      }
    }
  };

  const handleRemoveNewFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = (index: number) => {
    setExistingFiles(existingFiles.filter((_, i) => i !== index));
  };

  const getCombinedAttachments = () => {
    const attachments: string[] = [];

    // Add existing files that weren't removed
    if (existingFiles.length > 0) {
      attachments.push(...existingFiles.map((f) => `file:${f}`));
    }

    // Add newly selected files
    if (selectedFiles.length > 0) {
      attachments.push(...selectedFiles.map((f) => f.url));
    }

    // Add URLs
    if (attachmentURL.trim()) {
      attachments.push(attachmentURL.trim());
    }

    return attachments.join(" | ");
  };

  const handleUpdate = async () => {
    try {
      await updateClaim({
        claimId: claim.claimId,
        hackAmount,
        hackDate,
        details,
        attachmentURI: getCombinedAttachments(),
      });

      onSuccess();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update claim";
      onError(errorMsg);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" gap={1}>
          <Edit />
          Edit Claim #{claim.claimId} - {claim.protocolName}
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {txHash && (
            <Alert severity="success">
              Claim updated! Transaction hash: {txHash.substring(0, 10)}...
            </Alert>
          )}

          <TextField
            label="Hack Amount (USD)"
            type="number"
            fullWidth
            value={hackAmount}
            onChange={(e) => setHackAmount(e.target.value)}
            disabled={isUpdating}
            helperText="Total amount lost in the breach (in USD)"
            required
          />

          <TextField
            label="Hack Date"
            type="date"
            fullWidth
            value={hackDate}
            onChange={(e) => setHackDate(e.target.value)}
            disabled={isUpdating}
            InputLabelProps={{ shrink: true }}
            helperText="Date when the breach occurred"
            required
          />

          <TextField
            label="Claim Details"
            multiline
            rows={6}
            fullWidth
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            disabled={isUpdating}
            helperText="Provide detailed information about the breach incident"
            required
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Attachments (Optional)
            </Typography>
            <Stack spacing={2}>
              {/* Existing uploaded files */}
              {existingFiles.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                  >
                    Previously Uploaded
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {existingFiles.map((fileName, index) => (
                      <Paper
                        key={`existing-${index}`}
                        variant="outlined"
                        sx={{ p: 2, bgcolor: "action.hover" }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Stack direction="row" alignItems="center" gap={1}>
                            <Description fontSize="small" />
                            <Typography variant="body2">{fileName}</Typography>
                          </Stack>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveExistingFile(index)}
                            disabled={isUpdating}
                          >
                            <Cancel />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFile />}
                disabled={isUpdating || uploadingFile}
                fullWidth
              >
                {uploadingFile
                  ? "Processing..."
                  : "Upload PDF or Images (Multiple)"}
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                />
              </Button>

              {selectedFiles.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                  >
                    Newly Added
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {selectedFiles.map((file, index) => (
                      <Paper
                        key={`new-${index}`}
                        variant="outlined"
                        sx={{ p: 2 }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Stack direction="row" alignItems="center" gap={1}>
                            <Description fontSize="small" />
                            <Box>
                              <Typography variant="body2">
                                {file.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {(file.size / 1024).toFixed(2)} KB
                              </Typography>
                            </Box>
                          </Stack>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveNewFile(index)}
                            disabled={isUpdating}
                          >
                            <Cancel />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              <Divider>AND/OR</Divider>

              <TextField
                label="Additional URL"
                fullWidth
                value={attachmentURL}
                onChange={(e) => setAttachmentURL(e.target.value)}
                disabled={isUpdating}
                placeholder="https://... or ipfs://..."
                helperText="Add URL to external documents or evidence"
                size="small"
              />
            </Stack>
          </Box>

          <Alert severity="warning">
            You can only edit claims that are in Pending status. Once approved
            or rejected, claims cannot be modified.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isUpdating}>
          Cancel
        </Button>
        <Button
          onClick={handleUpdate}
          variant="contained"
          disabled={isUpdating || !hackAmount || !hackDate || !details}
          startIcon={isUpdating ? <CircularProgress size={20} /> : <Edit />}
        >
          {isUpdating ? "Updating..." : "Update Claim"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ClaimsTableProps {
  claims: Claim[];
  loading: boolean;
  emptyMessage: string;
  onEditClaim?: (claim: Claim) => void;
  onViewClaim?: (claim: Claim) => void;
}

function ClaimsTable({
  claims,
  loading,
  emptyMessage,
  onEditClaim,
  onViewClaim,
}: ClaimsTableProps) {
  const getStatusChip = (status: number) => {
    const statuses = [
      {
        label: "Pending",
        color: "warning" as const,
        icon: <Pending fontSize="small" />,
      },
      {
        label: "Approved",
        color: "success" as const,
        icon: <CheckCircle fontSize="small" />,
      },
      {
        label: "Rejected",
        color: "error" as const,
        icon: <Cancel fontSize="small" />,
      },
      {
        label: "Settled",
        color: "info" as const,
        icon: <CheckCircle fontSize="small" />,
      },
    ];
    const statusInfo = statuses[status] || statuses[0];
    return (
      <Chip
        label={statusInfo.label}
        color={statusInfo.color}
        size="small"
        icon={statusInfo.icon}
      />
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (claims.length === 0) {
    return <Alert severity="info">{emptyMessage}</Alert>;
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Claim ID</TableCell>
            <TableCell>Protocol</TableCell>
            <TableCell>Hack Amount</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {claims.map((claim) => (
            <TableRow key={claim.claimId} hover>
              <TableCell>#{claim.claimId}</TableCell>
              <TableCell>{claim.protocolName}</TableCell>
              <TableCell>
                ${parseFloat(claim.hackAmount).toLocaleString()}
              </TableCell>
              <TableCell>
                {new Date(claim.submissionTime * 1000).toLocaleDateString()}
              </TableCell>
              <TableCell>{getStatusChip(claim.status)}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  {claim.status === 0 && onEditClaim && (
                    <Tooltip title="Edit Claim">
                      <IconButton
                        size="small"
                        onClick={() => onEditClaim(claim)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => onViewClaim?.(claim)}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
