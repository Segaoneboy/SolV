'use client';

import * as anchor from "@coral-xyz/anchor";
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { PublicKey, Connection, Transaction } from "@solana/web3.js";
import idlRaw from '@/idl/sol_voucher.json';
import { getVoucherConfigPDA, getVaultPDA } from '@/utils/pda';

const idl = idlRaw as anchor.Idl;

export function useVoucherProgram() {
  const { ready: privyReady } = usePrivy();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();

  const getPrivyWallet = () => {
    return wallets.find((w) => w.standardWallet.name === 'Privy') ?? null;
  };

  const getProgram = async (): Promise<anchor.Program | null> => {
    // 1. Настройка базового подключения к RPC
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // Получаем кошелек из Privy (если он есть)
    const privyWallet = getPrivyWallet();

    // --- СЦЕНАРИЙ 1: ПОЛЬЗОВАТЕЛЬ НЕ АВТОРИЗОВАН (READ-ONLY) ---
    if (!privyWallet) {
      console.log("🕶 Режим просмотра: работаем без кошелька (ReadOnly)");
      
      // Создаем "пустой" объект воллета для Anchor
      const readOnlyWallet = {
        publicKey: PublicKey.default, // Адрес из нулей
        signTransaction: async () => { 
          throw new Error("Необходимо подключить кошелек для выполнения этого действия"); 
        },
        signAllTransactions: async () => { 
          throw new Error("Необходимо подключить кошелек для выполнения этого действия"); 
        },
      } as unknown as anchor.Wallet;

      const provider = new anchor.AnchorProvider(connection, readOnlyWallet, {
        preflightCommitment: "confirmed",
      });

      return new anchor.Program(idl as any, provider);
    }

    // --- СЦЕНАРИЙ 2: ПОЛЬЗОВАТЕЛЬ АВТОРИЗОВАН (FULL ACCESS) ---
    console.log("✅ Wallet address detected:", privyWallet.address);
    const walletPublicKey = new PublicKey(privyWallet.address);

    const anchorWallet = {
      publicKey: walletPublicKey,
      payer: { publicKey: walletPublicKey } as any,

      signTransaction: async <T extends Transaction>(tx: T): Promise<T> => {
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = walletPublicKey;

        const serialized = tx.serialize({ requireAllSignatures: false });

        // Вызываем подпись через Privy
        const signedBytes = await signTransaction({
          transaction: new Uint8Array(serialized),
          wallet: privyWallet,
        });

        let signedTx: Transaction;

        // Твоя кастомная логика парсинга ответов Privy
        if (signedBytes instanceof Uint8Array) {
          signedTx = Transaction.from(Buffer.from(signedBytes));
        } else if ((signedBytes as any)?.signedTransaction) {
          const obj = (signedBytes as any).signedTransaction;
          const bytes = new Uint8Array(Object.values(obj) as number[]);
          signedTx = Transaction.from(Buffer.from(bytes));
        } else if ((signedBytes as any)?.encodedTransaction) {
          signedTx = Transaction.from(
            Buffer.from((signedBytes as any).encodedTransaction, 'base64')
          );
        } else if ((signedBytes as any)?.signature) {
          const sig = (signedBytes as any).signature;
          const sigBytes = typeof sig === 'string'
            ? Buffer.from(sig, 'base64')
            : Buffer.from(sig);
          tx.addSignature(walletPublicKey, sigBytes);
          signedTx = tx;
        } else {
          throw new Error(`Неизвестный формат подписи от Privy: ${JSON.stringify(signedBytes)}`);
        }

        return signedTx as T;
      },

      signAllTransactions: async <T extends Transaction>(txs: T[]): Promise<T[]> => {
        return Promise.all(txs.map((tx) => anchorWallet.signTransaction(tx)));
      },
    } as anchor.Wallet;

    const provider = new anchor.AnchorProvider(connection, anchorWallet, {
      preflightCommitment: "confirmed",
    });

    return new anchor.Program(idl as any, provider);
};

  const createVoucherSeries = async (data: {
    name: string;
    description: string;
    imageUrl: string;
    documentHash: string;
    documentUrl: string;
    unitPrice: string;
    totalUnits: string;
    expiryDays: string;
  }) => {
    const program = await getProgram();
    if (!program) throw new Error("Кошелёк не готов");

    const [configPDA] = getVoucherConfigPDA(data.name);
    const [vaultPDA] = getVaultPDA(configPDA);

    const unitPriceBN = new anchor.BN(
      Math.floor(parseFloat(data.unitPrice) * 1_000_000_000)
    );
    const expiryTimestamp = new anchor.BN(
      Math.floor(Date.now() / 1000) + parseInt(data.expiryDays) * 86400
    );

    try {
      const txSignature = await program.methods
        .initializeVoucher(
          data.name,
          data.description,
          data.imageUrl,
          data.documentHash,
          data.documentUrl,
          unitPriceBN,
          parseInt(data.totalUnits),
          expiryTimestamp
        )
        .accounts({
          voucherConfig: configPDA,
          vaultPda: vaultPDA,
          //@ts-ignore
          authority: program.provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Транзакция успешна:", txSignature);
      return txSignature;
    } catch (err: any) {
      console.error("❌ RPC Error:", err);
      if (err instanceof anchor.AnchorError) {
        console.error("Anchor error:", err.error.errorCode.number, err.error.errorMessage);
      }
      throw err;
    }
  };

  const fetchMyVoucherSeries = async () => {
  const program = await getProgram();
  if (!program) return [];
  const userPublicKey = program.provider.publicKey;
  if (!userPublicKey || userPublicKey.equals(PublicKey.default)) return [];

  try {
    //@ts-ignore
    const all = await program.account.voucherConfig.all([
      { dataSize: 1126},
      {
        memcmp: {
          offset: 8,
          bytes: userPublicKey.toBase58(),
        }
      }
    ]);
    return all.filter((s:any) => s.account.authority.equals(program.provider.publicKey));

  } catch (err) {
    console.error("Fetch Error:", err);
    return [];
  }
};

const fetchMyUserVouchers = async () => {
  const program = await getProgram();
  if (!program) return [];

  const userPublicKey = program.provider.publicKey;

  try {
    // Ищем все аккаунты UserVoucher в блокчейне
    //@ts-ignore
    const vouchers = await program.account.userVoucher.all([
      {
        dataSize: 74
      },
      {
        memcmp: {
          offset: 8, // Пропускаем 8 байт дискриминатора Anchor
          //@ts-ignore
          bytes: userPublicKey.toBase58(), // Фильтруем по твоему кошельку
        },
      },
    ]);

    // Возвращаем массив объектов { publicKey, account }
    return vouchers;
  } catch (err) {
    console.error("Ошибка при поиске ваучеров пользователя:", err);
    return [];
  }
};

const fetchAllVoucherSeries = async () => {
  const program = await getProgram();
  if (!program) {
    console.warn("⚠️ Программа не инициализирована (кошелек не подключен?)");
    return [];
  }
  try {
    // Получаем ВСЕ аккаунты этого типа без фильтрации
    //@ts-ignore
    const all = await program.account.voucherConfig.all([
      {
        dataSize: 1126
      }
    ]);
    console.log("Fetched from chain (filtered by size):", all.length, "items");
    return all;
  } catch (err) {
    console.error("Critical Fetch Error:", err);
    return [];
  }
};

const redeemVoucher = async (userVoucherAddress: string, ownerAddr: string, units: number) => {
  const program = await getProgram(); 
  if (!program) throw new Error("Программа не готова");
  
  const walletPublicKey = program.provider.publicKey;
  if (!walletPublicKey) throw new Error("Wallet not connected");

  const userVoucherPubKey = new PublicKey(userVoucherAddress);
  const ownerPublicKey = new PublicKey(ownerAddr); // <-- Ключ владельца ваучера
  
  try {
    //@ts-ignore
    const userVoucherData = await program.account.userVoucher.fetch(userVoucherPubKey);
    const configPubkey = userVoucherData.config;
    
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), configPubkey.toBuffer()],
      program.programId
    );

    // PDA для user_voucher нужно вычислять через owner, а не напрямую брать адрес
    const [userVoucherPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_voucher"),
        ownerPublicKey.toBuffer(),       // <-- seeds[1] = owner
        configPubkey.toBuffer(),         // <-- seeds[2] = config
      ],
      program.programId
    );

    const tx = await program.methods
      .redeemUnit(
        ownerPublicKey,              // <-- owner_pubkey как instruction argument
        new anchor.BN(units)         // <-- units_to_redeem
      )
      .accounts({
        authority: walletPublicKey,        // Бизнес (подписант, authority конфига)
        voucherConfig: configPubkey,
        userVoucher: userVoucherPDA,       // <-- Используем пересчитанный PDA
        ownerAccount: ownerPublicKey,      // <-- Аккаунт владельца (для возврата rent)
        vaultPda: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return tx;
  } catch (err: any) {
    console.error("❌ Redeem Critical Error:", err);
    throw new Error(err.message || "Redeem failed");
  }
};

const refundVoucher = async (configAddress: string) => {
  const program = await getProgram();
  if (!program) throw new Error("Wallet not ready");

  const configPubkey = new PublicKey(configAddress);
  const userPubkey = program.provider.publicKey;

  const [userVoucherPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_voucher"),
      userPubkey!.toBuffer(),
      configPubkey.toBuffer(),
    ],
    program.programId
  );

  const [vaultPDA] = getVaultPDA(configPubkey);

  try {
    // ИСПОЛЬЗУЕМ ИМЯ ИЗ ТВОЕГО IDL: refundAndClose (camelCase для JS)
    const tx = await program.methods
      .refundAndClose() 
      .accounts({
        //@ts-ignore
        buyer: userPubkey,
        voucherConfig: configPubkey,
        userVoucher: userVoucherPDA,
        vaultPda: vaultPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Refund success:", tx);
    return tx;
  } catch (err: any) {
    console.error("❌ Refund error:", err);
    throw err;
  }
};

const purchaseVoucher = async (configAddress: string) => {
  const program = await getProgram();
  if (!program) throw new Error("Кошелек не готов");

  const configPubkey = new PublicKey(configAddress);
  const userPubkey = program.provider.publicKey;

  // 1. Находим PDA для UserVoucher (Seeds: "user_voucher", buyer, voucher_config)
  const [userVoucherPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_voucher"),
      //@ts-ignore
      userPubkey.toBuffer(),
      configPubkey.toBuffer(),
    ],
    program.programId
  );

  // 2. Находим PDA для Vault (Seeds: "vault", voucher_config)
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      configPubkey.toBuffer(),
    ],
    program.programId
  );

  try {
    // Вызываем метод ИМЕННО так, как он описан в твоем JSON (purchaseVoucher)
    // И передаем 1 (количество покупаемых юнитов), так как в IDL есть аргумент amount_to_buy
    const tx = await program.methods
      .purchaseVoucher(1) 
      .accounts({
        //@ts-ignore
        buyer: userPubkey,
        voucherConfig: configPubkey,
        userVoucher: userVoucherPDA,
        vaultPda: vaultPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return tx;
  } catch (err: any) {
    console.error("❌ Ошибка при покупке:", err);
    throw err;
  }
};

  return { getProgram, createVoucherSeries, fetchMyVoucherSeries, redeemVoucher, refundVoucher , fetchMyUserVouchers, purchaseVoucher, fetchAllVoucherSeries };
}