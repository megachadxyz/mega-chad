import { NextResponse } from 'next/server';

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>$MEGACHAD — Early Access</title>
  <link rel="icon" href="/chadfavicon.jpg" type="image/jpeg"/>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --pink: #FF8AA8;
      --pink2: #F786C6;
      --dark: #0a0a0a;
      --card: #111111;
      --border: #222222;
      --white: #f0f0f0;
      --gray: #1a1a1a;
      --muted: #555;
    }

    body {
      background: var(--dark);
      color: var(--white);
      font-family: 'Share Tech Mono', monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
    }

    body::after {
      content: '';
      position: fixed;
      inset: 0;
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
      pointer-events: none;
      z-index: 100;
    }

    body::before {
      content: '';
      position: fixed;
      top: -200px;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 400px;
      background: radial-gradient(ellipse, rgba(247,134,198,0.1) 0%, transparent 70%);
      pointer-events: none;
    }

    .container { width: 100%; max-width: 480px; position: relative; z-index: 1; }

    .header { text-align: center; margin-bottom: 32px; }

    .site-logo {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 12px;
      letter-spacing: 5px;
      color: var(--white);
      text-decoration: none;
      display: block;
      margin-bottom: 28px;
      opacity: 0.4;
    }

    .page-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: clamp(56px, 13vw, 92px);
      letter-spacing: 6px;
      line-height: 0.88;
      color: var(--white);
    }

    .page-title span { display: block; color: var(--pink); text-shadow: 0 0 40px rgba(255,138,168,0.35); }
    .page-sub { margin-top: 14px; font-size: 9px; letter-spacing: 4px; color: var(--muted); text-transform: uppercase; }

    .progress { display: flex; gap: 4px; margin: 24px 0; }
    .progress-bar { flex: 1; height: 2px; background: var(--border); transition: background 0.4s, opacity 0.4s; }
    .progress-bar.active { background: var(--pink); }
    .progress-bar.done { background: var(--pink); opacity: 0.35; }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      padding: 28px;
      position: relative;
    }

    .card::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 2px;
      background: linear-gradient(to bottom, var(--pink), var(--pink2));
      box-shadow: 0 0 10px var(--pink);
    }

    .step-label { font-size: 9px; letter-spacing: 4px; color: var(--pink); text-transform: uppercase; margin-bottom: 8px; }
    .step-title { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 3px; margin-bottom: 8px; }
    .step-desc { font-size: 11px; color: var(--muted); line-height: 1.7; margin-bottom: 22px; }

    input[type="text"] {
      width: 100%;
      background: var(--dark);
      border: 1px solid var(--border);
      color: var(--white);
      font-family: 'Share Tech Mono', monospace;
      font-size: 12px;
      padding: 12px 14px;
      outline: none;
      transition: border-color 0.2s;
      margin-bottom: 8px;
    }

    input[type="text"]:focus { border-color: var(--pink); }
    input[type="text"]::placeholder { color: #2a2a2a; }

    .btn {
      display: block;
      width: 100%;
      padding: 15px;
      background: var(--pink);
      color: #0a0a0a;
      border: none;
      font-family: 'Bebas Neue', sans-serif;
      font-size: 20px;
      letter-spacing: 5px;
      cursor: pointer;
      transition: all 0.15s;
      margin-top: 12px;
    }

    .btn:hover:not(:disabled) { background: var(--pink2); box-shadow: 0 0 24px rgba(255,138,168,0.25); }
    .btn:disabled { background: #1a1a1a; color: #333; cursor: not-allowed; }

    .btn-ghost {
      display: block;
      width: 100%;
      padding: 12px;
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--border);
      font-family: 'Share Tech Mono', monospace;
      font-size: 11px;
      letter-spacing: 2px;
      cursor: pointer;
      transition: all 0.15s;
      margin-top: 6px;
    }

    .btn-ghost:hover { border-color: var(--pink); color: var(--pink); }

    .or-divider {
      display: flex; align-items: center; gap: 12px;
      margin: 14px 0; font-size: 9px; color: var(--muted); letter-spacing: 3px; text-transform: uppercase;
    }
    .or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    .tweet-box {
      background: var(--dark);
      border: 1px solid var(--border);
      border-left: 2px solid var(--pink);
      padding: 14px 16px;
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 14px;
      white-space: pre-line;
    }

    .copy-btn {
      font-size: 9px; color: var(--muted); background: none;
      border: 1px solid var(--border); padding: 4px 12px; cursor: pointer;
      font-family: 'Share Tech Mono', monospace; letter-spacing: 2px;
      margin-top: 10px; transition: all 0.2s; text-transform: uppercase;
    }
    .copy-btn:hover { color: var(--pink); border-color: var(--pink); }

    .field-label { font-size: 9px; letter-spacing: 3px; color: var(--muted); text-transform: uppercase; margin-bottom: 6px; margin-top: 14px; display: block; }

    .confirm-box { border: 1px solid var(--border); margin: 18px 0; }
    .confirm-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 14px; border-bottom: 1px solid var(--border); gap: 16px; }
    .confirm-row:last-child { border-bottom: none; }
    .confirm-label { font-size: 9px; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; padding-top: 1px; }
    .confirm-value { color: var(--pink); word-break: break-all; text-align: right; font-size: 11px; }

    .verify-badge {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; margin: 14px 0;
      border: 1px solid var(--border);
      font-size: 11px;
    }
    .verify-badge.pass { border-color: #2a5a2a; background: rgba(0,255,0,0.04); color: #5aff5a; }
    .verify-badge.fail { border-color: #5a2a2a; background: rgba(255,0,0,0.04); color: #ff6b6b; }
    .verify-badge.checking { border-color: var(--border); color: var(--muted); }
    .verify-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

    .error-msg {
      font-size: 10px; color: #ff6b6b; letter-spacing: 1px;
      margin-top: 10px; display: none; padding: 8px 12px;
      background: rgba(255,107,107,0.06); border-left: 2px solid #ff6b6b;
    }

    .referral-box {
      background: var(--dark);
      border: 1px solid var(--border);
      border-left: 2px solid var(--pink);
      padding: 20px;
      margin: 20px 0 0;
    }

    .referral-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 3px; margin-bottom: 6px; }
    .referral-desc { font-size: 10px; color: var(--muted); letter-spacing: 1px; line-height: 1.8; margin-bottom: 14px; }

    .referral-link-row { display: flex; gap: 8px; align-items: stretch; }

    .referral-link-display {
      flex: 1;
      background: #0a0a0a;
      border: 1px solid var(--border);
      color: var(--pink);
      font-family: 'Share Tech Mono', monospace;
      font-size: 10px;
      padding: 10px 12px;
      word-break: break-all;
      line-height: 1.5;
    }

    .referral-copy-btn {
      background: var(--pink);
      color: var(--dark);
      border: none;
      font-family: 'Bebas Neue', sans-serif;
      font-size: 14px;
      letter-spacing: 2px;
      padding: 0 16px;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .referral-copy-btn:hover { background: var(--pink2); }

    .referral-counter {
      display: flex; gap: 8px; margin-top: 14px;
    }

    .ref-dot {
      flex: 1; height: 4px; background: var(--border);
      position: relative; overflow: hidden;
    }
    .ref-dot.filled { background: var(--pink); box-shadow: 0 0 6px var(--pink); }
    .ref-dot-label { font-size: 9px; color: var(--muted); letter-spacing: 2px; margin-top: 6px; text-transform: uppercase; }

    .success-screen { display: none; text-align: center; padding: 48px 28px; }
    .success-screen.visible { display: block; }
    .success-glyph { font-family: 'Bebas Neue', sans-serif; font-size: 96px; color: var(--pink); text-shadow: 0 0 50px rgba(255,138,168,0.5); display: block; margin-bottom: 18px; line-height: 1; }
    .success-title { font-family: 'Bebas Neue', sans-serif; font-size: 46px; letter-spacing: 6px; margin-bottom: 16px; }
    .success-desc { font-size: 11px; color: var(--muted); letter-spacing: 1px; line-height: 2.2; }
    .success-desc strong { color: var(--pink); font-weight: normal; }

    .blocked-screen { display: none; text-align: center; padding: 40px 28px; }
    .blocked-screen.visible { display: block; }
    .blocked-title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 4px; color: #ff6b6b; margin-bottom: 12px; }
    .blocked-desc { font-size: 11px; color: var(--muted); line-height: 2; letter-spacing: 1px; }

    .footer { text-align: center; margin-top: 18px; font-size: 9px; color: #2a2a2a; letter-spacing: 3px; text-transform: uppercase; }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spinner { display: inline-block; width: 10px; height: 10px; border: 1px solid var(--muted); border-top-color: var(--pink); border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle; }
  </style>
</head>
<body>
<div class="container">

  <div class="header">
    <a class="site-logo" href="https://megachad.xyz">$MEGACHAD</a>
    <div class="page-title">EARLY<span>ACCESS</span></div>
    <p class="page-sub">Testnet Whitelist — Limited Spots</p>
  </div>

  <div class="progress">
    <div class="progress-bar active" id="pb1"></div>
    <div class="progress-bar" id="pb2"></div>
    <div class="progress-bar" id="pb3"></div>
    <div class="progress-bar" id="pb4"></div>
  </div>

  <div class="card" id="mainCard">

    <div id="step1">
      <div class="step-label">Step 01 / 04</div>
      <div class="step-title">Connect Wallet</div>
      <div class="step-desc">You need to hold at least some $MEGACHAD or own a looksmaxx NFT to qualify for testnet access.</div>

      <button class="btn" id="metamaskBtn" onclick="connectMetaMask()">Connect Wallet</button>

      <div class="or-divider">or paste manually</div>

      <input type="text" id="manualWallet" placeholder="0x... your wallet address"/>
      <button class="btn-ghost" onclick="useManualWallet()">Use This Address &rarr;</button>

      <div id="verifyStatus" style="display:none;">
        <div class="verify-badge checking" id="tokenBadge">
          <span class="verify-dot"></span>
          <span id="tokenBadgeText"><span class="spinner"></span> Checking $MEGACHAD balance...</span>
        </div>
        <div class="verify-badge checking" id="nftBadge">
          <span class="verify-dot"></span>
          <span id="nftBadgeText"><span class="spinner"></span> Checking looksmaxx NFT...</span>
        </div>
      </div>

      <div class="error-msg" id="walletError"></div>
      <div class="error-msg" id="eligibilityError"></div>
    </div>

    <div id="step2" style="display:none;">
      <div class="step-label">Step 02 / 04</div>
      <div class="step-title">Post the Tweet</div>
      <div class="step-desc">Copy and post the tweet below from your X account, then paste the URL and your handle to verify.</div>

      <div class="tweet-box">this is my proof of early access to @megachadxyz testnet<br/><br/>bringing defi summer vibes to @megaeth<br/><br/>$MEGACHAD<button class="copy-btn" onclick="copyTweet(this)" style="display:block; margin-top:10px;">Copy</button></div>

      <button class="btn" style="margin-top:0; margin-bottom:18px;" onclick="openTweet()">Post on X &nearr;</button>

      <span class="field-label">Paste your tweet URL</span>
      <input type="text" id="tweetUrlInput" placeholder="https://x.com/yourname/status/..."/>

      <span class="field-label">Your X / Twitter handle</span>
      <input type="text" id="twitterHandleInput" placeholder="@yourhandle"/>

      <button class="btn" onclick="verifyAndProceed()">Verify & Continue</button>
      <div class="error-msg" id="tweetError"></div>
    </div>

    <div id="step3" style="display:none;">
      <div class="step-label">Step 03 / 04</div>
      <div class="step-title">Confirm & Submit</div>
      <div class="step-desc">Review your details. Each wallet and Twitter account can only be registered once.</div>

      <div class="confirm-box">
        <div class="confirm-row">
          <span class="confirm-label">Wallet</span>
          <span class="confirm-value" id="confirmWallet">&mdash;</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Twitter</span>
          <span class="confirm-value" id="confirmTwitter">&mdash;</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Tweet</span>
          <span class="confirm-value" id="confirmTweet" style="font-size:9px;">&mdash;</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Referred by</span>
          <span class="confirm-value" id="confirmRef">&mdash;</span>
        </div>
      </div>

      <button class="btn" id="submitBtn" onclick="submitWhitelist()">Secure My Spot</button>
      <div class="error-msg" id="submitError"></div>
    </div>

    <div id="step4" style="display:none;">
      <div class="step-label">Step 04 / 04</div>
      <div class="step-title">Your Referral Link</div>
      <div class="step-desc">You're in. Now share your link &mdash; get 3 people to sign up through it and earn access to testnet.</div>

      <div class="referral-box">
        <div class="referral-title">Testnet Eligibility</div>
        <div class="referral-desc">
          Get 3 referrals to sign up using your link to earn access to testnet.
        </div>

        <div class="referral-link-row">
          <div class="referral-link-display" id="referralLinkDisplay">generating...</div>
          <button class="referral-copy-btn" onclick="copyReferralLink()">COPY</button>
        </div>

        <div style="margin-top: 16px;">
          <div class="ref-dot-label">Referrals (0 / 3)</div>
          <div class="referral-counter">
            <div class="ref-dot" id="rd1"></div>
            <div class="ref-dot" id="rd2"></div>
            <div class="ref-dot" id="rd3"></div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <div class="card success-screen" id="successCard">
    <span class="success-glyph">&#10022;</span>
    <div class="success-title">You're In, Chad.</div>
    <div class="success-desc">
      Your spot has been secured.<br/>
      <strong>$MEGACHAD</strong> testnet early access confirmed.<br/><br/>
      DeFi Summer is coming back to MegaETH.<br/>
      Stay tuned at <strong>@megachadxyz</strong>
    </div>
  </div>

  <div class="card blocked-screen" id="blockedCard">
    <div class="blocked-title">Already Registered</div>
    <div class="blocked-desc">
      This wallet or Twitter account is already on the list.<br/>
      One entry per person. No exceptions.
    </div>
  </div>

  <div class="footer">megachad.xyz &mdash; looksmaxxing on megaeth</div>

</div>

<script>
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwOnxR8mbFVNHayPWpc6kWwjP-hhnkAnKNfTMujysVwQ6M1ckOn7fT7-4yWcm_JQetk/exec';
  const MEGACHAD_TOKEN = '0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888';
  const MEGAETH_RPC = 'https://megaeth.drpc.org';
  const OPENSEA_COLLECTION = 'megachad';
  const OPENSEA_CHAIN = 'megaeth';

  const TWEET_TEXT = "this is my proof of early access to @megachadxyz testnet\\n\\nbringing defi summer vibes to @megaeth\\n\\n" + "$" + "MEGACHAD";

  let walletAddress = null;
  let twitterHandle = null;
  let tweetUrl = null;
  let referredBy = null;
  let myReferralCode = null;

  window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      referredBy = ref;
      document.getElementById('confirmRef').textContent = ref;
    }
  });

  async function checkTokenBalance(address) {
    const data = '0x70a08231' + address.slice(2).toLowerCase().padStart(64, '0');
    const rpcs = [
      'https://megaeth.drpc.org',
      'https://mainnet.megaeth.com/rpc',
      'https://rpc-megaeth-mainnet.globalstake.io'
    ];

    for (const rpc of rpcs) {
      try {
        const res = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'eth_call',
            params: [{ to: MEGACHAD_TOKEN, data }, 'latest']
          })
        });
        const json = await res.json();
        console.log('RPC response from', rpc, json);
        if (json.result && json.result !== '0x' && json.result !== '0x' + '0'.repeat(64)) {
          const balance = BigInt(json.result);
          console.log('Balance:', balance.toString());
          return balance > 0n;
        }
      } catch (e) {
        console.log('RPC failed:', rpc, e.message);
        continue;
      }
    }
    console.warn('All RPCs failed — failing open');
    return true;
  }

  async function checkNFTBalance(address) {
    const NFT_CONTRACT = '0x1f1eFd3476b95091B9332b2d36a24bDE12CC6296';
    const data = '0x70a08231' + address.slice(2).toLowerCase().padStart(64, '0');
    const rpcs = [
      'https://megaeth.drpc.org',
      'https://mainnet.megaeth.com/rpc',
      'https://rpc-megaeth-mainnet.globalstake.io'
    ];

    for (const rpc of rpcs) {
      try {
        const res = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 2, method: 'eth_call',
            params: [{ to: NFT_CONTRACT, data }, 'latest']
          })
        });
        const json = await res.json();
        console.log('NFT RPC response from', rpc, json);
        if (json.result && json.result !== '0x' && json.result !== '0x' + '0'.repeat(64)) {
          const balance = BigInt(json.result);
          console.log('NFT Balance:', balance.toString());
          return balance > 0n;
        }
      } catch (e) {
        console.log('NFT RPC failed:', rpc, e.message);
        continue;
      }
    }
    console.warn('All NFT RPCs failed — failing open');
    return true;
  }

  async function runEligibilityCheck(address) {
    document.getElementById('verifyStatus').style.display = 'block';

    const [hasTokens, hasNFT] = await Promise.all([
      checkTokenBalance(address),
      checkNFTBalance(address)
    ]);

    const tokenBadge = document.getElementById('tokenBadge');
    const nftBadge = document.getElementById('nftBadge');
    const tokenText = document.getElementById('tokenBadgeText');
    const nftText = document.getElementById('nftBadgeText');

    tokenBadge.className = 'verify-badge ' + (hasTokens ? 'pass' : 'fail');
    tokenText.innerHTML = hasTokens ? '\u2713 $MEGACHAD balance confirmed' : '\u2717 No $MEGACHAD found in this wallet';

    nftBadge.className = 'verify-badge ' + (hasNFT ? 'pass' : 'fail');
    nftText.innerHTML = hasNFT ? '\u2713 Looksmaxx NFT found' : '\u2717 No looksmaxx NFT found';

    const eligible = hasTokens || hasNFT;

    if (!eligible) {
      const err = document.getElementById('eligibilityError');
      err.textContent = "This wallet doesn't hold any $MEGACHAD or a looksmaxx NFT. You need at least one to qualify.";
      err.style.display = 'block';
      const btn = document.getElementById('metamaskBtn');
      btn.textContent = 'Connect Wallet';
      btn.disabled = false;
      walletAddress = null;
      return;
    }

    setTimeout(() => goToStep2(), 800);
  }

  async function connectMetaMask() {
    const err = document.getElementById('walletError');
    const btn = document.getElementById('metamaskBtn');
    err.style.display = 'none';
    document.getElementById('eligibilityError').style.display = 'none';

    if (!window.ethereum) {
      err.textContent = 'No wallet detected. Please paste your wallet address below.';
      err.style.display = 'block';
      return;
    }

    try {
      btn.textContent = 'Connecting...';
      btn.disabled = true;
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      walletAddress = accounts[0].toLowerCase();
      btn.textContent = 'Checking eligibility...';
      await runEligibilityCheck(walletAddress);
    } catch (e) {
      btn.textContent = 'Connect Wallet';
      btn.disabled = false;
      err.textContent = 'Connection rejected. Try again or paste your address below.';
      err.style.display = 'block';
    }
  }

  async function useManualWallet() {
    const val = document.getElementById('manualWallet').value.trim();
    const err = document.getElementById('walletError');
    err.style.display = 'none';
    document.getElementById('eligibilityError').style.display = 'none';

    if (!val.startsWith('0x') || val.length !== 42) {
      err.textContent = 'Enter a valid EVM wallet address starting with 0x (42 characters).';
      err.style.display = 'block';
      return;
    }

    walletAddress = val.toLowerCase();
    await runEligibilityCheck(walletAddress);
  }

  function goToStep2() {
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('pb1').classList.replace('active', 'done');
    document.getElementById('pb2').classList.add('active');
  }

  function openTweet() {
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(TWEET_TEXT), '_blank');
  }

  function copyTweet(btn) {
    navigator.clipboard.writeText(TWEET_TEXT);
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  }

  function verifyAndProceed() {
    const urlVal = document.getElementById('tweetUrlInput').value.trim();
    const handleVal = document.getElementById('twitterHandleInput').value.trim();
    const err = document.getElementById('tweetError');
    err.style.display = 'none';

    if ((!urlVal.includes('twitter.com') && !urlVal.includes('x.com')) || !urlVal.includes('/status/')) {
      err.textContent = 'Please paste a valid tweet URL (x.com/yourname/status/...).';
      err.style.display = 'block';
      return;
    }

    if (!handleVal || handleVal.length < 2) {
      err.textContent = 'Please enter your Twitter handle.';
      err.style.display = 'block';
      return;
    }

    tweetUrl = urlVal;
    twitterHandle = handleVal.startsWith('@') ? handleVal.toLowerCase() : '@' + handleVal.toLowerCase();

    const shortWallet = walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4);
    document.getElementById('confirmWallet').textContent = shortWallet;
    document.getElementById('confirmTwitter').textContent = twitterHandle;
    document.getElementById('confirmTweet').textContent = tweetUrl;
    if (!referredBy) document.getElementById('confirmRef').textContent = 'none';

    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
    document.getElementById('pb2').classList.replace('active', 'done');
    document.getElementById('pb3').classList.add('active');
  }

  function generateCode(wallet, twitter) {
    const raw = wallet.slice(2, 8) + twitter.replace('@', '').slice(0, 4);
    return raw.toLowerCase();
  }

  async function submitWhitelist() {
    const btn = document.getElementById('submitBtn');
    const err = document.getElementById('submitError');
    err.style.display = 'none';
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    myReferralCode = generateCode(walletAddress, twitterHandle);

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          twitter: twitterHandle,
          tweetUrl: tweetUrl,
          referredBy: referredBy || '',
          referralCode: myReferralCode,
          timestamp: new Date().toISOString()
        })
      });

      document.getElementById('step3').style.display = 'none';
      document.getElementById('step4').style.display = 'block';
      document.getElementById('pb3').classList.replace('active', 'done');
      document.getElementById('pb4').classList.add('active');

      const referralLink = window.location.origin + window.location.pathname + '?ref=' + myReferralCode;
      document.getElementById('referralLinkDisplay').textContent = referralLink;

    } catch (e) {
      btn.textContent = 'Secure My Spot';
      btn.disabled = false;
      err.textContent = 'Something went wrong. Please try again.';
      err.style.display = 'block';
    }
  }

  function copyReferralLink() {
    const link = document.getElementById('referralLinkDisplay').textContent;
    navigator.clipboard.writeText(link);
    const btn = event.target;
    btn.textContent = 'COPIED!';
    setTimeout(() => btn.textContent = 'COPY', 2000);
  }
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
