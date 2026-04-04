use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};


declare_id!("ADQjPmwcq7mTgW4FHuopimbKPzQrpcikAkpsNHT18p7K");

#[program]
pub mod sol_voucher {
    use super::*;

    /// Инициализация новой серии RWA-ваучеров бизнесом
    pub fn initialize_voucher(
        ctx: Context<InitializeVoucher>,
        name: String,
        description: String,
        image_url: String,
        document_hash: String, // Хеш юридического документа (Oracle Proof)
        unit_price: u64,
        total_units: u16,
        expiry_date: i64,      //окончания действия
    ) -> Result<()> {
        let voucher_config = &mut ctx.accounts.voucher_config;
        voucher_config.authority = ctx.accounts.authority.key();
        voucher_config.name = name;
        voucher_config.description = description;
        voucher_config.image_url = image_url;
        voucher_config.document_hash = document_hash;
        voucher_config.unit_price = unit_price;
        voucher_config.total_units = total_units;
        voucher_config.remaining_units = total_units; 
        voucher_config.expiry_date = expiry_date;
        voucher_config.is_active = true;
        voucher_config.vault_pda = ctx.accounts.vault_pda.key();
        voucher_config.bump = ctx.bumps.voucher_config;
        
        msg!("RWA Series Created. Hash: {}", voucher_config.document_hash);
        Ok(())
    }

    /// Покупка юнитов пользователем. Деньги блокируются в Vault PDA.
    pub fn purchase_voucher(ctx: Context<PurchaseVoucher>, amount_to_buy: u16) -> Result<()> {
        let voucher_config = &mut ctx.accounts.voucher_config;
        let clock = Clock::get()?;

        // Валидация состояния
        require!(voucher_config.is_active, VoucherError::ContractPaused);
        require!(clock.unix_timestamp < voucher_config.expiry_date, VoucherError::VoucherExpired);
        require!(voucher_config.remaining_units >= amount_to_buy, VoucherError::NotEnoughUnitsInSeries);

        let total_cost = voucher_config.unit_price.checked_mul(amount_to_buy as u64)
            .ok_or(VoucherError::MathOverflow)?;

        // Перевод SOL от покупателя в защищенное хранилище (Vault)
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.vault_pda.to_account_info(),
            },
        );
        transfer(cpi_ctx, total_cost)?;

        // Обновление состояния
        voucher_config.remaining_units -= amount_to_buy;
        let user_voucher = &mut ctx.accounts.user_voucher;
        user_voucher.owner = ctx.accounts.buyer.key();
        user_voucher.config = voucher_config.key();
        user_voucher.remaining_units += amount_to_buy;

        msg!("Purchased {} units. Vault updated.", amount_to_buy);
        Ok(())
    }

    /// Погашение юнитов (Скан QR-кода). Деньги уходят бизнесу.
    /// Погашение юнитов (Скан QR-кода). Деньги уходят бизнесу.
    pub fn redeem_unit(ctx: Context<RedeemUnit>, owner_pubkey: Pubkey, units_to_redeem: u16) -> Result<()> {
        let user_voucher = &mut ctx.accounts.user_voucher;
        
        // 1. Проверки
        require!(user_voucher.remaining_units >= units_to_redeem, VoucherError::NoUnitsLeft);
        
        // 2. Списание юнитов
        user_voucher.remaining_units -= units_to_redeem;

        // 3. Расчет выплаты бизнесу
        let total_payout = ctx.accounts.voucher_config.unit_price.checked_mul(units_to_redeem as u64)
            .ok_or(VoucherError::MathOverflow)?;

        let config_key = ctx.accounts.voucher_config.key();
        let seeds = &[
            b"vault".as_ref(),
            config_key.as_ref(),
            &[ctx.bumps.vault_pda],
        ];
        let signer_seeds = &[&seeds[..]];

        // 4. Перевод SOL из Vault на кошелек бизнеса (Authority)
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_pda.to_account_info(),
                to: ctx.accounts.authority.to_account_info(),
            },
            signer_seeds
        );
        transfer(cpi_ctx, total_payout)?;

        // 5. ФИКС: Если юниты закончились, закрываем аккаунт и возвращаем Rent владельцу
        if user_voucher.remaining_units == 0 {
            let owner_info = ctx.accounts.owner_account.to_account_info();
            let voucher_info = ctx.accounts.user_voucher.to_account_info();
            
            let owner_starting_lamports = owner_info.lamports();
            **owner_info.lamports.borrow_mut() = owner_starting_lamports
                .checked_add(voucher_info.lamports())
                .unwrap();
            **voucher_info.lamports.borrow_mut() = 0;
            
            msg!("Voucher fully redeemed and account closed. Rent returned to owner.");
        }

        msg!("Redeemed {} units. Payout sent to authority.", units_to_redeem);
        Ok(())
    }

    /// Экстренная остановка/запуск продаж
    pub fn toggle_active(ctx: Context<UpdateConfig>, status: bool) -> Result<()> {
        ctx.accounts.voucher_config.is_active = status;
        msg!("Voucher active status set to: {}", status);
        Ok(())
    }

    /// Полный возврат средств и закрытие аккаунта пользователя
    pub fn refund_and_close(ctx: Context<RefundVoucher>) -> Result<()> {
        let user_voucher = &ctx.accounts.user_voucher;
        let refund_amount = (user_voucher.remaining_units as u64)
            .checked_mul(ctx.accounts.voucher_config.unit_price)
            .ok_or(VoucherError::MathOverflow)?;
        
        require!(refund_amount > 0, VoucherError::NothingToRefund);

        let config_key = ctx.accounts.voucher_config.key();
        let seeds = &[b"vault".as_ref(), config_key.as_ref(), &[ctx.bumps.vault_pda]];
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_pda.to_account_info(),
                to: ctx.accounts.buyer.to_account_info(),
            },
            signer_seeds
        );
        transfer(cpi_ctx, refund_amount)?;

        Ok(())
    }
}

