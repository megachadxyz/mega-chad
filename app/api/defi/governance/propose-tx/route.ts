import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, isAddress as viemIsAddress, type Address, type Hex } from 'viem';
import { client, ADDRESSES, ABIS, CHAIN_BLOCK, jsonSafe, isAddress } from '@/lib/defi';

export const dynamic = 'force-dynamic';

type ProposalInput = {
  targets?: string[];
  values?: string[];
  calldatas?: string[];
  description?: string;
};

/**
 * GET /api/defi/governance/propose-tx?proposer=0x...
 *
 * Reads the proposer's Framemogger top-3 eligibility and returns either an
 * eligibility report OR a fully built propose() tx if the caller provides
 * targets/values/calldatas/description via POST.
 *
 * POST /api/defi/governance/propose-tx
 * body: { proposer, targets[], values[], calldatas[], description }
 *
 * Either method returns the same shape: { eligibility, tx? }.
 */
export async function GET(req: NextRequest) {
  const proposer = req.nextUrl.searchParams.get('proposer');
  return buildResponse(proposer, null);
}

export async function POST(req: NextRequest) {
  let body: ProposalInput & { proposer?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  return buildResponse(body.proposer ?? null, body);
}

async function buildResponse(proposer: string | null, payload: ProposalInput | null) {
  if (proposer && !isAddress(proposer)) {
    return NextResponse.json({ error: 'proposer must be 0x...' }, { status: 400 });
  }

  let eligibility: Record<string, unknown> = {
    proposer,
    note: 'Pass &proposer=0x... to check on-chain top-3 burner eligibility.',
  };

  if (proposer) {
    const [canPropose, currentWeek] = await Promise.all([
      client.readContract({
        address: ADDRESSES.FRAMEMOGGER,
        abi: ABIS.FRAMEMOGGER,
        functionName: 'canPropose',
        args: [proposer as Address],
      }) as Promise<boolean>,
      client.readContract({
        address: ADDRESSES.FRAMEMOGGER,
        abi: ABIS.FRAMEMOGGER,
        functionName: 'getCurrentWeek',
      }) as Promise<bigint>,
    ]);
    const [top3Addrs, top3Amounts] = (await client.readContract({
      address: ADDRESSES.FRAMEMOGGER,
      abi: ABIS.FRAMEMOGGER,
      functionName: 'getWeekTop3',
      args: [currentWeek],
    })) as readonly [readonly [string, string, string], readonly [bigint, bigint, bigint]];

    eligibility = {
      proposer,
      canPropose,
      currentWeek: currentWeek.toString(),
      top3: top3Addrs.map((addr, i) => ({
        rank: i + 1,
        address: addr,
        sentRaw: top3Amounts[i].toString(),
      })),
      proposerNote: canPropose
        ? 'Eligible — proposer is in this week\'s top-3 Framemogger burners.'
        : 'NOT eligible — only the current week\'s top-3 Framemogger burners can propose. Burn more MEGACHAD via /api/defi/* or sendMegachad() on Framemogger.',
    };
  }

  // No payload → just report eligibility + return a template.
  if (!payload || !payload.targets || !payload.values || !payload.calldatas || !payload.description) {
    return NextResponse.json(
      jsonSafe({
        chain: CHAIN_BLOCK,
        governance: ADDRESSES.JESTERMOGGER,
        eligibility,
        howToBuild: {
          method: 'POST',
          url: '/api/defi/governance/propose-tx',
          body: {
            proposer: '0xYourWallet (optional, only used for eligibility echo)',
            targets: ['0xContractToCall'],
            values: ['0'],
            calldatas: ['0xfunctionSelectorAndArgs'],
            description: 'Free-text proposal title and body',
          },
          notes: [
            'targets, values, calldatas must all be the same length.',
            'values are wei (string). Most proposals use "0".',
            'calldatas are pre-encoded function calls (use viem encodeFunctionData off-chain).',
            'description is plain text — convention is "# Title\\n\\nBody…".',
            'Caller must be in current week\'s top-3 Framemogger burners.',
          ],
        },
        relatedEndpoints: {
          framemoggerCanPropose: `/api/defi/governance/propose-tx?proposer=${proposer ?? '0x...'}`,
          listProposals: '/api/defi/governance/proposals',
          chat: 'POST /api/agent/chat { message: "create a proposal to upgrade staking" }',
        },
      }),
    );
  }

  const { targets, values, calldatas, description } = payload;
  if (targets.length !== values.length || targets.length !== calldatas.length) {
    return NextResponse.json(
      { error: 'targets, values, calldatas must be arrays of equal length' },
      { status: 400 },
    );
  }
  if (targets.length === 0) {
    return NextResponse.json({ error: 'at least one action required' }, { status: 400 });
  }
  for (const t of targets) {
    if (!viemIsAddress(t)) {
      return NextResponse.json({ error: `invalid target address: ${t}` }, { status: 400 });
    }
  }
  let valueBigs: bigint[];
  try {
    valueBigs = values.map((v) => BigInt(v));
  } catch {
    return NextResponse.json({ error: 'values must be wei strings' }, { status: 400 });
  }
  for (const c of calldatas) {
    if (typeof c !== 'string' || !c.startsWith('0x')) {
      return NextResponse.json({ error: `invalid calldata: ${c}` }, { status: 400 });
    }
  }

  const data = encodeFunctionData({
    abi: ABIS.JESTERMOGGER,
    functionName: 'propose',
    args: [
      targets as readonly Address[],
      valueBigs,
      calldatas as readonly Hex[],
      description,
    ],
  });

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      governance: ADDRESSES.JESTERMOGGER,
      eligibility,
      tx: {
        step: 'propose',
        to: ADDRESSES.JESTERMOGGER,
        value: '0',
        data,
        functionName: 'propose',
        args: { targets, values, calldatas, description },
      },
      lifecycleNotes: [
        '1d voting delay → 3d voting → if passed: 2d timelock → 7d grace to execute.',
        '50% quorum of MEGAGOONER snapshot supply required.',
        'NFTVetoCouncil (11/20) can veto a Queued proposal within 2 days.',
      ],
    }),
  );
}
