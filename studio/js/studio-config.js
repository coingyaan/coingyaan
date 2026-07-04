/* ============================================================
   CoinGyaan Studio: Deploy Architecture Config
   ------------------------------------------------------------
   Single source of truth for the on-chain deploy layer.
   The frontend reads everything from here so nothing is
   hardcoded into UI logic. When the Deploy Manager and Factory
   contracts are deployed, fill in the addresses below and the
   frontend switches from the simulated flow to the real one
   with no UI changes.

   NOTE: the authoritative Treasury Wallet and Studio Fee live
   ON-CHAIN and are read at runtime via DeployManager.treasury()
   and DeployManager.studioFee(). The values here are only a
   config default/fallback, never the source of truth.
   ============================================================ */
window.CG_STUDIO_CONFIG = {

  // One central Deploy Manager per network. address stays null until deployed.
  deployManager: {
    base: { address: null, chainId: 8453 }
  },

  // Deploy Manager routes to dedicated factories. addresses null until deployed.
  factories: {
    base: {
      ERC20:   null,
      ERC721:  null,
      ERC1155: null,
      ERC8004: null
    }
  },

  // Default treasury (config fallback only; on-chain DeployManager.treasury() is authoritative).
  defaultTreasury: "0xB5de6f4caE654057f3E99B1A6a33FFbD13DFFc59",

  // Supported networks. V1: Base active. Others prepared, enabled later via the Deploy Manager.
  networks: [
    { id: "base",      label: "Base",            chainId: 8453,  status: "active" },
    { id: "ethereum",  label: "Ethereum",        chainId: 1,     status: "coming-soon" },
    { id: "arbitrum",  label: "Arbitrum",        chainId: 42161, status: "coming-soon" },
    { id: "robinhood", label: "Robinhood Chain", chainId: null,  status: "coming-soon" },
    { id: "arc",       label: "Arc Network",     chainId: null,  status: "coming-soon" }
  ],

  // Read-only view methods on the Deploy Manager the frontend may call.
  reads: {
    treasury:           "treasury",
    studioFee:          "studioFee",
    isNetworkSupported: "isNetworkSupported",
    paused:             "paused"
  },

  // Deploy Manager entrypoints the frontend calls through the connected wallet.
  deployMethods: {
    ERC20:   "deployERC20",
    ERC721:  "deployERC721",
    ERC1155: "deployERC1155",
    ERC8004: "deployERC8004"
  },

  // Owner-only functions. Listed for admin tooling ONLY. Never surfaced in the public UI.
  ownerFunctions: [
    "setTreasury",
    "setStudioFee",
    "transferOwnership",
    "pause",
    "unpause",
    "setFactory",
    "setNetworkSupported"
  ]
};
