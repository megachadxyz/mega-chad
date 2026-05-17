'use client';

import Link from 'next/link';
import { MainNav } from '@/components/MainNav';

export default function DocsPage() {
  return (
    <>
      <MainNav />
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/main" className="back-link">← Back to App</Link>

        <h1>Documentation</h1>

        <section>
          <h2>Overview</h2>
          <p>
            MegaChad is a two-token economy on MegaETH: a meme-burn primitive ($MEGACHAD) bolted to a
            full on-chain DeFi and governance stack (MEGA Protocol). This page is the canonical reference
            for every contract, surface, and API the project exposes.
          </p>
          <p>
            <strong>Tokens.</strong> $MEGACHAD is the deflationary base asset — you burn 225,000 of it to
            mint a Looksmaxxed NFT. $MEGAGOONER is the governance and reward token — emitted over 225 weeks
            to stakers, LPs, and the treasury via a quadratic emission curve.
          </p>
          <p>
            <strong>Chain.</strong> Everything below runs on MegaETH mainnet (chain ID <code>4326</code>),
            with sub-second blocks and ~0.001 gwei fees.
          </p>
        </section>

        <section>
          <h2>1. Wallet Setup</h2>
          <h3>Install a Web3 Wallet</h3>
          <p>You need a wallet that supports custom EVM networks:</p>
          <ul>
            <li>MetaMask</li>
            <li>Brave Wallet</li>
            <li>Phantom (EVM mode)</li>
            <li>Rabby</li>
          </ul>

          <h3>MegaETH Network Details</h3>
          <p>Auto-added when you press CONNECT WALLET. Manual values:</p>
          <ul>
            <li><strong>Name:</strong> MegaETH</li>
            <li><strong>Chain ID:</strong> 4326</li>
            <li><strong>RPC:</strong> https://mainnet.megaeth.com/rpc</li>
            <li><strong>WebSocket:</strong> wss://mainnet.megaeth.com/ws</li>
            <li><strong>Currency:</strong> ETH</li>
            <li><strong>Explorer:</strong> megaexplorer.xyz</li>
            <li><strong>Block time:</strong> ~250ms</li>
            <li><strong>Gas price:</strong> 0.001 gwei (use <code>--legacy</code> for tooling)</li>
          </ul>
        </section>

        <section>
          <h2>2. Get $MEGACHAD</h2>
          <p>225,000 $MEGACHAD is the cost of one Looksmaxxed image. Half is burned to the dead address; half goes to the Tren Fund treasury.</p>
          <p><strong>Contract:</strong> <code>0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888</code></p>
          <p>
            <strong>How to buy:</strong> bridge ETH to MegaETH via{' '}
            <a href="https://rabbithole.megaeth.com/bridge" target="_blank" rel="noopener noreferrer" className="external-link">Rabbithole</a>
            {' '}(Ethereum, Base, Arbitrum, Optimism, Polygon, BNB, Avalanche, Scroll, zkSync, Linea), then swap
            on Kumbaya DEX or use the built-in swap on the <Link href="/main#buy" className="inline-link">main page</Link>.
          </p>
        </section>

        <section>
          <h2>3. Burn & Looksmaxx</h2>
          <ol>
            <li>Go to <Link href="/main" className="inline-link">/main</Link></li>
            <li>Press CONNECT WALLET</li>
            <li>Upload a portrait (JPEG/PNG, max 4MB)</li>
            <li>Optionally enable <strong>Warren</strong> on-chain permanent storage (~$5)</li>
            <li>Press BURN &amp; LOOKSMAXX</li>
            <li>Approve two transfers: 112,500 to the dead address + 112,500 to the Tren Fund</li>
            <li>AI generation runs (1–2 minutes), image pins to IPFS, NFT mints</li>
          </ol>
          <p className="note">
            <strong>Gasless option:</strong> sign an EIP-712 typed message; the relayer pays gas and submits
            your burn on-chain. Approve the relayer once, then no further transactions are required.
          </p>
        </section>

        <section>
          <h2>4. Storage</h2>
          <h3>IPFS (default, free)</h3>
          <ul>
            <li>Pinned via Pinata, accessible from any public gateway</li>
            <li>Content-addressed CID embedded in NFT metadata</li>
          </ul>
          <h3>Warren Protocol (~$5)</h3>
          <ul>
            <li>Image bytes written directly into MegaETH state</li>
            <li>Cannot be censored, removed, or rugged</li>
            <li>NFT metadata points at the on-chain bytes</li>
          </ul>
        </section>

        <section>
          <h2>5. MEGA Protocol Overview</h2>
          <p>
            MEGA Protocol is the governance and DeFi layer wrapped around $MEGACHAD. Every contract is a
            UUPS upgradeable proxy controlled by the admin role (Tren Fund) until governance hands itself
            the keys. The flow:
          </p>
          <ol>
            <li><strong>Mint:</strong> EmissionController mints $MEGAGOONER each week from a hard-coded quadratic curve.</li>
            <li><strong>Distribute:</strong> 45% goes to MoggerStaking, 40% to JESTERGOONER, 15% to the Tren Fund treasury.</li>
            <li><strong>Earn:</strong> Stakers and LPs accrue rewards as a continuous Synthetix-style drip over 7-day windows.</li>
            <li><strong>Govern:</strong> Top-3 weekly $MEGACHAD burners earn proposal rights; $MEGAGOONER holders vote.</li>
            <li><strong>Backstop:</strong> The top-20 NFT holders form a Veto Council that can kill any malicious proposal.</li>
          </ol>
          <p>
            Open the <Link href="/main/protocol" className="inline-link">Protocol page</Link> to interact
            with all of this from one UI.
          </p>
        </section>

        <section>
          <h2>6. Token Economics: $MEGAGOONER</h2>
          <ul>
            <li><strong>Symbol:</strong> MEGAGOONER</li>
            <li><strong>Standard:</strong> ERC20 with ERC20Snapshot extension (flash-loan-proof voting)</li>
            <li><strong>Contract:</strong> <code>0x11d819Dbd6e9aF0b13A54e88EA411155764e3F46</code></li>
            <li><strong>Max supply:</strong> 50,000,000 (hard cap, enforced in <code>_mint</code>)</li>
            <li><strong>Genesis airdrop:</strong> 2,500,000 minted to palantirthot at deploy (5% of cap)</li>
            <li><strong>Emission curve:</strong> 225 weeks (~4.33 years) of quadratic decay</li>
            <li><strong>Roles:</strong> <code>MINTER_ROLE</code> (EmissionController only), <code>BURNER_ROLE</code> (Framemogger only), <code>SNAPSHOT_ROLE</code> (Jestermogger for vote checkpoints)</li>
          </ul>
          <h3>Genesis</h3>
          <p>
            DeFi genesis timestamp: <code>1778941561</code> (2026-05-16 14:26:01 UTC). Week numbers count
            forward from this anchor; week 0 is the first 7-day window.
          </p>
        </section>

        <section>
          <h2>7. EmissionController</h2>
          <p>
            <strong>Proxy:</strong> <code>0x9CBB09555395643abc016b586D7d890E6911a013</code>
          </p>
          <p>
            The EmissionController is the single source of $MEGAGOONER supply during the 225-week emission
            window. It mints to the staking contracts and the treasury on a per-week basis using a
            deterministic quadratic decay formula.
          </p>

          <h3>Quadratic Decay Formula</h3>
          <p>
            <code>weeklyEmission(w) = 662,245 × ((225 − w) / 225)²</code>
          </p>
          <ul>
            <li>Week 0: ~662,245 MEGAGOONER</li>
            <li>Week 56 (25%): ~373k MEGAGOONER</li>
            <li>Week 112 (50%): ~166k MEGAGOONER</li>
            <li>Week 168 (75%): ~41k MEGAGOONER</li>
            <li>Week 224 (final): ~13 MEGAGOONER</li>
            <li>Week 225+: 0</li>
          </ul>
          <p>
            The integral of the curve plus the 2.5M genesis airdrop hits the 50M cap exactly, so no extra
            $MEGAGOONER can ever be minted.
          </p>

          <h3>Emission Split</h3>
          <p>Each week's emission is split three ways (basis points):</p>
          <ul>
            <li><strong>MoggerStaking:</strong> 45% (4,500 bps) — drips to $MEGACHAD stakers</li>
            <li><strong>JESTERGOONER:</strong> 40% (4,000 bps) — drips to MC/MG LP stakers</li>
            <li><strong>Treasury (Tren Fund):</strong> 15% (1,500 bps) — protocol-owned liquidity, audits, ops</li>
          </ul>
          <p>
            Governance can adjust each line ±5% within hard bounds (Treasury 10–20%, Staking 40–50%,
            LP 35–45%), once per <strong>90-day cooldown</strong>. The sum must always equal 10,000 bps.
          </p>

          <h3>Catch-Up Distribution</h3>
          <p>
            <code>distributeEmissions()</code> walks every unclaimed week from <code>lastProcessedWeek</code>
            up to <code>getCurrentWeek()</code> in a single transaction, mints the aggregate, and calls
            <code>notifyRewardAmount()</code> on both staking pools. Weeks can never be skipped — if nobody
            triggers a distribution for a month, the next caller scoops the entire backlog in one shot.
          </p>

          <h3>Auto-Distribution</h3>
          <p>
            A Vercel cron at <code>/api/cron/distribute</code> runs daily at 00:00 UTC. It calls
            <code>MoggerStaking.distributeWeeklyRewards()</code> (which routes through EmissionController and
            notifies both pools) but only when <code>periodFinish &lt; now</code>, so it no-ops if the current
            7-day drip window is still active. Users never need to touch this — the cron makes the protocol
            self-sustaining.
          </p>
        </section>

        <section>
          <h2>8. MoggerStaking</h2>
          <p>
            <strong>Proxy:</strong> <code>0xfd820E6189Eb3396dA71cB072643A0E1e1239853</code>
            <br />
            <strong>Stake token:</strong> $MEGACHAD &nbsp;&middot;&nbsp; <strong>Reward token:</strong> $MEGAGOONER
          </p>
          <p>
            Synthetix-style continuous drip pool. Stake any amount of $MEGACHAD, hold at least 1 Looksmaxxed
            NFT to be eligible, and earn $MEGAGOONER every block. There is <strong>no lock period</strong>
            and no minimum stake — unstake anytime.
          </p>

          <h3>Reward Math</h3>
          <p>
            On <code>notifyRewardAmount(R)</code> the contract sets
            <code>rewardRate = (R + leftover) / 7&nbsp;days</code> and starts a fresh 7-day drip window.
            Per-second reward share for a staker is:
          </p>
          <p>
            <code>userShare = (effectiveStake / totalEffectiveStake) × rewardRate × Δt</code>
          </p>
          <p>
            Where <code>effectiveStake = stakedAmount × nftMultiplier / 10000</code>. The UI's APR widget
            extrapolates: <code>APR = rewardRate × secondsPerYear / totalEffectiveStake</code>.
          </p>

          <h3>NFT Boost Tiers</h3>
          <ul>
            <li><strong>No NFT:</strong> 0× (you cannot accrue any rewards)</li>
            <li><strong>Tier 1 (1–9 NFTs):</strong> 1.000×</li>
            <li><strong>Tier 2 (10–24 NFTs):</strong> 1.075×</li>
            <li><strong>Tier 3 (25+ NFTs):</strong> 1.150×</li>
          </ul>
          <p>
            Multipliers are snapshotted on every stake / unstake / claim to block flash-borrow gaming. If
            you grow your NFT bag mid-stake, call <code>refreshEffectiveStake()</code> (or just touch the
            position) to upgrade your tier on-chain.
          </p>

          <h3>Buffered Rewards Safety</h3>
          <p>
            If <code>notifyRewardAmount</code> fires while <code>totalEffectiveStake == 0</code> (nobody is
            staked yet) the rewards are parked in <code>bufferedRewards</code> instead of getting silently
            burned via division. As soon as someone stakes, the next notify auto-folds the buffer into the
            drip rate. Admins can also <code>flushBufferedRewards()</code> to release it immediately.
          </p>
        </section>

        <section>
          <h2>9. JESTERGOONER V4 (LP Staking)</h2>
          <p>
            <strong>Proxy:</strong> <code>0x2695965Dd283e2425fab5C4c1E0955656802569c</code>
            <br />
            <strong>Implementation (V4):</strong> <code>0x8BD2ACF3F97d4398A16dC928cAb4C002824646F6</code>
            <br />
            <strong>Stake token:</strong> MC/MG LP &nbsp;&middot;&nbsp; <strong>Reward token:</strong> $MEGAGOONER
          </p>
          <p>
            Mirror of MoggerStaking but for liquidity providers. Stake your MC/MG LP tokens, earn the
            40% LP-share of weekly $MEGAGOONER emissions on a continuous drip.
          </p>

          <h3>V4 Changes</h3>
          <p>
            V4 is the live version of this contract. Compared to V3 (deprecated):
          </p>
          <ul>
            <li><strong>No lock period.</strong> <code>MIN_LOCK_DURATION = 0</code>. Unstake anytime.</li>
            <li><strong>No time multiplier.</strong> <code>getTimeMultiplier()</code> always returns 10000 (1.000×). Your effective stake is just <code>LP × nftMultiplier</code>.</li>
            <li><strong>Buffer flush.</strong> Admins can call <code>flushBufferedRewards()</code> to release trapped buffer into a fresh 7-day drip. This was used at V4 upgrade to release 264,898 MEGAGOONER stuck in the buffer.</li>
          </ul>

          <h3>NFT Boost</h3>
          <p>Same tiers as MoggerStaking — 0× / 1.000× / 1.075× / 1.150× based on NFT count.</p>

          <h3>LP Token Migration</h3>
          <p>
            JESTERGOONER's <code>lpToken</code> can be set exactly once via <code>setLpToken()</code>,
            transitioning from the placeholder ERC20 to the real MC/MG pair. After that one-shot, the field
            is locked. Today's value points at <code>0x437a433534FF6e7712D7e0A03Fa6CE577EeA1fef</code>
            (MegaChadLP_MC_MG).
          </p>
        </section>

        <section>
          <h2>10. MEGACHAD/MEGAGOONER AMM Pair</h2>
          <p>
            <strong>Pair:</strong> <code>0x437a433534FF6e7712D7e0A03Fa6CE577EeA1fef</code>
            <br />
            <strong>Type:</strong> Constant-product (<code>x · y = k</code>) — Uniswap V2-equivalent math
            <br />
            <strong>Fee:</strong> 0.3% on swaps (accrues to LPs)
          </p>
          <p>
            Custom in-house AMM pair (<code>MegaChadLP.sol</code>). LP tokens use the standard
            <code>sqrt(a · b) − 1000</code> formula for initial mint and proportional shares thereafter.
          </p>

          <h3>Add Liquidity</h3>
          <p>
            Call <code>addLiquidity(amountA, amountB, to)</code> with $MEGACHAD and $MEGAGOONER. If the pool
            is empty you set the initial price; otherwise you must match the current ratio
            (<code>reserveA / reserveB</code>). LP tokens mint to <code>to</code>.
          </p>

          <h3>Remove Liquidity</h3>
          <p>
            <code>removeLiquidity(liquidity, to)</code> burns LP tokens and returns
            <code>amountA</code> and <code>amountB</code> proportional to your share of <code>totalSupply</code>.
          </p>

          <h3>Swap</h3>
          <p>
            <code>swap(amountAIn, amountBIn, to)</code> takes one of the two inputs as zero. Output is
            computed with the standard <code>(in × 997 × reserveOut) / (reserveIn × 1000 + in × 997)</code>
            (Uniswap V2's 0.3% fee math). Pre-transfer input tokens before calling, just like Uni V2.
          </p>

          <h3>UI Integration</h3>
          <p>
            The Protocol page exposes Add Liquidity, Remove Liquidity, and Swap tabs that wire directly to
            this pair. Slippage is currently fixed at 1%; price impact and reserves are read live from
            <code>getReserves()</code>.
          </p>
        </section>

        <section>
          <h2>11. Framemogger (Burn-to-Govern)</h2>
          <p>
            <strong>Proxy:</strong> <code>0xce320179Fb66E088635f789881A939321682E0c5</code>
          </p>
          <p>
            Framemogger is the on-ramp to governance. Burn $MEGACHAD to the Tren Fund, watch
            $MEGAGOONER get deflated in lockstep, and compete for one of three weekly proposal slots.
          </p>

          <h3>Burn Mechanics</h3>
          <ul>
            <li><strong>Input:</strong> <code>sendMegachad(amount)</code> with at least 1 $MEGACHAD</li>
            <li><strong>Eligibility:</strong> caller must hold at least 1 Looksmaxxed NFT</li>
            <li><strong>$MEGACHAD route:</strong> transferred to Tren Fund (NOT burned — it's protocol revenue)</li>
            <li><strong>$MEGAGOONER deflation:</strong> 10% of the $MEGACHAD amount is burned from the caller's $MEGAGOONER balance (1 MEGACHAD ⇒ 0.1 MEGAGOONER burned)</li>
          </ul>
          <p>
            So if you send 100,000 $MEGACHAD, you also burn 10,000 $MEGAGOONER. That deflationary pressure
            applies upward force on price as supply contracts.
          </p>

          <h3>Weekly Leaderboard</h3>
          <p>
            Each 7-day window tracks per-user $MEGACHAD sent. At all times the top 3 burners can call
            <code>Jestermogger.propose()</code>. <code>canPropose(account)</code> returns true if you're in
            this week's current top 3. Slots are recomputed in real time as new burns land.
          </p>

          <h3>Historical Data</h3>
          <ul>
            <li><code>getWeekTop3(week)</code> — final standings for a closed week</li>
            <li><code>getWeekStats(week)</code> — total burned, unique burners, time left</li>
            <li><code>totalSentAllTime()</code> — protocol-wide accumulator</li>
            <li><code>totalMegagoonerBurned()</code> — running deflation counter</li>
          </ul>
        </section>

        <section>
          <h2>12. Jestermogger (Governance)</h2>
          <p>
            <strong>Proxy:</strong> <code>0x75C38E514Ba9FEeb6EEEeF4cdEb88074Ade0582b</code>
          </p>
          <p>
            Token-weighted on-chain governance. The current top-3 weekly burners can submit proposals;
            all $MEGAGOONER holders vote, weighted by their snapshot balance at proposal start.
          </p>

          <h3>Proposal Lifecycle</h3>
          <ol>
            <li><strong>Propose</strong> — <code>propose(targets, values, calldatas, description)</code>. Restricted to current week's top 3 burners. State = <code>Pending</code>.</li>
            <li><strong>Voting delay</strong> — 1 day for community review before voting opens.</li>
            <li><strong>Active</strong> — voting window opens for 3 days. Cast <code>For</code>, <code>Against</code>, or <code>Abstain</code>. One vote per address per proposal.</li>
            <li><strong>Quorum check</strong> — needs ≥ 50% of $MEGAGOONER circulating supply (snapshotted) and a simple majority of For-vs-Against. Else <code>Defeated</code>.</li>
            <li><strong>Succeeded</strong> — must be queued within 7 days (grace period) or the proposal expires.</li>
            <li><strong>Queued</strong> — sits in 2-day timelock. During this window the NFT Veto Council can kill it.</li>
            <li><strong>Executable</strong> — after timelock, <code>execute()</code> fires all targets in order. 7-day grace window before it expires.</li>
            <li><strong>Executed / Vetoed / Expired</strong> — terminal states.</li>
          </ol>

          <h3>Parameters</h3>
          <ul>
            <li><code>VOTING_DELAY</code>: 1 day</li>
            <li><code>VOTING_PERIOD</code>: 3 days</li>
            <li><code>TIMELOCK_PERIOD</code>: 2 days</li>
            <li><code>GRACE_PERIOD</code>: 7 days</li>
            <li><code>QUORUM_PERCENTAGE</code>: 50</li>
          </ul>
          <p>
            Snapshot voting (via the ERC20Snapshot extension on $MEGAGOONER) means flash loans can't
            inflate vote weight — your balance is locked in at the proposal's start time.
          </p>
        </section>

        <section>
          <h2>13. NFT Veto Council</h2>
          <p>
            <strong>Proxy:</strong> <code>0xbE985E5159cDFE8d33b4E61644495B38cCb46468</code>
          </p>
          <p>
            A 20-seat council composed of the top Looksmaxxed NFT holders, recomputed on-demand by
            <code>updateCouncil(maxTokenId)</code>. Council members can veto any queued or executable proposal.
          </p>

          <h3>Veto Flow</h3>
          <ol>
            <li>Anyone calls <code>startVetoVote(proposalId)</code> on a Queued proposal.</li>
            <li>The 20 council members have <strong>2 days</strong> to cast a Yes/No vote.</li>
            <li>If <strong>≥ 11 Yes votes</strong> arrive (&gt;50% of seats), <code>VetoCast</code> → <code>executeVeto()</code> marks the proposal Vetoed. It can no longer be executed.</li>
            <li>If the window expires below threshold, the veto fails and the proposal proceeds.</li>
          </ol>
          <p>
            This is an emergency brake — token-weighted governance handles the day-to-day, but if a hostile
            actor accumulates $MEGAGOONER and pushes a malicious proposal through, the long-term NFT
            holders can shut it down.
          </p>
        </section>

        <section>
          <h2>14. CircuitBreaker</h2>
          <p>
            <strong>Proxy:</strong> <code>0x8C6c634D0B698de2E98713E5a02f7905b117beAE</code>
          </p>
          <p>
            Global pause switch. Five guardian addresses (multisig-style) can trigger a pause; admin can
            unpause. When paused, <code>distributeEmissions()</code>, staking, and proposal execution all
            revert with <code>ProtocolPaused</code>. Reads remain live, so the UI keeps rendering.
          </p>
          <ul>
            <li><strong>Guardians:</strong> 5 addresses, any one can pause</li>
            <li><strong>Admin:</strong> Tren Fund (<code>0x85bf…370C</code>) until governance transfers itself the role</li>
          </ul>
        </section>

        <section>
          <h2>15. Contract Address Index (Mainnet)</h2>
          <p>
            <strong>Deployed:</strong> 2026-05-16 &nbsp;&middot;&nbsp; <strong>Deployer:</strong> <code>0x85bf9272DEA7dff1781F71473187b96c6f2f370C</code>
          </p>
          <ul>
            <li><strong>MegaChadToken:</strong> <code>0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888</code></li>
            <li><strong>MegaCHADNFT:</strong> <code>0x1f1eFd3476b95091B9332b2d36a24bDE12CC6296</code></li>
            <li><strong>MEGAGOONER:</strong> <code>0x11d819Dbd6e9aF0b13A54e88EA411155764e3F46</code></li>
            <li><strong>EmissionController:</strong> <code>0x9CBB09555395643abc016b586D7d890E6911a013</code></li>
            <li><strong>MoggerStaking:</strong> <code>0xfd820E6189Eb3396dA71cB072643A0E1e1239853</code></li>
            <li><strong>JESTERGOONER (V4 impl):</strong> <code>0x2695965Dd283e2425fab5C4c1E0955656802569c</code></li>
            <li><strong>MegaChadLP_MC_MG:</strong> <code>0x437a433534FF6e7712D7e0A03Fa6CE577EeA1fef</code></li>
            <li><strong>Framemogger:</strong> <code>0xce320179Fb66E088635f789881A939321682E0c5</code></li>
            <li><strong>Jestermogger:</strong> <code>0x75C38E514Ba9FEeb6EEEeF4cdEb88074Ade0582b</code></li>
            <li><strong>NFTVetoCouncil:</strong> <code>0xbE985E5159cDFE8d33b4E61644495B38cCb46468</code></li>
            <li><strong>CircuitBreaker:</strong> <code>0x8C6c634D0B698de2E98713E5a02f7905b117beAE</code></li>
            <li><strong>WETH:</strong> <code>0x4200000000000000000000000000000000000006</code></li>
            <li><strong>USDm:</strong> <code>0xfafddbb3fc7688494971a79cc65dca3ef82079e7</code></li>
            <li><strong>Burn (dEaD):</strong> <code>0x000000000000000000000000000000000000dEaD</code></li>
          </ul>
        </section>

        <section>
          <h2>16. Common DeFi Walkthroughs</h2>

          <h3>Stake $MEGACHAD for $MEGAGOONER</h3>
          <ol>
            <li>Hold at least 1 Looksmaxxed NFT (otherwise rewards accrue at 0×)</li>
            <li>Approve MoggerStaking to spend your $MEGACHAD</li>
            <li>Call <code>stake(amount)</code> — emits <code>Staked</code> event</li>
            <li>Watch <code>earned(you)</code> tick upward in real time</li>
            <li>Call <code>claimRewards()</code> any time to receive accrued $MEGAGOONER</li>
            <li>Call <code>unstake(amount)</code> to withdraw (no lock period)</li>
          </ol>

          <h3>Provide MC/MG Liquidity and Stake the LP</h3>
          <ol>
            <li>On the Protocol page → JESTERGOONER section, open <strong>Add Liquidity</strong></li>
            <li>Enter $MEGACHAD amount — $MEGAGOONER side auto-calculates from the pool ratio</li>
            <li>Approve both tokens, sign <code>addLiquidity()</code> — LP tokens land in your wallet</li>
            <li>Open <strong>Stake LP</strong>, approve the LP token, call <code>stake(amount)</code></li>
            <li>Earn the 40% emission share on top of any 0.3% swap fees from LP volume</li>
            <li>Unstake / remove liquidity at any time — no lock</li>
          </ol>

          <h3>Burn Your Way Into Governance</h3>
          <ol>
            <li>Hold 1+ Looksmaxxed NFT</li>
            <li>Acquire a meaningful $MEGACHAD bag</li>
            <li>Call <code>Framemogger.sendMegachad(amount)</code> — you also need a $MEGAGOONER bag to cover the 10% deflation</li>
            <li>Land in this week's top 3 (visible on the governance leaderboard)</li>
            <li>While ranked, call <code>Jestermogger.propose(...)</code> to submit a proposal</li>
          </ol>

          <h3>Vote on a Proposal</h3>
          <ol>
            <li>Hold $MEGAGOONER at the moment the proposal was created (the snapshot moment)</li>
            <li>Wait for <code>Pending</code> → <code>Active</code> transition (1-day delay)</li>
            <li>Call <code>castVote(proposalId, support)</code> — support: 0 = Against, 1 = For, 2 = Abstain</li>
            <li>After voting closes, anyone can <code>queue()</code> a Succeeded proposal</li>
            <li>After timelock, anyone can <code>execute()</code> it</li>
          </ol>
        </section>

        <section>
          <h2>17. Portal &amp; Natural Language</h2>
          <p>
            The <Link href="/portal" className="inline-link">MegaETH Portal</Link> is the command surface:
          </p>
          <ul>
            <li><strong>Portfolio:</strong> live balances across ETH, $MEGACHAD, $MEGAGOONER, WETH, USDm, LP</li>
            <li><strong>Protocols:</strong> curated MegaETH protocol directory</li>
            <li><strong>Activity:</strong> protocol-wide stats and stream of recent events</li>
          </ul>
          <p>NLP examples:</p>
          <ul>
            <li><code>"swap 0.1 ETH for megachad"</code></li>
            <li><code>"looksmaxx from base"</code></li>
            <li><code>"check wallet 0x…"</code></li>
            <li><code>"compare 0xABC vs 0xDEF"</code></li>
            <li><code>"show top burners"</code></li>
            <li><code>"stake 50000 megachad"</code></li>
            <li><code>"register me as an agent"</code></li>
          </ul>
        </section>

        <section>
          <h2>18. Cross-Chain Looksmaxxing</h2>
          <p>Looksmaxx from 10 source chains without manual bridging:</p>
          <ul>
            <li>Ethereum, Base, Arbitrum, Optimism, Polygon</li>
            <li>BNB Chain, Avalanche, Scroll, zkSync Era, Linea</li>
          </ul>
          <p>
            The intent engine builds a 5-step plan: bridge → swap → burn → generate → mint. Use the NLP
            bar, the <code>/api/cross-chain/intent</code> endpoint, or the <code>cross_chain_looksmaxx</code> MCP tool.
          </p>
        </section>

        <section>
          <h2>19. Identity &amp; Profiles</h2>
          <p>
            Every wallet has a <Link href="/profile/0x0000000000000000000000000000000000000000" className="inline-link">profile page</Link>:
          </p>
          <ul>
            <li><strong>MegaNames:</strong> .mega domain and social links</li>
            <li><strong>Burns:</strong> full history with IPFS thumbnails</li>
            <li><strong>Tier:</strong> Normie (0) → Mewer (1+) → Bonesmasher (3+) → Chad (10+) → Gigachad (25+)</li>
            <li><strong>Reputation:</strong> ERC-8004 on-chain rating from peers</li>
            <li><strong>Stake positions:</strong> live MoggerStaking + JESTERGOONER balances and earned rewards</li>
            <li><strong>Referral stats:</strong> for registered agents</li>
          </ul>
          <p>
            Profiles are queryable as JSON via <code>/api/identity/ADDRESS</code> by any MegaETH protocol.
          </p>
        </section>

        <section>
          <h2>20. Agent Referral Program</h2>
          <p>AI agents can register on-chain and earn commissions:</p>
          <ul>
            <li><strong>Reward:</strong> 11,250 $MEGACHAD (5%) per referred burn</li>
            <li><strong>Registration:</strong> <code>registerAgent()</code> on the referral contract or POST to <code>/api/agent/register</code></li>
            <li><strong>Referral code:</strong> Base64URL of your wallet address</li>
            <li><strong>Tracking:</strong> <code>getAgentStats()</code> or <code>/api/agent/referrals</code></li>
          </ul>
        </section>

        <section>
          <h2>21. MCP Server (20 Tools)</h2>
          <p>
            MegaChad exposes a full Model Context Protocol server. Connect:
          </p>
          <p>
            <code>npx @anthropic-ai/claude-code mcp add megachad https://megachad.xyz/api/mcp</code>
          </p>
          <ul>
            <li><code>get_megachad_stats</code> — supply, circulating, burn count</li>
            <li><code>get_price</code> — $MEGACHAD price in ETH</li>
            <li><code>get_swap_quote</code> — ETH → $MEGACHAD calldata</li>
            <li><code>get_wallet_info</code> — balances, NFT count, burn eligibility</li>
            <li><code>get_portfolio</code> — full MegaETH token portfolio</li>
            <li><code>get_gallery</code> — looksmaxxed burns with IPFS images</li>
            <li><code>get_chadboard</code> — leaderboard with reputation and .mega names</li>
            <li><code>get_identity</code> — resolve wallet or .mega name</li>
            <li><code>get_nft_metadata</code> — ERC-721 metadata</li>
            <li><code>get_looksmaxx_requirements</code> — burn requirements + x402 info</li>
            <li><code>get_looksmaxx_plan</code> — full burn transaction plan</li>
            <li><code>cross_chain_looksmaxx</code> — cross-chain plan from 10+ chains</li>
            <li><code>gasless_burn_info</code> — EIP-712 typed data for meta-tx burns</li>
            <li><code>get_bridge_info</code> — bridge options to MegaETH</li>
            <li><code>get_agent_info</code> — ERC-8004 agent data</li>
            <li><code>register_referral_agent</code> — 11,250 $MEGACHAD per referral</li>
            <li><code>get_referral_stats</code> — referrals, earnings</li>
            <li><code>register_early_access</code> — beta registration</li>
            <li><code>chat_with_megachad</code> — natural language interface</li>
            <li><code>get_megaeth_protocols</code> — MegaETH protocol directory</li>
          </ul>
        </section>

        <section>
          <h2>22. API Reference</h2>
          <p>All endpoints are public and CORS-enabled.</p>

          <h3>Core</h3>
          <ul>
            <li><code>GET /api/stats</code> — protocol statistics</li>
            <li><code>GET /api/price</code> — current price + burn cost</li>
            <li><code>GET /api/wallet?address=0x...</code> — balances</li>
            <li><code>GET /api/gallery?limit=20</code> — recent burns</li>
            <li><code>GET /api/chadboard</code> — leaderboard</li>
          </ul>

          <h3>Generation &amp; Minting</h3>
          <ul>
            <li><code>POST /api/generate</code> — generate + mint with burn proof</li>
            <li><code>GET|POST /api/x402/looksmaxx</code> — x402-aware looksmaxx</li>
            <li><code>GET /api/x402/quote?ethAmount=0.1</code> — swap quote</li>
            <li><code>GET|POST /api/gasless/burn</code> — EIP-712 gasless burn</li>
            <li><code>POST /api/warren/deploy</code> — Warren on-chain storage</li>
            <li><code>GET /api/metadata/&#123;tokenId&#125;</code> — ERC-721 metadata</li>
          </ul>

          <h3>Protocol Cron</h3>
          <ul>
            <li><code>GET /api/cron/distribute</code> — daily Vercel cron, calls <code>distributeWeeklyRewards()</code> when period has elapsed. Protected by <code>CRON_SECRET</code>.</li>
          </ul>

          <h3>Agent &amp; Chat</h3>
          <ul>
            <li><code>POST /api/agent/chat</code> — NLP transaction engine</li>
            <li><code>GET /api/agent/info</code> — agent identity + ERC-8004</li>
            <li><code>GET|POST /api/agent/register</code> — agent registration</li>
            <li><code>GET /api/agent/referrals?address=0x...</code> — referral stats</li>
            <li><code>GET /api/agent/looksmaxx?wallet=0x...</code> — burn plan</li>
          </ul>

          <h3>Social &amp; Messaging</h3>
          <ul>
            <li><code>POST /api/chat/auth</code> — Ably chat auth</li>
            <li><code>GET|POST /api/chat/messages</code> — chat storage</li>
            <li><code>GET|POST /api/chat/name</code> — display name</li>
            <li><code>POST /api/telegram</code> — Telegram bot webhook</li>
            <li><code>POST /api/telegram/alerts</code> — burn/mint notifications</li>
            <li><code>GET /api/frame</code> — Farcaster frame</li>
          </ul>

          <h3>Cross-Chain</h3>
          <ul>
            <li><code>GET /api/cross-chain/intent?sourceChain=base</code> — build plan</li>
            <li><code>POST /api/cross-chain/intent</code> — submit intent</li>
            <li><code>GET /api/cross-chain/status?id=cc_...</code> — track intent</li>
          </ul>

          <h3>Identity &amp; Portal</h3>
          <ul>
            <li><code>GET /api/identity/ADDRESS</code> — unified profile</li>
            <li><code>GET /api/portal/tokens?address=0x...</code> — MegaETH balances</li>
            <li><code>GET /api/portal/protocols</code> — protocol directory</li>
          </ul>

          <h3>Infrastructure</h3>
          <ul>
            <li><code>GET /api/bridge</code> — bridge info</li>
            <li><code>GET /api/events</code> — on-chain event stream (SSE)</li>
            <li><code>GET /api/analytics</code> — usage tracking</li>
            <li><code>POST /api/early/register</code> — beta access</li>
          </ul>
        </section>

        <section>
          <h2>23. ChadChat</h2>
          <p>
            Burn-gated real-time chat on the Chadboard. Any wallet with at least one burn (Mewer tier+)
            can post.
          </p>
          <ul>
            <li><strong>Access:</strong> Chat panel on the Chadboard page</li>
            <li><strong>Display name:</strong> .mega name, custom name, or truncated address</li>
            <li><strong>Transport:</strong> Ably (sub-second delivery)</li>
          </ul>
        </section>

        <section>
          <h2>24. Telegram Alerts</h2>
          <p>
            The MegaChad Telegram bot pushes real-time alerts on burns, mints, governance state changes, and
            emission distributions. Join{' '}
            <a href="https://t.me/megachads" target="_blank" rel="noopener noreferrer" className="external-link">t.me/megachads</a>.
          </p>
          <ul>
            <li><code>POST /api/telegram/alerts</code> — trigger notification</li>
            <li><code>GET /api/telegram/setup</code> — bot config info</li>
          </ul>
        </section>

        <section>
          <h2>25. Roles &amp; Permissions</h2>
          <p>Each protocol contract uses OpenZeppelin AccessControl. Live mainnet role assignments:</p>
          <ul>
            <li><strong>Admin (DEFAULT_ADMIN_ROLE):</strong> Tren Fund (<code>0x85bf…370C</code>) — can grant/revoke roles, will transfer to Jestermogger once governance is mature</li>
            <li><strong>Treasury:</strong> Tren Fund — receives the 15% emission share + Framemogger burn flow</li>
            <li><strong>Guardians (CircuitBreaker):</strong> 5 multisig-style addresses — any one can trigger pause</li>
            <li><strong>MINTER_ROLE (MEGAGOONER):</strong> only EmissionController</li>
            <li><strong>BURNER_ROLE (MEGAGOONER):</strong> only Framemogger</li>
            <li><strong>SNAPSHOT_ROLE (MEGAGOONER):</strong> Jestermogger — takes vote-weight snapshots</li>
            <li><strong>UPGRADER_ROLE:</strong> admin only — UUPS upgrade authorization</li>
            <li><strong>GOVERNANCE_ROLE (EmissionController):</strong> Jestermogger — adjusts emission split</li>
          </ul>
        </section>

        <section>
          <h2>26. Troubleshooting</h2>

          <h3>Stake / Unstake reverts</h3>
          <ul>
            <li>Confirm you've approved the staking contract for the right token (MEGACHAD or LP)</li>
            <li>If APR is "idle", emissions haven't been notified yet — wait for the daily cron, or anyone can call <code>distributeWeeklyRewards()</code></li>
            <li>If <code>canUnstake</code> returns false, you have 0 staked — nothing to withdraw</li>
            <li>If <code>earned()</code> shows 0 but you're staked: you likely have 0 NFTs → no NFT, no rewards. Buy one and call <code>refreshEffectiveStake()</code></li>
          </ul>

          <h3>Add Liquidity reverts</h3>
          <ul>
            <li>If pool is empty, you're setting initial price — any ratio works</li>
            <li>If pool has reserves, you must match the current ratio exactly (use the auto-calc field)</li>
            <li>Approve both tokens — addLiquidity needs allowances for $MEGACHAD and $MEGAGOONER</li>
          </ul>

          <h3>Swap fails or returns 0</h3>
          <ul>
            <li>Check the pool has liquidity — empty pool can't quote</li>
            <li>Pre-transfer the input token before <code>swap()</code> — this is Uni V2 style, not router-based</li>
            <li>Slippage: the UI fixes 1% — manually-built transactions need their own slippage guard</li>
          </ul>

          <h3>Governance vote rejected</h3>
          <ul>
            <li>You can only vote during the <code>Active</code> state (after 1-day delay, before 3-day window closes)</li>
            <li>Your vote weight is your $MEGAGOONER balance at the snapshot taken when the proposal entered <code>Pending</code></li>
            <li>You can vote once per proposal — no changing your mind</li>
          </ul>

          <h3>Wallet won't connect</h3>
          <ul>
            <li>Refresh, ensure wallet is unlocked, ensure you're on chain 4326</li>
            <li>Try a different wallet (Rabby is reliable on MegaETH)</li>
          </ul>

          <h3>Generation issues</h3>
          <ul>
            <li>1–2 minutes for AI generation — don't close the tab</li>
            <li>IPFS pinning adds 30–60 seconds</li>
            <li>Warren on-chain storage adds 1–2 minutes</li>
          </ul>
        </section>

        <section>
          <h2>27. Developer Resources</h2>
          <ul>
            <li>
              <strong>App repo:</strong>{' '}
              <a href="https://github.com/megachadxyz/mega-chad" target="_blank" rel="noopener noreferrer" className="external-link">
                github.com/megachadxyz/mega-chad
              </a>
            </li>
            <li><strong>Protocol contracts:</strong> private repo (verified on MegaETH Explorer)</li>
            <li><strong>OpenAPI spec:</strong>{' '}
              <a href="https://megachad.xyz/.well-known/openapi.json" target="_blank" rel="noopener noreferrer" className="external-link">
                megachad.xyz/.well-known/openapi.json
              </a>
            </li>
            <li><strong>Agent discovery (ERC-8004):</strong>{' '}
              <a href="https://megachad.xyz/.well-known/agent.json" target="_blank" rel="noopener noreferrer" className="external-link">
                megachad.xyz/.well-known/agent.json
              </a>
            </li>
            <li><strong>Block explorer:</strong> megaexplorer.xyz (all contracts verified)</li>
            <li><strong>Chain ID:</strong> 4326</li>
            <li><strong>RPC:</strong> https://mainnet.megaeth.com/rpc</li>
          </ul>
        </section>

        <div className="legal-footer">
          <Link href="/main/protocol" className="action-link">Open Protocol →</Link>
        </div>
      </div>

      <style jsx>{`
        .legal-page {
          min-height: 100vh;
          padding: 2rem;
          background: var(--bg);
        }

        .legal-container {
          max-width: 800px;
          margin: 0 auto;
          color: var(--text);
          font-family: var(--font-body);
          line-height: 1.7;
        }

        .back-link {
          display: inline-block;
          color: var(--pink);
          text-decoration: none;
          margin-bottom: 2rem;
          font-size: 0.9rem;
          transition: opacity 0.2s;
        }

        .back-link:hover {
          opacity: 0.8;
        }

        h1 {
          font-family: var(--font-display);
          font-size: 3rem;
          color: var(--pink);
          margin-bottom: 2rem;
          letter-spacing: 0.05em;
          text-shadow: var(--pink-glow);
        }

        h2 {
          font-family: var(--font-display);
          font-size: 1.8rem;
          color: var(--text);
          margin-top: 2rem;
          margin-bottom: 1rem;
          letter-spacing: 0.03em;
        }

        h3 {
          font-family: var(--font-display);
          font-size: 1.3rem;
          color: var(--pink-dim);
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          letter-spacing: 0.02em;
        }

        section {
          margin-bottom: 2.5rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border);
        }

        section:last-of-type {
          border-bottom: none;
        }

        p {
          margin-bottom: 1rem;
          color: var(--text);
        }

        .note {
          background: var(--bg-card);
          border-left: 3px solid var(--pink);
          padding: 1rem;
          margin: 1rem 0;
          font-size: 0.9rem;
          color: var(--pink-dim);
        }

        ul, ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }

        li {
          margin-bottom: 0.5rem;
          color: var(--text);
        }

        strong {
          color: var(--pink);
        }

        code {
          background: rgba(247,134,198,0.08);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.85em;
          color: var(--pink);
        }

        .inline-link {
          color: var(--pink);
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .inline-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        .legal-footer {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border);
          text-align: center;
        }

        .action-link {
          display: inline-block;
          font-family: var(--font-display);
          font-size: 1.5rem;
          color: var(--pink);
          text-decoration: none;
          padding: 1rem 2rem;
          border: 2px solid var(--pink);
          transition: all 0.3s;
          letter-spacing: 0.05em;
        }

        .action-link:hover {
          background: var(--pink);
          color: #000;
          box-shadow: var(--pink-glow);
        }

        .external-link {
          color: var(--pink);
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .external-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .legal-page {
            padding: 1rem;
          }

          h1 {
            font-size: 2rem;
          }

          h2 {
            font-size: 1.5rem;
          }

          h3 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
    </>
  );
}
