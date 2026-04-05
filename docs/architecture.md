Architecture

System Overview

SolV sits as a bridge between Real-World Assets (RWA) and Solana's liquidity. The protocol automates voucher issuance, payment escrow, and secure redemption, replacing slow Web2 settlement layers with sub-second blockchain finality.
```
┌─────────────┐      ┌──────────────────────┐      ┌──────────────────┐
│   Merchant  │      │       SolV App       │      │  Solana Program  │
│ (Issuance)  │────▶ │   (Business Dash)    │────▶ │  (Voucher State) │
└─────────────┘      └──────────┬───────────┘      └─────────┬────────┘
                                │                            │
┌─────────────┐      ┌──────────▼───────────┐      ┌─────────▼────────┐
│    User     │      │   Public Gateway     │      │   Vault & PDA    │
│  (Buyer)    │────▶ │   (No-auth View)     │────▶ │   (Fund Escrow)  │
└─────────────┘      └──────────────────────┘      └──────────────────┘
```

Components

Public-First Gateway

A specialized frontend layer that allows users to browse available vouchers without connecting a wallet. It uses Read-Only RPC calls to fetch current supply, pricing, and merchant data directly from the ledger, maximizing conversion.

Privy Auth Wrapper

An integration layer providing a seamless social login experience. It abstracts away private key management by creating an "embedded wallet," which signs voucher purchase transactions without requiring the user to leave the app or handle seed phrases.

SolV Anchor Program

The core Rust-based smart contract that governs:

Merchant Validation: Verifies authorization for asset tokenization.

Escrow Management: Securely holds SOL in a program-controlled Vault until redemption.

Atomic Redemption: Ensures vouchers are "burned" or marked as used only when the merchant confirms service delivery.

UserVoucher PDA

Each purchased voucher is a unique Program Derived Address (PDA). This account stores critical metadata: expiration date, redemption status, and owner identity, ensuring true asset ownership for the user.

Analytics Engine

A monitoring module that tracks voucher circulation and redemption velocity. This data helps businesses optimize their inventory and detect early signs of customer engagement shifts using real-time on-chain data.

Performance & Scalability

| Feature | Latency | SolV Protocol (Solana) |
|--------|---------|-------------------------|
| Settlement Time  | 2–3 business days | < 1 second |
| Transaction Fee | 3.5% + $0.30 | **~$0.00025** |
| Transparency | Private Database | Public Ledger |
| Refund Logic | Manual / Multi-day | Atomic / Instant |

For implementation details, see programs/solv/src/lib.rs.