import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolVoucher } from "../target/types/sol_voucher";
import { expect } from "chai";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("sol_voucher", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolVoucher as Program<SolVoucher>;
  
  const voucherName = "CoffeePass_v2_" + Math.floor(Math.random() * 1000);
  const description = "Абонемент на 5 чашек кофе";
  const imageUrl = "https://coffee.rwa/image.png";
  const unitPrice = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  const totalUnits = 5;

  const [voucherConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("config"), Buffer.from(voucherName)],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), voucherConfig.toBuffer()],
    program.programId
  );

  const [userVoucher] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_voucher"),
      provider.wallet.publicKey.toBuffer(),
      voucherConfig.toBuffer(),
    ],
    program.programId
  );

  it("1. Инициализация ваучера (Бизнес)", async () => {
    await program.methods
      .initializeVoucher(voucherName, description, imageUrl, unitPrice, totalUnits)
      .accounts({
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const configAccount = await program.account.voucherConfig.fetch(voucherConfig);
    expect(configAccount.name).to.equal(voucherName);
  });

  it("2. Покупка ваучера (Клиент)", async () => {
    const beforeBalance = await provider.connection.getBalance(vaultPda);

    await program.methods
      .purchaseVoucher()
      .accounts({
        buyer: provider.wallet.publicKey,
        voucherConfig: voucherConfig,
        // Явно передаем vault, так как в 0.32.1 иногда резолвинг тупит
        vaultPda: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const afterBalance = await provider.connection.getBalance(vaultPda);
    expect(afterBalance - beforeBalance).to.equal(unitPrice.toNumber() * totalUnits);
  });

  it("3. Использование одной чашки (Redeem)", async () => {
    const authBefore = await provider.connection.getBalance(provider.wallet.publicKey);

    await program.methods
      .redeemUnit()
      .accounts({
        authority: provider.wallet.publicKey,
        voucherConfig: voucherConfig,
        userVoucher: userVoucher, 
        vaultPda: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const userAcc = await program.account.userVoucher.fetch(userVoucher);
    expect(userAcc.remainingUnits).to.equal(totalUnits - 1);
  });
  
  it("4. Возврат оставшихся средств (Refund)", async () => {
    const buyerBefore = await provider.connection.getBalance(provider.wallet.publicKey);

    await program.methods
      .refundVoucher()
      .accounts({
        buyer: provider.wallet.publicKey,
        voucherConfig: voucherConfig,
        userVoucher: userVoucher,
        vaultPda: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await program.account.userVoucher.fetch(userVoucher);
      expect.fail("Аккаунт должен быть удален");
    } catch (e) {
      expect(e.message).to.contain("Account does not exist");
    }
  });
});