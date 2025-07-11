#!/usr/bin/env node

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Environment Configuration Check:');
console.log('================================');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`COURTLISTENER_API_TOKEN: ${process.env.COURTLISTENER_API_TOKEN ? 'set (' + process.env.COURTLISTENER_API_TOKEN.length + ' characters)' : 'not set'}`);
console.log(`RATE_LIMIT_REQUESTS: ${process.env.RATE_LIMIT_REQUESTS || 'default (100)'}`);
console.log(`REQUEST_TIMEOUT_MS: ${process.env.REQUEST_TIMEOUT_MS || 'default (30000)'}`);

if (!process.env.COURTLISTENER_API_TOKEN) {
    console.log('\n⚠️  WARNING: COURTLISTENER_API_TOKEN is not set!');
    console.log('Please add your API key to the .env file to test API functionality.');
    console.log('Get your API key from: https://www.courtlistener.com/api/');
} else {
    console.log('\n✅ Environment is configured for API testing!');
}
