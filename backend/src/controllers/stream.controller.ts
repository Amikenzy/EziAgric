import { Request, Response } from "express";
import { sorobanAdminService } from "../services/sorobanAdmin.service";
import { validateAdminReason } from "../lib/adminReason";
import { prisma } from "../lib/db";

export const getStreamRemaining = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const stream = await prisma.stream.findUnique({
      where: { streamId: id }
    });

    if (!stream) {
      res.status(404).json({ error: "Stream not found" });
      return;
    }

    res.status(200).json({
      totalVested: stream.totalVested,
      claimed: stream.claimed,
      unclaimed: stream.unclaimed,
      pendingClawback: stream.pendingClawback,
    });
  } catch (err) {
    console.error("[StreamController] Error fetching stream remaining:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const executeStreamClawback = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { amount, unsignedTxXdr, reason } = req.body;

    if (!amount) {
      res.status(400).json({ error: "Amount is required" });
      return;
    }

    const validatedReason = validateAdminReason(reason, { required: false });

    const stream = await prisma.stream.findUnique({
      where: { streamId: id }
    });

    if (!stream) {
      res.status(404).json({ error: "Stream not found" });
      return;
    }

    // Amount validation
    const unclaimedAmount = BigInt(stream.unclaimed);
    const requestedAmount = BigInt(amount);

    if (requestedAmount > unclaimedAmount) {
      res.status(400).json({ error: "Clawback amount exceeds remaining unclaimed vested amount" });
      return;
    }

    // In a full implementation, we would construct the transaction XDR to call the 
    // smart contract here if unsignedTxXdr is not provided by the caller.
    // For this issue, we will just simulate signing the provided transaction or
    // return a success response assuming it will be submitted to Soroban.
    let signedTxXdr = null;
    if (unsignedTxXdr) {
      signedTxXdr = sorobanAdminService.signTransaction(unsignedTxXdr);
    }

    // The stream_clawback event will be ingested by the event listener (handleStreamClawback) 
    // once the transaction is finalized on-chain.

    res.status(200).json({
      message: "Clawback transaction prepared/signed",
      signedTxXdr,
      reason: validatedReason ?? null,
    });
  } catch (err) {
    console.error("[StreamController] Error executing stream clawback:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
};
