# CoinGyaan Studio — Architecture

Technical reference for the CoinGyaan Studio deploy system. This document describes the target on-chain architecture and how the current frontend is prepared for it. The Solidity contracts are not implemented yet. The current UI is locked; nothing here changes it.

Frontend integration point: everything on-chain is configured in `studio/js/studio-config.js` and accessed through the `CGDeploy` layer in `studio/js/studio.js`. When contract addresses are filled in, the frontend switches from the simulated flow to the real flow with no UI changes.

---

## 1. Wallet Flow

Connection uses injected wallets discovered through EIP-6963, with an EIP-1193 fallback.

1. User clicks Connect Wallet. The modal shows Rabby Wallet, MetaMask and Coinbase Wallet.
2. On selection, the frontend resolves the exact provider by EIP-6963 `rdns` (`io.rabby`, `io.metamask`, `com.coinbase.wallet`), falling back to `window.ethereum.providers` filtered by flag. MetaMask selection explicitly excludes providers flagged as Rabby or Coinbase so a different installed wallet cannot hijack the request.
3. Only the selected wallet is opened via `eth_requestAccounts`. If the wallet is not installed, an inline message and an Install button to the official site are shown.
4. On success the address is stored in the in-memory session and shown in the top bar.

Connected-state management (top bar):

- The Connect Wallet button is replaced by the connected address (for example `0xB5de...Fc59`) with a caret.
- Clicking it opens a dropdown: Connected Address, Copy Address, Change Wallet, Disconnect.
- Copy Address writes the full address to the clipboard.
- Change Wallet reopens the selection modal; picking a new wallet replaces the session.
- Disconnect clears the session and returns the UI to the Connect Wallet state.
- `accountsChanged` updates the address live; an empty account list is treated as a disconnect.

The wallet session is used consistently across Agent Studio and Smart Contract Studio. There is no persisted key material; the session is in-memory only.

---

## 2. Deployment Flow

Target end-to-end flow. Every deployment is routed through one central Deploy Manager. The Deploy Manager never deploys directly; it validates, collects the fee, and delegates to a factory.

```
CoinGyaan Studio (frontend)
        |
        v
User fills deployment form
        |
        v
Connected wallet signs a single transaction to the Deploy Manager
        |
        v
Deploy Manager
  - validates the request (network supported, not paused, params present)
  - reads current Studio Fee        (DeployManager.studioFee())
  - reads current Treasury Wallet   (DeployManager.treasury())
  - collects the Studio Fee -> Treasury
  - calls the appropriate Factory   (ERC20 / ERC721 / ERC1155 / ERC8004)
        |
        v
Factory deploys the contract and returns its address
        |
        v
Deploy Manager returns { contractAddress, txHash } to the frontend
        |
        v
Frontend creates the Public Profile and shows the result screen
```

Frontend preparation today: the `CGDeploy.deploy()` method is the single call site for a real deploy. While `deployManager.address` is `null`, `CGDeploy.isLive()` returns false and the UI keeps the current simulated deploy (progress animation and result screen). When addresses are configured, `deploy()` builds and sends the transaction to the Deploy Manager through the connected wallet.

---

## 3. Deploy Manager Contract

The core contract of CoinGyaan Studio. One instance per network. Responsibilities:

- Owner: single owner address with exclusive access to owner functions.
- Treasury Wallet: destination for collected fees. Readable by anyone, writable only by owner.
- Studio Fee: current fee, read at deploy time. Writable only by owner.
- Supported Networks: registry of enabled networks/chains.
- Factory Registry: mapping of contract type to factory address.
- Pause / Unpause: circuit breaker that blocks deploys while paused.

Read methods the frontend uses: `treasury()`, `studioFee()`, `isNetworkSupported()`, `paused()`. Deploy entrypoints: `deployERC20()`, `deployERC721()`, `deployERC1155()`, `deployERC8004()`.

---

## 4. Factory Contracts

The Deploy Manager delegates actual creation to dedicated factories so deploy logic per standard is isolated and independently upgradeable in the registry.

