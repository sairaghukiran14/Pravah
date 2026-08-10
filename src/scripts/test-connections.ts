import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function verifyAllConnections() {
  const { prisma } = await import('../lib/prisma');
  const { executeSarvamTranslate } = await import('../lib/sarvam');
  const { checkR2Connection } = await import('../lib/r2');

  console.log('--------------------------------------------------');
  console.log('🔍 Testing Pravah System Connections & Integrations');
  console.log('--------------------------------------------------');

  // 1. Test Neon PostgreSQL Database Connection
  console.log('\n[1/4] Testing Neon PostgreSQL Database Connection...');
  try {
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    const pipelineCount = await prisma.pipeline.count();

    console.log('✅ Neon PostgreSQL Database Connected Successfully!');
    console.log(`   └─ Host: ep-noisy-firefly-axgvv6cy-pooler.c-4.us-east-2.aws.neon.tech`);
    console.log(`   └─ Database stats: ${userCount} users, ${projectCount} projects, ${pipelineCount} pipelines live in Neon DB.`);
  } catch (err: any) {
    console.error('❌ Neon PostgreSQL Connection Failed:', err.message);
  }

  // 2. Test Auth.js Environment Configuration
  console.log('\n[2/4] Testing Auth.js Google Provider Configuration...');
  const hasGoogleId = !!process.env.AUTH_GOOGLE_ID && !process.env.AUTH_GOOGLE_ID.includes('mock');
  const hasGoogleSecret = !!process.env.AUTH_GOOGLE_SECRET && !process.env.AUTH_GOOGLE_SECRET.includes('mock');
  const hasAuthSecret = !!process.env.AUTH_SECRET;

  if (hasGoogleId && hasGoogleSecret && hasAuthSecret) {
    console.log('✅ Auth.js Configuration Verified!');
    console.log(`   └─ Google Client ID: ${process.env.AUTH_GOOGLE_ID?.substring(0, 25)}...`);
    console.log(`   └─ Auth Secret Key: Verified (${process.env.AUTH_SECRET?.length} chars)`);
  } else {
    console.log('⚠️ Auth.js Credentials warning: Missing or incomplete Google Client ID/Secret.');
  }

  // 3. Test Sarvam AI API Integration
  console.log('\n[3/4] Testing Sarvam AI API Connectivity & Key...');
  try {
    const apiKey = process.env.SARVAM_API_KEY;
    console.log(`   └─ API Key: ${apiKey ? apiKey.substring(0, 12) + '...' : 'None'}`);

    const res = await executeSarvamTranslate({
      input: 'नमस्ते! सर्वम एआई नोड पाइपलाइन परीक्षण।',
      source_language_code: 'hi-IN',
      target_language_code: 'en-IN',
    });

    console.log('✅ Sarvam AI API Connected & Responding Live!');
    console.log(`   └─ Real Translation Output: "${res.translated_text}"`);

    console.log('   └─ Testing Sarvam LLM (sarvam-105b) chat completions...');
    const { executeSarvamLLM } = await import('../lib/sarvam');
    const llmRes = await executeSarvamLLM({
      model: 'sarvam-105b',
      prompt: 'Hello, respond with "OK" if you can hear me.',
      temperature: 0.1,
    });
    console.log('✅ Sarvam LLM Connected & Responding Live!');
    console.log(`   └─ LLM Output: "${llmRes.response}"`);

    console.log('   └─ Testing Sarvam Document AI (executeSarvamVision) mock/live flow...');
    const { executeSarvamVision } = await import('../lib/sarvam');
    // Using a tiny base64 1x1 pixel PNG image to test connectivity
    const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const visionRes = await executeSarvamVision({
      file: tinyPngBase64,
      language: 'hi-IN',
    });
    console.log('✅ Sarvam Document AI API connected successfully!');
    console.log(`   └─ Digitised Output length: ${visionRes.text.length} characters`);
  } catch (err: any) {
    console.error('❌ Sarvam AI API Request Error:', err.stack || err.message);
  }

  // 4. Test Cloudflare R2 File Storage Integration
  console.log('\n[4/4] Testing Cloudflare R2 File Storage Connection...');
  const r2Status = await checkR2Connection();
  if (r2Status.connected) {
    console.log('✅ Cloudflare R2 Storage Connected Successfully!');
    console.log(`   └─ Bucket: ${r2Status.bucketName}`);
    console.log(`   └─ Endpoint: ${r2Status.endpoint}`);
  } else {
    console.log(`⚠️ Cloudflare R2 Storage Status: ${r2Status.message}`);
    console.log('   └─ Note: Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env.local to activate Cloudflare R2 bucket storage.');
  }

  console.log('\n--------------------------------------------------');
  process.exit(0);
}

verifyAllConnections();