// --- Структуры данных ---

#[derive(Accounts)]
#[instruction(name: String, description: String, image_url: String, document_hash: String)]
pub struct InitializeVoucher<'info> {
    #[account(
        init, 
        payer = authority, 
        // 8(disc) + 32(pubkey) + (4+40 name) + (4+200 desc) + (4+200 img) + (4+64 hash) + 8(price) + 2(total) + 2(rem) + 8(expiry) + 1(bool) + 32(vault) + 1(bump)
        space = 8 + 32 + 44 + 204 + 204 + 68 + 8 + 2 + 2 + 8 + 1 + 32 + 1,
        seeds = [b"config", name.as_bytes()], 
        bump
    )]
    pub voucher_config: Account<'info, VoucherConfig>,

    #[account(
        mut,
        seeds = [b"vault", voucher_config.key().as_ref()],
        bump
    )]
    /// CHECK: Системный PDA для хранения SOL
    pub vault_pda: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseVoucher<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub voucher_config: Account<'info, VoucherConfig>,
    #[account(
        init_if_needed, 
        payer = buyer, 
        space = 8 + 32 + 32 + 2,
        seeds = [b"user_voucher", buyer.key().as_ref(), voucher_config.key().as_ref()],
        bump
    )]
    pub user_voucher: Account<'info, UserVoucher>,
    #[account(mut, seeds = [b"vault", voucher_config.key().as_ref()], bump)]
    /// CHECK: PDA Vault
    pub vault_pda: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(owner_pubkey: Pubkey)] // Получаем адрес владельца из аргументов вызова
pub struct RedeemUnit<'info> {
    #[account(mut, constraint = voucher_config.authority == authority.key())]
    pub authority: Signer<'info>, 

    #[account(mut)]
    pub voucher_config: Account<'info, VoucherConfig>,

    #[account(
        mut, 
        seeds = [b"user_voucher", owner_pubkey.as_ref(), voucher_config.key().as_ref()], 
        bump
    )]
    pub user_voucher: Account<'info, UserVoucher>,

    /// CHECK: Аккаунт владельца ваучера, сюда вернется Rent при закрытии
    #[account(mut, address = user_voucher.owner)]
    pub owner_account: AccountInfo<'info>,

    #[account(mut, seeds = [b"vault", voucher_config.key().as_ref()], bump)]
    /// CHECK: PDA Vault
    pub vault_pda: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundVoucher<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub voucher_config: Account<'info, VoucherConfig>,
    #[account(
        mut, close = buyer, 
        seeds = [b"user_voucher", buyer.key().as_ref(), voucher_config.key().as_ref()],
        bump
    )]
    pub user_voucher: Account<'info, UserVoucher>,
    #[account(mut, seeds = [b"vault", voucher_config.key().as_ref()], bump)]
    /// CHECK: PDA Vault
    pub vault_pda: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut, has_one = authority)]
    pub voucher_config: Account<'info, VoucherConfig>,
    pub authority: Signer<'info>,
}

#[account]
pub struct VoucherConfig {
    pub authority: Pubkey,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub document_hash: String,
    pub unit_price: u64,
    pub total_units: u16,     
    pub remaining_units: u16, 
    pub expiry_date: i64,
    pub is_active: bool,
    pub vault_pda: Pubkey,
    pub bump: u8,
}

#[account]
pub struct UserVoucher {
    pub owner: Pubkey,
    pub config: Pubkey,
    pub remaining_units: u16,
}

#[error_code]
pub enum VoucherError {
    #[msg("Units not enough.")] NoUnitsLeft,
    #[msg("Series sold out.")] NotEnoughUnitsInSeries,
    #[msg("Voucher expired.")] VoucherExpired,
    #[msg("Contract paused.")] ContractPaused,
    #[msg("Nothing to refund.")] NothingToRefund,
    #[msg("Math overflow.")] MathOverflow,
}