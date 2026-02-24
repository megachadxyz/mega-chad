/**
 * Test metadata endpoint
 * Run with: npx tsx scripts/test-metadata.ts
 */

import { storeNFTMetadata } from '../lib/redis';

async function testMetadata() {
  console.log('🧪 Testing NFT Metadata Storage...\n');

  try {
    // Create test metadata
    const testMetadata = {
      tokenId: '999',
      warrenTokenId: 42,
      ipfsUrl: 'https://gateway.pinata.cloud/ipfs/QmTest123',
      burner: '0x85bf9272dea7dff1781f71473187b96c6f2f370c',
      burnTxHash: '0xabc123',
      devTxHash: '0xdef456',
      timestamp: new Date().toISOString(),
    };

    console.log('📝 Storing test metadata for tokenId:', testMetadata.tokenId);
    await storeNFTMetadata(testMetadata);
    console.log('✅ Metadata stored in Redis\n');

    // Test fetching via API
    console.log('🌐 Testing metadata API endpoint...');
    console.log('   URL: https://megachad.xyz/api/metadata/999');
    console.log('');

    // Simulate what the API will return
    console.log('📋 Expected API Response:');
    console.log(JSON.stringify({
      name: '$MEGACHAD 0999',
      description: `Looksmaxxed by ${testMetadata.burner}. Burn tx: ${testMetadata.burnTxHash}`,
      image: `https://thewarren.app/api/onchain-image/registry?registry=0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756&id=${testMetadata.warrenTokenId}`,
      external_url: 'https://megachad.xyz',
      attributes: [
        { trait_type: 'Burner', value: testMetadata.burner },
        { trait_type: 'Burn Tx', value: testMetadata.burnTxHash },
        { trait_type: 'Storage', value: 'Warren (On-Chain)' },
      ],
    }, null, 2));

    console.log('\n✅ Metadata test complete!');
    console.log('\n💡 To verify, visit: https://megachad.xyz/api/metadata/999');
  } catch (error) {
    console.error('❌ Metadata test failed:', error);
    process.exit(1);
  }
}

testMetadata();
