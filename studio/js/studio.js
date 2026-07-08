(function(){
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ACC = ["#60A5FA","#A78BFA","#22D3EE","#34D399"];
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  /* ===== background network ===== */
  const bg = document.getElementById("bg-canvas"), bctx = bg.getContext("2d");
  let bw, bh, nodes=[], pulses=[]; const MAXD=150;
  function sizeBg(){ bw=innerWidth; bh=innerHeight; bg.width=bw*dpr; bg.height=bh*dpr; bg.style.width=bw+"px"; bg.style.height=bh+"px"; bctx.setTransform(dpr,0,0,dpr,0,0); }
  function buildNodes(){ const n=Math.min(110,Math.round(bw*bh/17000)); nodes=[]; for(let i=0;i<n;i++) nodes.push({x:Math.random()*bw,y:Math.random()*bh,vx:(Math.random()-.5)*.15,vy:(Math.random()-.5)*.15,r:Math.random()*1.3+.5,c:ACC[(Math.random()*ACC.length)|0]}); }
  function spawnPulse(){ if(pulses.length>14)return; const a=(Math.random()*nodes.length)|0; let b=-1,bd=1e9; for(let j=0;j<nodes.length;j++){ if(j===a)continue; const d=Math.hypot(nodes[a].x-nodes[j].x,nodes[a].y-nodes[j].y); if(d<170&&d<bd){bd=d;b=j;} } if(b>=0) pulses.push({a,b,t:0,sp:.007+Math.random()*.01,c:nodes[a].c}); }
  function drawBg(){ bctx.clearRect(0,0,bw,bh);
    for(const n of nodes){ n.x+=n.vx;n.y+=n.vy; if(n.x<0||n.x>bw)n.vx*=-1; if(n.y<0||n.y>bh)n.vy*=-1; }
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){ const d=Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y); if(d<MAXD){ bctx.strokeStyle="rgba(148,163,184,"+(1-d/MAXD)*.12+")"; bctx.lineWidth=.6; bctx.beginPath(); bctx.moveTo(nodes[i].x,nodes[i].y); bctx.lineTo(nodes[j].x,nodes[j].y); bctx.stroke(); } }
    for(const n of nodes){ bctx.fillStyle=n.c+"55"; bctx.beginPath(); bctx.arc(n.x,n.y,n.r,0,7); bctx.fill(); }
    for(let k=pulses.length-1;k>=0;k--){ const p=pulses[k]; p.t+=p.sp; const A=nodes[p.a],B=nodes[p.b]; if(p.t>=1||!A||!B){pulses.splice(k,1);continue;} const x=A.x+(B.x-A.x)*p.t,y=A.y+(B.y-A.y)*p.t; const g=bctx.createRadialGradient(x,y,0,x,y,6); g.addColorStop(0,p.c); g.addColorStop(1,"transparent"); bctx.fillStyle=g; bctx.beginPath(); bctx.arc(x,y,6,0,7); bctx.fill(); bctx.fillStyle=p.c; bctx.beginPath(); bctx.arc(x,y,1.5,0,7); bctx.fill(); }
    if(!reduce) requestAnimationFrame(drawBg);
  }
  sizeBg(); buildNodes(); if(reduce){ drawBg=function(){}; } drawBg(); if(!reduce) setInterval(spawnPulse,400);

  /* ===== reusable core ===== */
  function initCore(canvas){
    const ctx=canvas.getContext("2d"); let w,h,pts=[],ang=0,breath=0;
    function size(){ const r=canvas.getBoundingClientRect(); w=r.width;h=r.height; if(!w||!h)return; canvas.width=w*dpr; canvas.height=h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
    function build(){ pts=[]; const N=150,off=2/N,inc=Math.PI*(3-Math.sqrt(5)); for(let i=0;i<N;i++){ const y=i*off-1+off/2,rr=Math.sqrt(1-y*y),phi=i*inc; pts.push({x:Math.cos(phi)*rr,y:y,z:Math.sin(phi)*rr,c:ACC[(Math.random()*ACC.length)|0]}); } }
    function draw(){
      if(canvas.offsetParent!==null && w){
        const cx=w/2,cy=h/2,R=Math.min(w,h)*.4; ang+=.0032; breath+=.02;
        const cosA=Math.cos(ang),sinA=Math.sin(ang),ct=Math.cos(.42),st=Math.sin(.42); ctx.clearRect(0,0,w,h);
        const proj=[]; for(const p of pts){ let x=p.x*cosA-p.z*sinA,z=p.x*sinA+p.z*cosA,y=p.y*ct-z*st; z=p.y*st+z*ct; proj.push({sx:cx+x*R,sy:cy+y*R,z,c:p.c}); }
        const pulse=1+Math.sin(breath)*.06; const g=ctx.createRadialGradient(cx,cy,0,cx,cy,R*.95*pulse); g.addColorStop(0,"rgba(96,165,250,"+(.2+Math.sin(breath)*.05)+")"); g.addColorStop(.5,"rgba(167,139,250,.06)"); g.addColorStop(1,"transparent"); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,R*.95*pulse,0,7); ctx.fill();
        for(let i=0;i<proj.length;i++) for(let j=i+1;j<proj.length;j++){ const d=Math.hypot(proj[i].sx-proj[j].sx,proj[i].sy-proj[j].sy); if(d<R*.34){ const dp=(proj[i].z+proj[j].z)/2,o=(1-d/(R*.34))*(.1+(dp+1)*.06); ctx.strokeStyle="rgba(148,180,240,"+o.toFixed(3)+")"; ctx.lineWidth=.5; ctx.beginPath(); ctx.moveTo(proj[i].sx,proj[i].sy); ctx.lineTo(proj[j].sx,proj[j].sy); ctx.stroke(); } }
        const cr=9*pulse; const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,cr*1.6); cg.addColorStop(0,"#eff6ff"); cg.addColorStop(.6,"rgba(147,197,253,.5)"); cg.addColorStop(1,"transparent"); ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,cr*1.6,0,7); ctx.fill();
        proj.sort((a,b)=>a.z-b.z); for(const p of proj){ const depth=(p.z+1)/2; ctx.globalAlpha=.25+depth*.75; ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.sx,p.sy,.7+depth*2,0,7); ctx.fill(); } ctx.globalAlpha=1;
      }
      if(!reduce) requestAnimationFrame(draw);
    }
    size(); build(); draw(); window.addEventListener("resize",()=>setTimeout(size,150));
  }
  document.querySelectorAll(".core-canvas").forEach(initCore);

  /* ===== landing nav frost + reveals ===== */
  const lnav=document.getElementById("lnav");
  addEventListener("scroll",()=>{ if(scrollY>20){ lnav.style.background="rgba(5,8,22,.72)"; lnav.style.backdropFilter="blur(16px)"; lnav.style.borderBottom="1px solid rgba(255,255,255,.06)"; } else { lnav.style.background="transparent"; lnav.style.backdropFilter="none"; lnav.style.borderBottom="1px solid transparent"; } });
  const io=new IntersectionObserver((es)=>{ es.forEach((e,i)=>{ if(e.isIntersecting){ setTimeout(()=>e.target.classList.add("in"),(i%6)*70); io.unobserve(e.target);} }); },{threshold:.12});
  document.querySelectorAll("#landing .reveal").forEach(el=>io.observe(el));

  if(window.lucide) lucide.createIcons();

  /* ============ APP STATE / NAV ============ */
  const CRUMBS={ "agent-home":"Agent Studio","agent-create":"Create Agent","agent-deploy":"Deploy Agent","agent-import":"Import Agent","agent-verify":"CG Verification","contract-home":"Smart Contract Studio","contract-deploy":"Deploy Contract","profile":"Public Profile","explorer":"Intelligence Explorer","docs":"Documentation" };
  const NAVGROUP={ "agent-home":"agent-home","agent-create":"agent-home","agent-deploy":"agent-home","agent-import":"agent-home","agent-verify":"agent-home","contract-home":"contract-home","contract-deploy":"contract-home","profile":"agent-home","explorer":"explorer","docs":"docs" };
  let wallet=null;

  window.scrollTop=()=>scrollTo({top:0,behavior:"smooth"});
  window.launchStudio=(view)=>{
    document.getElementById("landing").style.display="none";
    document.getElementById("studio").style.display="block";
    scrollTo(0,0); showView(view||"agent-home");
  };
  window.goHome=()=>{
    document.getElementById("studio").style.display="none";
    document.getElementById("landing").style.display="block";
    scrollTo(0,0);
  };
  window.showView=(id)=>{
    document.querySelectorAll("#canvas .view").forEach(v=>v.classList.remove("active"));
    const v=document.getElementById(id); if(!v)return; v.classList.add("active");
    document.getElementById("canvas").scrollTo(0,0);
    document.getElementById("crumb").textContent=CRUMBS[id]||"";
    const g=NAVGROUP[id]; document.querySelectorAll(".side-link").forEach(l=>l.classList.toggle("active",l.dataset.nav===g));
    // stagger reveals inside view
    v.querySelectorAll(".reveal").forEach((el,i)=>{ el.classList.remove("in"); setTimeout(()=>el.classList.add("in"),80+i*60); });
    if(id==="agent-deploy") renderAgentDeploy();
    if(id==="contract-home") renderContractTypes();
    lucide.createIcons();
  };

  /* ===== wallet ===== */
  function randAddr(){ const h="0123456789abcdef"; let s="0x"; for(let i=0;i<4;i++)s+=h[(Math.random()*16)|0]; s+="..."; for(let i=0;i<4;i++)s+=h[(Math.random()*16)|0]; return s; }
  const WALLETS={
    rabby:{name:"Rabby Wallet",rdns:"io.rabby",flag:"isRabby",install:"https://rabby.io/"},
    metamask:{name:"MetaMask",rdns:"io.metamask",flag:"isMetaMask",install:"https://metamask.io/download/"},
    coinbase:{name:"Coinbase Wallet",rdns:"com.coinbase.wallet",flag:"isCoinbaseWallet",install:"https://www.coinbase.com/wallet/downloads"}
  };
  const announcedProviders={};
  window.addEventListener("eip6963:announceProvider",function(e){ const d=e&&e.detail; if(d&&d.info&&d.provider) announcedProviders[d.info.rdns]=d; });
  function requestProviders(){ try{ window.dispatchEvent(new Event("eip6963:requestProvider")); }catch(e){} }
  requestProviders();
  function shortAddr(a){ return (a&&a.length>10)?a.slice(0,6)+"..."+a.slice(-4):a; }
  function findProvider(key){
    const w=WALLETS[key];
    if(announcedProviders[w.rdns]) return announcedProviders[w.rdns].provider;
    const eth=window.ethereum;
    if(eth){
      if(Array.isArray(eth.providers)){
        let m=eth.providers.filter(function(p){ return p&&p[w.flag]; });
        if(key==="metamask") m=m.filter(function(p){ return !p.isRabby&&!p.isCoinbaseWallet; });
        if(m.length) return m[0];
      }
      if(eth[w.flag]){
        if(key==="metamask"&&(eth.isRabby||eth.isCoinbaseWallet)) return null;
        return eth;
      }
    }
    if(key==="coinbase"&&window.coinbaseWalletExtension) return window.coinbaseWalletExtension;
    return null;
  }
  function showWalletNotInstalled(key){
    const w=WALLETS[key]; const box=document.getElementById("wallet-msg"); if(!box) return;
    box.style.display="block";
    box.innerHTML='<div class="rounded-xl p-4" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25)">'
      +'<p class="text-[13.5px] font-medium mb-1">'+w.name+' is not installed</p>'
      +'<p class="text-[12.5px] text-muted mb-3">Install '+w.name+' to continue, then reconnect.</p>'
      +'<a href="'+w.install+'" target="_blank" rel="noopener" class="btn-primary inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-full">Install '+w.name+' <i data-lucide="external-link" class="w-3.5 h-3.5"></i></a>'
      +'</div>';
    if(window.lucide) lucide.createIcons();
  }
  window.connectWallet=()=>{
    if(wallet){ toast("Connected: "+shortAddr(wallet.addr)); return; }
    const box=document.getElementById("wallet-msg"); if(box){ box.style.display="none"; box.innerHTML=""; }
    requestProviders();
    openModal("wallet-modal");
  };
  window.pickWallet=(key)=>{
    const w=WALLETS[key]; if(!w) return;
    const provider=findProvider(key);
    if(!provider){ showWalletNotInstalled(key); return; }
    provider.request({method:"wallet_requestPermissions",params:[{eth_accounts:{}}]}).catch(function(){return null;}).then(function(){ return provider.request({method:"eth_requestAccounts"}); }).then(function(accounts){
      if(!accounts||!accounts.length){ toast("No account selected"); return; }
      wallet={key:key,name:w.name,addr:accounts[0],provider:provider};
      closeModal("wallet-modal");
      renderWalletUI();
      toast(w.name+" connected");
      if(provider.on){ provider.on("accountsChanged",function(accs){
        if(!accs||!accs.length){ wallet=null; } else { wallet.addr=accs[0]; }
        renderWalletUI();
      }); }
      if(pendingDeploy) setTimeout(openConfirm,260);
    }).catch(function(err){
      if(err&&err.code===4001) toast("Connection rejected");
      else toast("Could not connect "+w.name);
    });
  };

  /* ===== wallet management (connected state UI) ===== */
  function hideWalletMenu(){ var m=document.getElementById("wallet-menu"); if(m) m.style.display="none"; }
  function renderWalletUI(){
    var lbl=document.getElementById("wallet-label"), caret=document.getElementById("wallet-caret"), chip=document.getElementById("wallet-chip");
    if(wallet){
      if(lbl) lbl.textContent=shortAddr(wallet.addr);
      if(caret) caret.style.display="";
      if(chip) chip.setAttribute("aria-label","Wallet menu");
      var a=document.getElementById("wallet-menu-addr"); if(a) a.textContent=wallet.addr;
    } else {
      if(lbl) lbl.textContent="Connect Wallet";
      if(caret) caret.style.display="none";
      if(chip) chip.setAttribute("aria-label","Connect wallet");
      hideWalletMenu();
    }
    if(typeof renderAgentDeploy==="function") renderAgentDeploy();
  }
  window.walletChipClick=function(e){
    if(e&&e.stopPropagation) e.stopPropagation();
    if(!wallet){ connectWallet(); return; }
    var m=document.getElementById("wallet-menu"); if(m) m.style.display=(m.style.display==="block")?"none":"block";
  };
  window.copyConnectedAddr=function(){ if(!wallet) return; try{ if(navigator.clipboard) navigator.clipboard.writeText(wallet.addr); }catch(e){} toast("Address copied"); hideWalletMenu(); };
  window.changeWallet=function(){ hideWalletMenu(); var box=document.getElementById("wallet-msg"); if(box){ box.style.display="none"; box.innerHTML=""; } requestProviders(); openModal("wallet-modal"); };
  window.disconnectWallet=function(){ wallet=null; renderWalletUI(); toast("Wallet disconnected"); };
  document.addEventListener("click",function(e){ var wrap=document.getElementById("wallet-wrap"), menu=document.getElementById("wallet-menu"); if(menu&&menu.style.display==="block"&&wrap&&!wrap.contains(e.target)) menu.style.display="none"; });

  /* ===== Deploy architecture layer (prepared for real Deploy Manager; contracts not deployed yet) =====
     When the Deploy Manager + Factory addresses are set in studio-config.js, fill in the on-chain
     reads/sends below. Until then isLive() is false and the UI keeps the current simulated flow. */
  var CGDeploy={
    cfg:function(){ return window.CG_STUDIO_CONFIG||{}; },
    networks:function(){ return this.cfg().networks||[]; },
    network:function(id){ return this.networks().filter(function(n){return n.id===id;})[0]||null; },
    manager:function(id){ var m=(this.cfg().deployManager||{})[id]; return (m&&m.address)?m:null; },
    isLive:function(id){ return !!(window.ethers && this.manager(id)); },
    factory:function(id,type){ var f=(this.cfg().factories||{})[id]; return f?f[type]:null; },
    kindHash:function(t){ return window.ethers.keccak256(window.ethers.toUtf8Bytes(t)); },
    _contract:async function(id){
      var m=this.manager(id); if(!m||!window.ethers||!wallet||!wallet.provider) return null;
      var bp=new window.ethers.BrowserProvider(wallet.provider);
      var signer=await bp.getSigner();
      return new window.ethers.Contract(m.address, this.cfg().deployManagerAbi, signer);
    },
    getStudioFee:async function(id){ try{ var c=await this._contract(id); return c?await c.studioFee():null; }catch(e){ return null; } },
    getTreasury:async function(id){ try{ var c=await this._contract(id); return c?await c.treasury():(this.cfg().defaultTreasury||null); }catch(e){ return this.cfg().defaultTreasury||null; } },
    ensureChain:async function(id){
      var net=this.network(id); if(!net||!net.chainId||!wallet||!wallet.provider) return;
      var want="0x"+Number(net.chainId).toString(16);
      try{ await wallet.provider.request({method:"wallet_switchEthereumChain",params:[{chainId:want}]}); }
      catch(err){
        if(err&&err.code===4902){
          var rpc=(this.cfg().rpc||{})[id]||null;
          await wallet.provider.request({method:"wallet_addEthereumChain",params:[{chainId:want,chainName:net.label,rpcUrls:rpc?[rpc]:[],nativeCurrency:{name:"ETH",symbol:"ETH",decimals:18}}]});
        } else { throw err; }
      }
    },
    // Real deploy: switch chain -> read fee -> send tx to DeployManager -> wait -> parse Deployed event.
    deploy:async function(opts){
      await this.ensureChain(opts.network);
      var c=await this._contract(opts.network); if(!c) throw new Error("Deploy manager unavailable");
      var kind=this.kindHash(opts.kindStr);
      var types=(this.cfg().paramSchema||{})[opts.kindStr];
      var params=window.ethers.AbiCoder.defaultAbiCoder().encode(types, opts.values);
      var fee=await c.studioFee();
      var tx=await c.deploy(kind, params, { value: fee });
      var rc=await tx.wait();
      var addr=null;
      for(var i=0;i<rc.logs.length;i++){ try{ var p=c.interface.parseLog(rc.logs[i]); if(p&&p.name==="Deployed"){ addr=p.args.contractAddress; break; } }catch(e){} }
      return { address: addr, hash: (rc.hash||tx.hash) };
    }
  };
  window.CGDeploy=CGDeploy;

  // Collect ABI-encode values from the contract form for a given type.
  function collectContractValues(type){
    function v(id){ var e=document.getElementById(id); return e?(e.value||"").trim():""; }
    var owner=v("cf_owner")|| (wallet?wallet.addr:"");
    if(type==="ERC20") return { kindStr:"ERC20", values:[ v("cf_name")||"Token", v("cf_symbol")||"TKN", (v("cf_supply")||"0"), parseInt(v("cf_decimals")||"18",10) ], owner:owner };
    if(type==="B20")   return { kindStr:"B20",   values:[ v("cf_name")||"Token", v("cf_symbol")||"TKN", (v("cf_supply")||"0"), parseInt(v("cf_decimals")||"18",10) ], owner:owner };
    if(type==="ERC721") return { kindStr:"ERC721", values:[ v("cf_name")||"Collection", v("cf_symbol")||"NFT", "", (v("cf_max")||"0") ], owner:owner };
    if(type==="ERC1155") return { kindStr:"ERC1155", values:[ v("cf_name")||"Collection", "" ], owner:owner };
    if(type==="ERC8004"){ var slug=(v("cf_name")||"agent").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); return { kindStr:"ERC8004", values:[ "https://coingyaan.com/agent/"+slug ], owner:owner }; }
    return null;
  }
  // Real deploy runner: shows progress in the panel, then the existing success screen via onDone.
  function runRealDeploy(panel, kindStr, values, name, onDone){
    if(panel){ panel.style.display="block"; panel.innerHTML='<div class="text-center py-4"><span class="text-[14px] text-muted">Confirm in your wallet, then deploying on Base...</span></div>'; }
    CGDeploy.deploy({ network:"base", kindStr:kindStr, values:values }).then(function(res){
      toast("Deployed on Base");
      if(panel) showSuccess(panel, name, onDone, res.address, res.hash);
      else if(typeof onDone==="function") onDone(res.address, res.hash);
    }).catch(function(err){
      if(panel) panel.innerHTML="";
      toast((err&&err.code===4001)?"Deployment rejected":"Deploy failed: "+((err&&err.shortMessage)||(err&&err.message)||"error"));
    });
  }
  window.runRealDeploy=runRealDeploy;

  /* ===== toast + modal ===== */
  let tt;
  window.toast=(msg)=>{ const t=document.getElementById("toast"); t.innerHTML='<span class="w-1.5 h-1.5 rounded-full" style="background:var(--emerald)"></span> '+msg; t.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove("show"),2600); };
  window.openModal=(id)=>{ document.getElementById(id).classList.add("open"); lucide.createIcons(); };
  window.closeModal=(id)=>document.getElementById(id).classList.remove("open");

  /* ===== deploy flow (wallet-native) ===== */
  let pendingDeploy=null;
  function beginDeploy(panel,name,onDone,stages){
    pendingDeploy={panel,name,onDone,stages};
    if(!wallet){ openModal("wallet-modal"); return; }
    openConfirm();
  }
  function openConfirm(){
    document.getElementById("confirm-wallet").textContent = wallet ? wallet.name : "your wallet";
    openModal("confirm-modal");
  }
  window.confirmTx=()=>{ closeModal("confirm-modal"); const d=pendingDeploy; pendingDeploy=null; if(d) runDeploy(d.panel,d.name,d.onDone,d.stages); };
  window.rejectTx=()=>{ closeModal("confirm-modal"); pendingDeploy=null; toast("Transaction rejected in wallet"); };
  function hex(n){ const h="0123456789abcdef"; let s=""; for(let i=0;i<n;i++)s+=h[(Math.random()*16)|0]; return s; }
  function fullAddr(){ return "0x"+hex(40); }
  function txHash(){ return "0x"+hex(64); }
  function shortMid(s){ return s.slice(0,10)+"..."+s.slice(-8); }
  window.copyAddr=(a)=>{ try{ navigator.clipboard&&navigator.clipboard.writeText(a); }catch(e){} toast("Address copied"); };
  function explorerBase(){ try{ var n=CGDeploy.network("base")||{}; return n.chainId===84532?"https://sepolia.basescan.org":"https://basescan.org"; }catch(e){ return "https://basescan.org"; } }
  window.baseScan=(a)=>{ try{ window.open(explorerBase()+"/address/"+a,"_blank"); }catch(e){} };
  window.baseScanTx=(h)=>{ try{ window.open(explorerBase()+"/tx/"+h,"_blank"); }catch(e){} };

  /* ===== CREATE AGENT ===== */
  const REASON=["Parsing your intent","Selecting capabilities","Drafting ERC8004 metadata","Generating profile","Finalizing"];
  window.generateAgent=()=>{
    const prompt=document.getElementById("create-input").value.trim();
    if(!prompt){ toast("Describe your agent first"); return; }
    document.getElementById("create-result").style.display="none";
    const load=document.getElementById("create-loading"); load.style.display="block";
    const rc=document.getElementById("create-reason"); rc.innerHTML="";
    let i=0;
    (function step(){
      if(i<REASON.length){ const row=document.createElement("div"); row.innerHTML='<span style="color:var(--blue)">&#9679;</span> '+REASON[i]; rc.appendChild(row);
        const prev=rc.children[i-1]; if(prev) prev.innerHTML='<span style="color:var(--emerald)">&#10003;</span> '+REASON[i-1];
        i++; setTimeout(step, reduce?0:520);
      } else { const prev=rc.children[i-1]; if(prev) prev.innerHTML='<span style="color:var(--emerald)">&#10003;</span> '+REASON[i-1]; setTimeout(showResult, reduce?0:400); }
    })();
    function showResult(){
      load.style.display="none";
      const a=deriveAgent(prompt);
      const res=document.getElementById("create-result");
      res.innerHTML=
        '<div class="glass rounded-2xl p-6">'
        +'<div class="flex items-center gap-3 mb-5"><span class="grid place-items-center w-11 h-11 rounded-xl text-[15px] font-bold" style="background:rgba(96,165,250,.14);color:var(--blue);border:1px solid rgba(96,165,250,.3)">'+a.name.charAt(0)+'</span><div><p class="text-[17px] font-semibold">'+a.name+'</p><p class="text-[12.5px] text-muted">'+a.category+'</p></div><span class="ml-auto text-[11px] font-medium px-2.5 py-1 rounded-full" style="background:rgba(96,165,250,.12);color:var(--blue)">AI generated</span></div>'
        +'<p class="text-[13px] text-muted mb-1 mt-4">Description</p><p class="text-[14.5px] leading-relaxed">'+a.desc+'</p>'
        +'<p class="text-[13px] text-muted mb-2 mt-5">Capabilities</p><div class="flex flex-wrap gap-2">'+a.caps.map(c=>'<span class="text-[12.5px] px-3 py-1.5 rounded-full" style="background:rgba(255,255,255,.04);border:1px solid var(--border)">'+c+'</span>').join("")+'</div>'
        +'<p class="text-[13px] text-muted mb-2 mt-5">Suggested metadata</p><pre class="font-mono text-[12.5px] leading-6 rounded-xl p-4 overflow-x-auto" style="background:rgba(255,255,255,.02);border:1px solid var(--border);color:#cbd5e1">'+a.json+'</pre>'
        +'<div class="flex gap-3 mt-6"><button onclick="fromCreateToDeploy(\''+a.name.replace(/'/g,"")+'\')" class="btn-primary inline-flex items-center gap-2 font-semibold px-5 py-3 rounded-full text-[14px]"><i data-lucide="rocket" class="w-4 h-4"></i> Deploy this agent</button><button onclick="showView(\'agent-verify\')" class="btn-ghost inline-flex items-center gap-2 font-medium px-5 py-3 rounded-full text-ink text-[14px]"><i data-lucide="shield-check" class="w-4 h-4 text-emerald"></i> Verify</button></div>'
        +'</div>';
      res.style.display="block"; lucide.createIcons();
    }
  };
  window.fromCreateToDeploy=(name)=>{ showView("agent-deploy"); const el=document.getElementById("deploy-agent-name"); if(el) el.value=name; toast("Agent ready to deploy"); };

  function deriveAgent(p){
    const s=p.toLowerCase(); let name,category,caps;
    if(/wallet/.test(s)){ name="BaseWallet IQ"; category="Wallet, Data"; caps=["Wallet analysis","Risk scoring","Portfolio insights","Onchain history"]; }
    else if(/trad|swap|dca|price|market/.test(s)){ name="Nova Trade Agent"; category="Markets"; caps=["Market signals","Trade execution","Risk limits","PnL tracking"]; }
    else if(/research|analy|report/.test(s)){ name="Atlas Research"; category="Research"; caps=["Onchain research","Report drafting","Source citing","Trend detection"]; }
    else if(/airdrop|farm/.test(s)){ name="Airdrop Scout"; category="Growth"; caps=["Eligibility checks","Task tracking","Reward alerts","Wallet coverage"]; }
    else { name="CG Agent"; category="General"; caps=["Reasoning","Onchain actions","Data retrieval","Monitoring"]; }
    const desc="An autonomous ERC8004 agent that "+(p.charAt(0).toLowerCase()+p.slice(1)).replace(/^i want an ai agent that /i,"").replace(/\.$/,"")+". Built with CoinGyaan intelligence.";
    const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
    const json='{\n  "name": "'+name+'",\n  "standard": "ERC8004",\n  "chain": "base",\n  "capabilities": '+JSON.stringify(caps)+',\n  "endpoints": { "status": "https://api.example.com/status" },\n  "agentURI": "https://coingyaan.com/agent/'+slug+'"\n}';
    return {name,category,caps,desc,json};
  }

  /* ===== DEPLOY AGENT ===== */
  window.renderAgentDeploy=()=>{
    document.getElementById("deploy-agent-action").innerHTML='<button onclick="deployAgent()" class="btn-primary w-full inline-flex items-center justify-center gap-2 font-semibold px-5 py-3.5 rounded-full"><i data-lucide="rocket" class="w-4 h-4"></i> Deploy agent</button>';
    lucide.createIcons();
  };
  window.deployAgent=()=>{
    const name=document.getElementById("deploy-agent-name").value.trim()||"CG Agent";
    if(CGDeploy.isLive("base") && wallet){
      const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
      runRealDeploy(document.getElementById("deploy-agent-progress"), "ERC8004", ["https://coingyaan.com/agent/"+slug], name, (addr,hash)=>openProfile("agent",name,null,addr));
      return;
    }
    beginDeploy(document.getElementById("deploy-agent-progress"), name, (addr)=>openProfile("agent",name,null,addr));
  };

  /* shared deploy engine */
  function runDeploy(panel, name, onDone, stages){
    panel.style.display="block";
    stages = stages || ["Broadcasting transaction","Mining on Base","Confirming deployment"];
    panel.innerHTML='<div class="flex items-center justify-between mb-4"><span class="text-[14px] font-medium">Deploying '+name+'</span><span id="dp-pct" class="text-[13px] text-muted tabular-nums">0%</span></div><div class="bar mb-5"><span id="dp-bar"></span></div><div id="dp-stage" class="text-[13.5px] text-muted flex items-center gap-2"><span class="spinner"></span> '+stages[0]+'</div>';
    const bar=panel.querySelector("#dp-bar"), pct=panel.querySelector("#dp-pct"), stg=panel.querySelector("#dp-stage");
    let s=0; const total=stages.length;
    function next(){
      const p=Math.round(((s+1)/total)*100); setTimeout(()=>{ bar.style.width=p+"%"; pct.textContent=p+"%"; },30);
      if(s<total-1){ stg.innerHTML='<span class="spinner"></span> '+stages[s+1]; s++; setTimeout(next, reduce?0:900); }
      else { setTimeout(()=>{ stg.innerHTML='<span style="color:var(--emerald)">&#10003;</span> Deployment complete'; setTimeout(()=>showSuccess(panel,name,onDone), reduce?0:600); }, reduce?0:900); }
    }
    setTimeout(next, reduce?0:700);
  }
  function showSuccess(panel,name,onDone,realAddr,realHash){
    const addr=realAddr||fullAddr(), hash=realHash||txHash();
    if(panel) panel.style.display="block";
    panel.innerHTML=
      '<div class="text-center mb-6"><span class="grid place-items-center w-14 h-14 rounded-full mx-auto mb-4" style="background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.34)"><i data-lucide="check" class="w-7 h-7" style="color:var(--emerald)"></i></span><h3 class="text-[20px] font-bold">Deployment successful</h3><p class="text-[13.5px] text-muted mt-1">'+name+' is live on Base</p></div>'
      +'<div class="space-y-3 text-[13.5px]">'
      +'<div class="flex items-center justify-between gap-3"><span class="text-muted shrink-0">Address</span><span class="font-mono flex items-center gap-2">'+shortMid(addr)+' <button onclick="copyAddr(\''+addr+'\')" class="text-muted hover:text-ink"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button></span></div>'
      +'<div class="flex items-center justify-between gap-3"><span class="text-muted shrink-0">Transaction hash</span><span class="font-mono flex items-center gap-2">'+shortMid(hash)+' <button onclick="baseScanTx(\''+hash+'\')" class="text-muted hover:text-ink"><i data-lucide="external-link" class="w-3.5 h-3.5"></i></button></span></div>'
      +'</div>'
      +'<div class="flex flex-wrap gap-3 mt-6">'
      +'<button onclick="__viewProfile()" class="btn-primary inline-flex items-center gap-2 font-semibold px-5 py-3 rounded-full text-[14px]"><i data-lucide="layout-dashboard" class="w-4 h-4"></i> View public profile</button>'
      +'<button onclick="baseScan(\''+addr+'\')" class="btn-ghost inline-flex items-center gap-2 font-medium px-5 py-3 rounded-full text-ink text-[14px]"><i data-lucide="external-link" class="w-4 h-4 text-blue"></i> View on BaseScan</button>'
      +'<button onclick="baseScanTx(\''+hash+'\')" class="btn-ghost inline-flex items-center gap-2 font-medium px-5 py-3 rounded-full text-ink text-[14px]"><i data-lucide="external-link" class="w-4 h-4 text-blue"></i> View transaction</button>'
      +'<button onclick="copyAddr(\''+addr+'\')" class="btn-ghost inline-flex items-center gap-2 font-medium px-5 py-3 rounded-full text-ink text-[14px]"><i data-lucide="copy" class="w-4 h-4 text-blue"></i> Copy address</button>'
      +'</div>';
    window.__viewProfile=()=>onDone&&onDone(addr);
    lucide.createIcons();
  }

  /* ===== IMPORT AGENT ===== */
  window.importAgent=()=>{
    const v=document.getElementById("import-input").value.trim();
    if(!v){ toast("Enter an address"); return; }
    document.getElementById("import-result").style.display="none";
    const l=document.getElementById("import-loading"); l.style.display="block";
    setTimeout(()=>{
      l.style.display="none";
      const short=v.length>12?v.slice(0,6)+"..."+v.slice(-4):v;
      const verified=Math.random()>0.4;
      document.getElementById("import-result").innerHTML=
        '<div class="glass rounded-2xl p-6"><div class="flex items-center gap-3 mb-5"><span class="grid place-items-center w-11 h-11 rounded-xl" style="background:rgba(34,211,238,.14);border:1px solid rgba(34,211,238,.3)"><i data-lucide="bot" class="w-5 h-5 text-cyan"></i></span><div><p class="text-[16px] font-semibold">Imported agent</p><p class="text-[12.5px] text-muted font-mono">'+short+'</p></div></div>'
        +'<div class="grid grid-cols-2 gap-4 text-[14px]">'
        +'<div><p class="text-[12.5px] text-muted mb-1">Owner</p><p class="font-mono">'+randAddr()+'</p></div>'
        +'<div><p class="text-[12.5px] text-muted mb-1">Status</p><p class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full" style="background:var(--emerald)"></span> Active</p></div>'
        +'<div><p class="text-[12.5px] text-muted mb-1">Verification</p><p style="color:'+(verified?"var(--emerald)":"var(--purple)")+'">'+(verified?"Verified":"Unverified")+'</p></div>'
        +'<div><p class="text-[12.5px] text-muted mb-1">Network</p><p class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full" style="background:var(--blue)"></span> Base</p></div>'
        +'</div>'
        +'<div class="flex gap-3 mt-6"><button onclick="showView(\'agent-verify\')" class="btn-primary inline-flex items-center gap-2 font-semibold px-5 py-3 rounded-full text-[14px]"><i data-lucide="shield-check" class="w-4 h-4"></i> Run verification</button></div></div>';
      document.getElementById("import-result").style.display="block"; lucide.createIcons();
    }, reduce?0:1400);
  };

  /* ===== CG VERIFICATION (shared engine) ===== */
  const CHECKS=[["Identity","fingerprint","Wallet signature verified"],["Metadata","file-json","Schema valid, endpoints resolve"],["Wallet","wallet","Ownership confirmed onchain"],["Endpoint","plug","3/3 live, p50 112ms"]];
  window.runVerification=()=>{
    const panel=document.getElementById("verify-panel"); panel.style.display="block";
    const list=document.getElementById("verify-list"), final=document.getElementById("verify-final");
    final.style.display="none";
    list.innerHTML=CHECKS.map((c,i)=>'<div class="chk flex items-center gap-3 text-[14px]" id="chk'+i+'"><span class="w-5 grid place-items-center" id="chkico'+i+'"><i data-lucide="'+c[1]+'" class="w-4 h-4 text-muted"></i></span><span class="flex-1">'+c[0]+'</span><span class="text-[12.5px] text-muted" id="chkmsg'+i+'"></span></div>').join("");
    lucide.createIcons();
    const bar=document.getElementById("verify-bar"), pct=document.getElementById("verify-pct");
    let i=0;
    function step(){
      if(i<CHECKS.length){
        const ico=document.getElementById("chkico"+i); document.getElementById("chk"+i).classList.add("active"); ico.innerHTML='<span class="spinner"></span>';
        setTimeout(()=>{
          ico.innerHTML='<i data-lucide="check" class="w-4 h-4" style="color:var(--emerald)"></i>'; lucide.createIcons();
          document.getElementById("chkmsg"+i).textContent=CHECKS[i][2];
          document.getElementById("chk"+i).classList.add("done");
          const p=Math.round(((i+1)/CHECKS.length)*100); bar.style.width=p+"%"; pct.textContent=p+"%";
          i++; setTimeout(step, reduce?0:300);
        }, reduce?0:700);
      } else {
        final.style.display="block";
        final.innerHTML='<div class="rounded-xl p-5 flex items-center gap-4" style="background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.28)"><span class="grid place-items-center w-11 h-11 rounded-full" style="background:rgba(52,211,153,.15)"><i data-lucide="badge-check" class="w-6 h-6" style="color:var(--emerald)"></i></span><div><p class="text-[16px] font-semibold" style="color:var(--emerald)">Verified</p><p class="text-[13px] text-muted">All checks passed. This agent is ready to publish.</p></div></div>';
        lucide.createIcons();
      }
    }
    setTimeout(step, reduce?0:400);
  };

  /* ===== CONTRACT STUDIO ===== */
  const CTYPES=[
    {id:"ERC20",icon:"coins",color:"#60A5FA",desc:"Fungible token"},
    {id:"ERC721",icon:"image",color:"#A78BFA",desc:"NFT collection"},
    {id:"ERC1155",icon:"layers",color:"#22D3EE",desc:"Multi token"},
    {id:"ERC8004",icon:"bot",color:"#34D399",desc:"Agent identity"},
    {id:"B20",icon:"zap",color:"#F59E0B",desc:"Native Base token"}
  ];
  const CFORMS={
    ERC20:[
      {label:"Token name",id:"cf_name",type:"text",placeholder:"MyToken"},
      {label:"Token symbol",id:"cf_symbol",type:"text",placeholder:"MTK"},
      {label:"Total supply",id:"cf_supply",type:"number",placeholder:"1000000"},
      {label:"Decimals",id:"cf_decimals",type:"number",value:"18"},
      {label:"Owner wallet address",id:"cf_owner",type:"text",placeholder:"0x..."},
      {id:"cf_network",type:"network"}
    ],
    ERC721:[
      {label:"Collection name",id:"cf_name",type:"text",placeholder:"My Collection"},
      {label:"Collection symbol",id:"cf_symbol",type:"text",placeholder:"MYC"},
      {label:"Collection image",id:"cf_image",type:"image"},
      {label:"Collection description",id:"cf_desc",type:"textarea",optional:true,placeholder:"Describe your collection"},
      {label:"Maximum supply",id:"cf_max",type:"number",optional:true,placeholder:"10000"},
      {label:"Owner wallet address",id:"cf_owner",type:"text",placeholder:"0x..."},
      {id:"cf_network",type:"network"}
    ],
    ERC1155:[
      {label:"Collection name",id:"cf_name",type:"text",placeholder:"My Items"},
      {label:"Collection image",id:"cf_image",type:"image"},
      {label:"Collection description",id:"cf_desc",type:"textarea",optional:true,placeholder:"Describe your collection"},
      {label:"Owner wallet address",id:"cf_owner",type:"text",placeholder:"0x..."},
      {id:"cf_network",type:"network"}
    ],
    ERC8004:[
      {label:"Agent name",id:"cf_name",type:"text",placeholder:"BaseWallet IQ"},
      {label:"Agent logo",id:"cf_image",type:"image"},
      {label:"Agent description",id:"cf_desc",type:"textarea",placeholder:"Describe what your agent does"},
      {label:"Agent category",id:"cf_cat",type:"select",options:["Wallet","Markets","Research","Growth","Data","Support","General"]},
      {label:"Owner wallet address",id:"cf_owner",type:"text",placeholder:"0x..."},
      {id:"cf_network",type:"network"}
    ],
    B20:[
      {label:"Token name",id:"cf_name",type:"text",placeholder:"MyToken"},
      {label:"Token symbol",id:"cf_symbol",type:"text",placeholder:"MTK"},
      {label:"Total supply",id:"cf_supply",type:"number",placeholder:"1000000"},
      {label:"Decimals (6 to 18)",id:"cf_decimals",type:"number",value:"18"},
      {label:"Owner wallet address",id:"cf_owner",type:"text",placeholder:"0x..."},
      {id:"cf_network",type:"network"}
    ]
  };
  const CSTAGES={
    ERC20:["Preparing contract","Deploying on Base","Verifying contract"],
    ERC721:["Uploading image to IPFS","Generating metadata","Uploading metadata to IPFS","Generating Base URI","Deploying on Base","Verifying contract"],
    ERC1155:["Uploading image to IPFS","Generating metadata","Generating URI","Deploying on Base","Verifying contract"],
    ERC8004:["Generating ERC8004 metadata","Uploading metadata to IPFS","Generating metadata URI","Deploying on Base","Verifying agent"],
    B20:["Encoding B20 token","Calling B20 Factory precompile","Confirming on Base"]
  };
  function renderField(f){
    const opt = f.optional ? ' <span class="text-muted font-normal">(optional)</span>' : '';
    if(f.type==="network"){
      var nets=(window.CG_STUDIO_CONFIG&&window.CG_STUDIO_CONFIG.networks)||[{id:"base",label:"Base",status:"active"}];
      var opts=nets.map(function(n){
        return n.status==="active"
          ? '<option value="'+n.id+'" selected>'+n.label+'</option>'
          : '<option disabled>'+n.label+' (Coming Soon)</option>';
      }).join("");
      return '<div class="field"><label for="'+f.id+'">Network</label><select id="'+f.id+'">'+opts+'</select></div>';
    }
    if(f.type==="image"){
      return '<div class="field"><label for="'+f.id+'">'+f.label+opt+'</label>'
        +'<label class="upload" for="'+f.id+'"><input type="file" id="'+f.id+'" accept="image/*" class="hidden" onchange="previewImg(this,\''+f.id+'\')">'
        +'<div id="'+f.id+'_preview" class="flex items-center gap-3"><span class="grid place-items-center w-11 h-11 rounded-lg shrink-0" style="background:rgba(96,165,250,.1)"><i data-lucide="image-plus" class="w-5 h-5 text-blue"></i></span><div class="text-left"><p class="text-[13.5px] font-medium">Upload an image</p><p class="text-[12px] text-muted">PNG, JPG or SVG</p></div></div>'
        +'</label></div>';
    }
    if(f.type==="textarea"){
      return '<div class="field"><label for="'+f.id+'">'+f.label+opt+'</label><textarea id="'+f.id+'" rows="3" placeholder="'+(f.placeholder||'')+'"></textarea></div>';
    }
    if(f.type==="select"){
      return '<div class="field"><label for="'+f.id+'">'+f.label+opt+'</label><select id="'+f.id+'">'+f.options.map(o=>'<option>'+o+'</option>').join("")+'</select></div>';
    }
    return '<div class="field"><label for="'+f.id+'">'+f.label+opt+'</label><input id="'+f.id+'" type="'+(f.type==="number"?"number":"text")+'" placeholder="'+(f.placeholder||'')+'" value="'+(f.value||'')+'" /></div>';
  }
  window.previewImg=(input,id)=>{
    const f=input.files&&input.files[0]; if(!f) return;
    const rd=new FileReader();
    rd.onload=(e)=>{ document.getElementById(id+"_preview").innerHTML='<div class="flex items-center gap-3"><img src="'+e.target.result+'" class="w-11 h-11 rounded-lg object-cover shrink-0"/><div class="text-left"><p class="text-[13.5px] font-medium">'+f.name+'</p><p class="text-[12px]" style="color:var(--emerald)">Ready to publish</p></div></div>'; };
    rd.readAsDataURL(f);
  };
  window.renderContractTypes=()=>{
    document.getElementById("contract-types").innerHTML=CTYPES.map(c=>
      '<div class="card-i glass rounded-2xl p-6 reveal" onclick="openContract(\''+c.id+'\')"><span class="grid place-items-center w-12 h-12 rounded-xl mb-5" style="background:'+c.color+'1f;border:1px solid '+c.color+'44"><i data-lucide="'+c.icon+'" class="w-5 h-5" style="color:'+c.color+'"></i></span><h3 class="text-[17px] font-semibold mb-1">'+c.id+'</h3><p class="text-[13px] text-muted">'+c.desc+'</p></div>'
    ).join("");
    document.querySelectorAll("#contract-types .reveal").forEach((el,i)=>setTimeout(()=>el.classList.add("in"),80+i*60));
    lucide.createIcons();
  };
  window.openContract=(type)=>{
    showView("contract-deploy");
    document.getElementById("cd-title").textContent = type==="ERC8004" ? "Deploy ERC8004 Agent" : "Deploy "+type;
    const fields=CFORMS[type]||CFORMS.ERC20;
    document.getElementById("cd-fields").innerHTML=fields.map(renderField).join("");
    const ow=document.getElementById("cf_owner"); if(ow && wallet && !ow.value) ow.value=wallet.addr;
    const btnLabel = type==="ERC8004" ? "Deploy ERC8004 Agent" : "Deploy "+type;
    document.getElementById("cd-action").innerHTML='<button onclick="deployContract(\''+type+'\')" class="btn-primary w-full inline-flex items-center justify-center gap-2 font-semibold px-5 py-3.5 rounded-full"><i data-lucide="rocket" class="w-4 h-4"></i> '+btnLabel+'</button>';
    document.getElementById("cd-progress").style.display="none";
    lucide.createIcons();
  };
  window.deployContract=(type)=>{
    const name=(document.getElementById("cf_name")?.value||type).trim()||type;
    const stages=CSTAGES[type]||CSTAGES.ERC20;
    const kind = type==="ERC8004" ? "agent" : "contract";
    const t = kind==="contract" ? type : null;
    const net=(document.getElementById("cf_network")||{}).value||"base";
    const b20ok = type!=="B20" || CGDeploy.factory(net,"B20");
    if(CGDeploy.isLive(net) && wallet && b20ok){
      const c=collectContractValues(type);
      runRealDeploy(document.getElementById("cd-progress"), c.kindStr, c.values, name, (addr,hash)=>openProfile(kind,name,t,addr));
      return;
    }
    beginDeploy(document.getElementById("cd-progress"), name, (addr)=>openProfile(kind,name,t,addr), stages);
  };

  /* ===== PUBLIC PROFILE ===== */
  window.openProfile=(kind,name,type,addr)=>{
    const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
    const url="coingyaan.com/"+(kind==="agent"?"agent":"contract")+"/"+slug;
    addr = addr || randAddr(); const owner=wallet?wallet.addr:randAddr();
    const date=new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});
    const icon=kind==="agent"?"bot":"file-code-2", col=kind==="agent"?"#60A5FA":"#A78BFA";
    document.getElementById("profile-body").innerHTML=
      '<div class="flex items-center gap-2 text-[13px] text-muted mb-6"><i data-lucide="check-circle-2" class="w-4 h-4" style="color:var(--emerald)"></i> Deployment complete</div>'
      +'<div class="glass rounded-3xl overflow-hidden">'
      +'<div class="p-8 border-b border-white/8">'
      +'<div class="flex items-start justify-between">'
      +'<div class="flex items-center gap-4"><span class="grid place-items-center w-14 h-14 rounded-2xl text-[20px] font-bold" style="background:'+col+'1f;color:'+col+';border:1px solid '+col+'44">'+name.charAt(0)+'</span><div><h1 class="text-[26px] font-extrabold tracking-[-0.02em]">'+name+'</h1><p class="text-[13px] text-muted font-mono mt-0.5">'+url+'</p></div></div>'
      +'<span class="inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-full" style="background:rgba(52,211,153,.12);color:var(--emerald)"><i data-lucide="badge-check" class="w-3.5 h-3.5"></i> Verified</span>'
      +'</div></div>'
      +'<div class="p-8 grid sm:grid-cols-2 gap-6 text-[14px]">'
      +'<div><p class="text-[12.5px] text-muted mb-1">Name</p><p class="font-medium">'+name+(type?' <span class="text-muted">('+type+')</span>':'')+'</p></div>'
      +'<div><p class="text-[12.5px] text-muted mb-1">Contract address</p><p class="font-mono flex items-center gap-2">'+shortMid(addr)+' <button onclick="copyAddr(\''+addr+'\')" class="text-muted hover:text-ink"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button></p></div>'
      +'<div><p class="text-[12.5px] text-muted mb-1">Owner</p><p class="font-mono">'+shortMid(owner)+'</p></div>'
      +'<div><p class="text-[12.5px] text-muted mb-1">Created</p><p>'+date+'</p></div>'
      +'<div><p class="text-[12.5px] text-muted mb-1">Chain</p><p class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full" style="background:var(--blue)"></span> Base</p></div>'
      +'<div><p class="text-[12.5px] text-muted mb-1">Verification status</p><p style="color:var(--emerald)">Verified</p></div>'
      +'</div>'
      +'<div class="p-8 pt-0 flex flex-wrap gap-3">'
      +'<button onclick="shareProfile(\''+url+'\')" class="btn-primary inline-flex items-center gap-2 font-semibold px-5 py-3 rounded-full text-[14px]"><i data-lucide="share-2" class="w-4 h-4"></i> Share</button>'
      +'<button onclick="toast(\'Opening Base explorer\')" class="btn-ghost inline-flex items-center gap-2 font-medium px-5 py-3 rounded-full text-ink text-[14px]"><i data-lucide="external-link" class="w-4 h-4 text-blue"></i> Explorer</button>'
      +(kind==="contract"?'<button onclick="showCert(\''+name.replace(/'/g,"")+'\',\''+addr+'\',\''+(type||"")+'\')" class="btn-ghost inline-flex items-center gap-2 font-medium px-5 py-3 rounded-full text-ink text-[14px]"><i data-lucide="award" class="w-4 h-4 text-purple"></i> Certificate</button>':'')
      +'</div></div>';
    showView("profile"); lucide.createIcons();
  };
  window.shareProfile=(url)=>{ toast("Profile link copied: "+url); };
  window.showCert=(name,addr,type)=>{
    const date=new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});
    document.getElementById("cert-body").innerHTML=
      '<div class="flex items-center justify-between mb-6"><span class="text-[12px] uppercase eyebrow text-muted">Deployment certificate</span><button onclick="closeModal(\'cert-modal\')" class="text-muted hover:text-ink"><i data-lucide="x" class="w-5 h-5"></i></button></div>'
      +'<div class="text-center mb-6"><span class="grid place-items-center w-14 h-14 rounded-2xl mx-auto mb-4" style="background:rgba(167,139,250,.14);border:1px solid rgba(167,139,250,.32)"><i data-lucide="award" class="w-7 h-7" style="color:var(--purple)"></i></span><h3 class="text-[20px] font-bold grad-text">'+name+'</h3><p class="text-[12.5px] text-muted mt-1">'+(type||"Contract")+' on Base</p></div>'
      +'<div class="space-y-3 text-[13.5px]">'
      +'<div class="flex justify-between"><span class="text-muted">Address</span><span class="font-mono">'+shortMid(addr)+'</span></div>'
      +'<div class="flex justify-between"><span class="text-muted">Deployed</span><span>'+date+'</span></div>'
      +'<div class="flex justify-between"><span class="text-muted">Verification</span><span style="color:var(--emerald)">Verified</span></div>'
      +'<div class="flex justify-between"><span class="text-muted">CG check</span><span class="inline-flex items-center gap-1.5" style="color:var(--emerald)"><i data-lucide="check" class="w-3.5 h-3.5"></i> Passed</span></div>'
      +'</div>';
    openModal("cert-modal");
  };

})();

