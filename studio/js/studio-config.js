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
   and DeployManager.quote(). The values here are only a
   config default/fallback, never the source of truth.
   ============================================================ */
window.CG_STUDIO_CONFIG = {

  // One central Deploy Manager per network. address stays null until deployed.
  deployManager: {
    base: { address: "0x4E9B4390Ed7e816935Ad159EB3080D7864aA3529", chainId: 84532 }
  },

  // Deploy Manager routes to dedicated factories. addresses null until deployed.
  factories: {
    base: {
      ERC20:   "0xedd2cC6a49A49483162b5fECb8bdBe03b31B80Aa",
      ERC721:  "0x0CCE251cc6745B04460FbC4CB8dC842e307813E2",
      ERC1155: "0x183aD7d31372861d05129bDFAFcfFbF97F6e9b22",
      ERC8004: "0xf2e4039C95410cee87adf62bBa495F7419719bCB",
      B20:     null
    }
  },

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

  // IPFS metadata service (Cloudflare Worker). Empty = deploys carry blank metadata.
  ipfs: {
    endpoint: ""   // e.g. "https://coingyaan-ipfs.<subdomain>.workers.dev/upload"
  },

  // Input limits enforced before a deploy is signed.
  limits: {
    erc20:  { minSupply: 1, maxSupply: "1000000000000000", minDecimals: 0, maxDecimals: 18 },
    erc721: { minMaxSupply: 0, maxMaxSupply: 10000000 }
  },

  // ---- FeeManager: single source of truth for all fees + treasury (no addresses hardcoded here) ----
  // First block of the V2 stack. Event scans start here; scanning from 0 is rejected by public RPCs.
  deployBlock: 44166000,

  feeManager: {
    address: "0x1D1a8225793A318f5a00527A654FBD34c01425E1",
    chainId: 84532
  },
  feeManagerAbi: [
    "function feeUsdOf(bytes32 action) view returns (uint256)",
    "function isAction(bytes32 action) view returns (bool)",
    "function treasury() view returns (address dev, address mkt, uint16 bps)"
  ],
  // action keys the frontend hashes with keccak256 to read/pay fees
  feeActions: { GM:"GM", DEPLOY_AGENT:"DEPLOY_AGENT", DEPLOY_CONTRACT:"DEPLOY_CONTRACT" },

  // ---- On-chain integration (used by CGDeploy once addresses are set) ----
  rpc: {
    base:               "https://mainnet.base.org",
    baseSepolia:        "https://sepolia.base.org",
    robinhood:          "https://rpc.mainnet.chain.robinhood.com",
    robinhoodTestnet:   "https://rpc.testnet.chain.robinhood.com"
  },

  // Minimal DeployManager ABI the frontend calls (ethers human-readable ABI).
  deployManagerAbi: [
    "function quote(bytes32 action) view returns (uint256 weiRequired, uint256 feeUsd)",
    "function deploy(bytes32 kind, bytes params) payable returns (address)",
    "function pay(bytes32 action) payable",
    "function paused() view returns (bool)",
    "event ContractDeployed(bytes32 indexed kind, address indexed deployer, address contractAddress)",
    "event AgentDeployed(address indexed deployer, address contractAddress)",
    "event GMCompleted(address indexed builder, uint256 amount)",
    "event FeeCollected(bytes32 indexed action, address indexed payer, uint256 amount)",
    "event RevenueDistributed(bytes32 indexed action, address dev, uint256 devAmount, address mkt, uint256 mktAmount)"
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
