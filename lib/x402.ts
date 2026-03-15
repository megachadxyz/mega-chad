// Meridian x402 Payments on MegaETH
// https://docs.mrdn.finance

export const MERIDIAN_API_BASE = 'https://api.mrdn.finance';

// MegaETH x402 constants
export const X402_NETWORK = 'megaeth';
export const MEGAETH_CHAIN_ID = 4326;

// USDm addresses
export const USDM_TOKEN = '0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7' as const;
export const USDM_FORWARDER = '0x2c2d8EF0664432BA243deF0b8f60aF7aB43a60B4' as const;
export const MERIDIAN_FACILITATOR = '0x8E7769D440b3460b92159Dd9C6D17302b036e2d6' as const;

// Forwarder EIP-712 domain
export const FORWARDER_DOMAIN = {
  name: 'USDm Forwarder',
  version: '1',
  chainId: MEGAETH_CHAIN_ID,
  verifyingContract: USDM_FORWARDER,
} as const;

// Infra fee: covers Replicate AI generation + IPFS pinning costs
// 1 USDm (18 decimals)
export const LOOKSMAXX_INFRA_FEE = '1000000000000000000'; // 1 USDm

export interface PaymentRequirements {
  scheme: string;
  network: string;
  asset: string;
  payTo: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  maxTimeoutSeconds: number;
  extra: {
    name: string;
    version: string;
  };
}

export interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}

export function buildPaymentRequirements(resource: string, description: string, amount: string): PaymentRequirements {
  return {
    scheme: 'exact',
    network: X402_NETWORK,
    asset: USDM_FORWARDER,
    payTo: MERIDIAN_FACILITATOR,
    maxAmountRequired: amount,
    resource,
    description,
    mimeType: 'application/json',
    maxTimeoutSeconds: 300,
    extra: {
      name: FORWARDER_DOMAIN.name,
      version: FORWARDER_DOMAIN.version,
    },
  };
}

export async function settlePayment(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.MERIDIAN_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'MERIDIAN_API_KEY not configured' };
  }

  const response = await fetch(`${MERIDIAN_API_BASE}/v1/settle`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentPayload,
      paymentRequirements,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    return {
      success: false,
      error: result.errorReason ?? `Settlement failed (HTTP ${response.status})`,
    };
  }

  return { success: true };
}