/* ============================================================
   PRODUCTION PASS: shared header, mobile menu, sidebar drawer.
   Runs after the main app IIFE. Only manages navigation chrome;
   no product logic or state is changed here.
   ============================================================ */
(function(){
  "use strict";
  // Tools dropdown (header)
  var toolsBtn = document.getElementById("cgToolsBtn");
  var dropdown = toolsBtn ? toolsBtn.closest(".cg-dropdown") : null;
  if (toolsBtn && dropdown) {
    toolsBtn.addEventListener("click", function(e){
      e.stopPropagation();
      var open = dropdown.classList.toggle("open");
      toolsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function(){
      dropdown.classList.remove("open");
      toolsBtn.setAttribute("aria-expanded", "false");
    });
  }
  // Mobile menu (header)
  var hamb = document.getElementById("cgHamburger");
  var mobileMenu = document.getElementById("cgMobileMenu");
  if (hamb && mobileMenu) {
    hamb.addEventListener("click", function(){
      var open = mobileMenu.classList.toggle("open");
      hamb.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  // Sidebar drawer (studio app, mobile)
  var sideToggle = document.getElementById("cgSideToggle");
  var sidebar = document.getElementById("studioSidebar");
  var overlay = document.getElementById("cgSideOverlay");
  function openDrawer(){ if(sidebar) sidebar.classList.add("open"); if(overlay) overlay.classList.add("open"); if(sideToggle) sideToggle.setAttribute("aria-expanded","true"); }
  function closeDrawer(){ if(sidebar) sidebar.classList.remove("open"); if(overlay) overlay.classList.remove("open"); if(sideToggle) sideToggle.setAttribute("aria-expanded","false"); }
  if (sideToggle) sideToggle.addEventListener("click", openDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);
  if (sidebar) sidebar.addEventListener("click", function(e){ if (e.target.closest(".side-link")) closeDrawer(); });
  // Escape closes any open chrome or modal
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape") {
      if (dropdown) dropdown.classList.remove("open");
      if (mobileMenu) mobileMenu.classList.remove("open");
      closeDrawer();
      var openModals = document.querySelectorAll(".modal-wrap.open");
      for (var i=0;i<openModals.length;i++) openModals[i].classList.remove("open");
    }
  });
})();
