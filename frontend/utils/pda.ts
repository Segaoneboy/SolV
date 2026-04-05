import { PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey("ADQjPmwcq7mTgW4FHuopimbKPzQrpcikAkpsNHT18p7K");

export const getVoucherConfigPDA = (name: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config"), Buffer.from(name)],
    PROGRAM_ID
  );
};

export const getVaultPDA = (configPublicKey: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), configPublicKey.toBuffer()],
    PROGRAM_ID
  );
};

export const getUserVoucherPDA = (buyerPublicKey: PublicKey, configPublicKey: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_voucher"), buyerPublicKey.toBuffer(), configPublicKey.toBuffer()],
    PROGRAM_ID
  );
};