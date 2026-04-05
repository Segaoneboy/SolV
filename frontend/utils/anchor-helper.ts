import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("ADQjPmwcq7mTgW4FHuopimbKPzQrpcikAkpsNHT18p7K");

export const getProvider = (wallet: any) => {
  // Используем Devnet для хакатона
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  return new anchor.AnchorProvider(
    connection,
    wallet,
    { preflightCommitment: "confirmed" }
  );
};