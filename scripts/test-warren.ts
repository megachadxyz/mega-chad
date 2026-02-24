/**
 * Test script for Warren integration
 * Run with: npx tsx scripts/test-warren.ts
 */

import { estimateWarrenFee, getWarrenImageUrl } from '../lib/warren';

async function testWarrenEstimate() {
  console.log('🧪 Testing Warren Estimate API...\n');

  try {
    // Test estimate for a typical 100KB image
    const imageSize = 100 * 1024; // 100KB
    console.log(`Estimating cost for ${imageSize} bytes (${Math.round(imageSize / 1024)}KB)...`);

    const estimate = await estimateWarrenFee(imageSize);

    console.log('✅ Warren Estimate Response:');
    console.log(`   Cost: ${estimate.totalEth} ETH (~$${(parseFloat(estimate.totalEth) * 3000).toFixed(2)} USD)`);
    console.log(`   Wei: ${estimate.totalWei}`);
    console.log(`   Relayer: ${estimate.relayerAddress}`);
    console.log(`   Chunks: ${estimate.chunkCount}`);
    console.log('');

    // Test different image sizes
    const sizes = [50, 100, 200, 500];
    console.log('📊 Cost comparison for different image sizes:\n');

    for (const sizeKB of sizes) {
      const bytes = sizeKB * 1024;
      const est = await estimateWarrenFee(bytes);
      console.log(`   ${sizeKB}KB → ${est.totalEth} ETH (~$${(parseFloat(est.totalEth) * 3000).toFixed(2)})`);
    }

    console.log('');

    // Test Warren image URL generation
    const testTokenId = 42;
    const imageUrl = getWarrenImageUrl(testTokenId);
    console.log('🌐 Warren Image URL Example:');
    console.log(`   ${imageUrl}`);
    console.log('');

    console.log('✅ All Warren tests passed!');
  } catch (error) {
    console.error('❌ Warren test failed:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

testWarrenEstimate();
