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
    base: { address: "0xD8a354cc0a55C092f96b4E3F582d866010ad8122", chainId: 84532 }
  },

  // Deploy Manager routes to dedicated factories. addresses null until deployed.
  factories: {
    base: {
      ERC20:   "0x11e0530c0BbC06f382f1B8b76e8e24d3ed115d20",
      ERC721:  "0x182C15D4bCd577aabD84f9870B4Db7a8a02ea3BA",
      ERC1155: "0x1E8Ba4C71D51a14073504929BE193aB17BC50F14",
      ERC8004: "0x4Ad8aeEF3cFFAb4e67Cb65Ca921B0B4BE6Fa49A5",
      B20:     null
    }
  },

  // Default treasury (config fallback only; on-chain DeployManager.treasury() is authoritative).
  defaultTreasury: "0xB5de6f4caE654057f3E99B1A6a33FFbD13DFFc59",

  // Supported networks. V1: Base active. Others prepared, enabled later via the Deploy Manager.
  networks: [
    { id: "base",      label: "Base Sepolia",    chainId: 84532, status: "active" },
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
  ],

  // ---- On-chain integration (used by CGDeploy once addresses are set) ----
  rpc: {
    base:        "https://mainnet.base.org",
    baseSepolia: "https://sepolia.base.org"
  },

  // Minimal DeployManager ABI the frontend calls (ethers human-readable ABI).
  deployManagerAbi: [
    "function deploy(bytes32 kind, bytes params) payable returns (address)",
    "function studioFee() view returns (uint256)",
    "function treasury() view returns (address)",
    "function quote() view returns (uint256 fee, address treasury)",
    "function paused() view returns (bool)",
    "event Deployed(bytes32 indexed kind, address indexed deployer, address indexed contractAddress, uint256 fee)"
  ],

  // ABI-encode tuples per kind. Must match the factories' abi.decode order exactly.
  paramSchema: {
    ERC20:   ["string","string","uint256","uint8"],
    ERC721:  ["string","string","string","uint256"],
    ERC1155: ["string","string"],
    ERC8004: ["string"],
    B20:     ["string","string","uint256","uint8"]
  }
};