- ERC20 Factory
- ERC721 Factory
- ERC1155 Factory
- ERC8004 Factory

Each factory exposes a create function that the Deploy Manager calls, returning the newly deployed contract address. Factories are addressed through the Deploy Manager's Factory Registry, so a factory can be replaced by the owner without touching the Deploy Manager or the frontend.

---

## 5. Treasury Management

The Treasury Wallet receives the Studio Fee on every deploy. It is not hardcoded into frontend logic. The frontend reads it from `DeployManager.treasury()` (via `CGDeploy.getTreasury()`), with the config `defaultTreasury` used only as a fallback for display.

Default treasury: `0xB5de6f4caE654057f3E99B1A6a33FFbD13DFFc59`

The owner can change the treasury with `setTreasury()` without redeploying any contract; the next deploy reads the new value automatically.

---

## 6. Studio Fee Management

The Studio Fee is read at deploy time from `DeployManager.studioFee()` (via `CGDeploy.getStudioFee()`), never hardcoded. The connected wallet displays the full transaction cost (network gas plus Studio Fee) at signing time; the Studio UI does not restate fee amounts before wallet confirmation.

The owner can change the fee with `setStudioFee()` without redeploying any contract. Changes apply to subsequent deploys only.

---

## 7. Owner Functions

Owner-only, executed from an admin surface or directly against the contract. These never appear in the public Studio UI.

- `setTreasury(address)`
- `setStudioFee(uint256)`
- `transferOwnership(address)`
- `pause()`
- `unpause()`
- `setFactory(kind, address)`
- `setNetworkSupported(chainId, bool)`

Frontend guarantee: `studio-config.js` lists these for reference only. No code path in the public UI calls them, and no owner controls are rendered.

---

## 8. Public Profile Flow

After a successful deploy, the frontend creates a public profile from the returned data.

- Agent deploys (ERC8004) produce a public Agent Profile at `/agent/{name}`.
- Contract deploys produce a public Contract Profile at `/contract/{name}`.

Each profile shows name, contract address, owner, created date, chain, and verification status, with Share, BaseScan and Copy Address actions. In the target architecture the profile is generated from the Deploy Manager's returned `{ contractAddress, txHash }`; today it is generated from the simulated result.

---

## 9. Future Multi-chain Architecture

Networks are managed by the Deploy Manager and mirrored in `studio-config.js` under `networks`. The frontend renders the network selector from this list, so enabling a network later requires no UI redesign, only a config/registry update.

- Version 1: Base (active).
- Prepared: Ethereum, Arbitrum, Robinhood Chain, Arc Network (shown as Coming Soon).

Each network has its own Deploy Manager and factory set. Enabling a network means deploying its Deploy Manager, registering its factories, setting its `address` in config, and flipping its status to active.

---

## 10. Security Considerations

- Provider isolation: exact-provider resolution via EIP-6963 prevents an unintended wallet from being connected. MetaMask selection excludes Rabby/Coinbase-flagged providers.
- No key custody: the frontend never holds private keys or seed phrases; all signing happens in the user's wallet.
- Single signed transaction: the user signs one transaction to the Deploy Manager. Fee collection and factory delegation happen atomically on-chain, so the fee cannot be bypassed and a failed deploy should revert the fee transfer.
- Owner separation: owner functions are contract-level and never exposed in the public UI.
- Pausability: the Deploy Manager can be paused to halt all deploys during an incident.
- Fee and treasury integrity: both are read on-chain at deploy time, so the UI cannot misreport them and stale frontend values cannot affect a deploy.
- Input validation: deploy parameters are validated on-chain in the Deploy Manager and factories; frontend validation is convenience only and not a security boundary.
- Network allowlist: only networks marked supported by the Deploy Manager can receive deploys, independent of what the UI shows.
- Clipboard and links: install links open the official wallet sites in a new tab with `rel="noopener"`.

---

*Frontend files: `studio/js/studio-config.js` (addresses, networks, method names) and the `CGDeploy` layer in `studio/js/studio.js` (single integration point). Fill in addresses to go live. No UI changes required.*
