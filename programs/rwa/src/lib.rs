use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("ADQjPmwcq7mTgW4FHuopimbKPzQrpcikAkpsNHT18p7K");

#[program]
pub mod sol_voucher {
    use super::*;

    pub fn initialize_voucher(
        ctx: Context<InitializeVoucher>,
        id: String, 
        name: String,
        description: String,
        image_url: String,
        document_hash: String,
        document_url: String,
        unit_price: u64,
        total_units: u16,
        expiry_date: i64,
    ) -> Result<()> {
        let voucher_config = &mut ctx.accounts.voucher_config;
        voucher_config.authority = ctx.accounts.authority.key();
        voucher_config.id = id;
        voucher_config.name = name;
        voucher_config.description = description;
        voucher_config.image_url = image_url;
        voucher_config.document_hash = document_hash;
        voucher_config.document_url = document_url;
        voucher_config.unit_price = unit_price;
        voucher_config.total_units = total_units;
        voucher_config.remaining_units = total_units; 
        voucher_config.expiry_date = expiry_date;
        voucher_config.is_active = true;
        voucher_config.vault_pda = ctx.accounts.vault_pda.key();
        voucher_config.bump = ctx.bumps.voucher_config;
        
        msg!("RWA Series Created with ID: {}", voucher_config.id);
        Ok(())
    }

    pub fn purchase_voucher(ctx: Context<PurchaseVoucher>, amount_to_buy: u16) -> Result<()> {
        let voucher_config = &mut ctx.accounts.voucher_config;
        let clock = Clock::get()?;

        require!(voucher_config.is_active, VoucherError::ContractPaused);
        require!(clock.unix_timestamp < voucher_config.expiry_date, VoucherError::VoucherExpired);
        require!(voucher_config.remaining_units >= amount_to_buy, VoucherError::NotEnoughUnitsInSeries);

        let total_cost = voucher_config.unit_price.checked_mul(amount_to_buy as u64)
            .ok_or(VoucherError::MathOverflow)?;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.vault_pda.to_account_info(),
            },
        );
        transfer(cpi_ctx, total_cost)?;

        voucher_config.remaining_units -= amount_to_buy;
        
        let user_voucher = &mut ctx.accounts.user_voucher;
        user_voucher.owner = ctx.accounts.buyer.key();
        user_voucher.config = voucher_config.key();
        user_voucher.remaining_units += amount_to_buy;

        msg!("Purchased {} units.", amount_to_buy);
        Ok(())
    }

    pub fn redeem_unit(ctx: Context<RedeemUnit>, _owner_pubkey: Pubkey, units_to_redeem: u16) -> Result<()> {
        let user_voucher = &mut ctx.accounts.user_voucher;
        require!(user_voucher.remaining_units >= units_to_redeem, VoucherError::NoUnitsLeft);
        user_voucher.remaining_units -= units_to_redeem;

        let total_payout = ctx.accounts.voucher_config.unit_price.checked_mul(units_to_redeem as u64)
            .ok_or(VoucherError::MathOverflow)?;

        let config_key = ctx.accounts.voucher_config.key();
        let seeds = &[b"vault".as_ref(), config_key.as_ref(), &[ctx.bumps.vault_pda]];
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_pda.to_account_info(),
                to: ctx.accounts.authority.to_account_info(),
            },
            signer_seeds
        );
        transfer(cpi_ctx, total_payout)?;

        if user_voucher.remaining_units == 0 {
            let owner_info = ctx.accounts.owner_account.to_account_info();
            let voucher_info = ctx.accounts.user_voucher.to_account_info();
            let dest_starting_lamports = owner_info.lamports();
            **owner_info.lamports.borrow_mut() = dest_starting_lamports.checked_add(voucher_info.lamports()).unwrap();
            **voucher_info.lamports.borrow_mut() = 0;
            let mut data = voucher_info.data.borrow_mut();
            data.fill(0);
        }
        Ok(())
    }

    pub fn refund_and_close(ctx: Context<RefundVoucher>) -> Result<()> {
        let remaining_units = ctx.accounts.user_voucher.remaining_units;
        let refund_amount = (remaining_units as u64).checked_mul(ctx.accounts.voucher_config.unit_price).ok_or(VoucherError::MathOverflow)?;
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

        let voucher_config = &mut ctx.accounts.voucher_config;
        voucher_config.remaining_units += remaining_units;
        Ok(())
    }

    pub fn toggle_active(ctx: Context<UpdateConfig>, status: bool) -> Result<()> {
        ctx.accounts.voucher_config.is_active = status;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(id: String, name: String)] 
pub struct InitializeVoucher<'info> {
    #[account(
        init, 
        payer = authority, 
        space = 8 + 32 + 44 + 44 + 512 + 204 + 68 + 204 + 8 + 2 + 2 + 8 + 1 + 32 + 1,
        seeds = [b"config", id.as_bytes()], 
        bump
    )]
    pub voucher_config: Account<'info, VoucherConfig>,
    #[account(mut, seeds = [b"vault", voucher_config.key().as_ref()], bump)]
    /// CHECK: PDA Vault
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
#[instruction(owner_pubkey: Pubkey)] 
pub struct RedeemUnit<'info> {
    #[account(mut, constraint = voucher_config.authority == authority.key())]
    pub authority: Signer<'info>, 
    #[account(mut)]
    pub voucher_config: Account<'info, VoucherConfig>,
    #[account(mut, seeds = [b"user_voucher", owner_pubkey.as_ref(), voucher_config.key().as_ref()], bump)]
    pub user_voucher: Account<'info, UserVoucher>,
    #[account(mut, address = user_voucher.owner)]
    /// CHECK: Recipient
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
    #[account(mut)]
    pub voucher_config: Account<'info, VoucherConfig>,
    #[account(mut, close = buyer, seeds = [b"user_voucher", buyer.key().as_ref(), voucher_config.key().as_ref()], bump)]
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
    pub id: String,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub document_hash: String,
    pub document_url: String,
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
    #[msg("No units left.")] NoUnitsLeft,
    #[msg("Sold out.")] NotEnoughUnitsInSeries,
    #[msg("Expired.")] VoucherExpired,
    #[msg("Paused.")] ContractPaused,
    #[msg("Nothing to refund.")] NothingToRefund,
    #[msg("Math overflow.")] MathOverflow,
}