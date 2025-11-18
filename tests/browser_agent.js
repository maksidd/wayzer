// browser_agent.js
import puppeteer from 'puppeteer';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';

async function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = http.createServer()
      .once('error', () => {
        resolve(true);
      })
      .once('listening', () => {
        tester.close(() => resolve(false));
      })
      .listen(port);
  });
}

async function runBrowserAgent() {
    let browser;
    let webAppProcess;

    try {
        console.log('Starting web application...');
        if (!(await isPortInUse(5000))) {
          // Start Node.js dev server
          webAppProcess = exec('npm run dev', { cwd: process.cwd() });
          webAppProcess.stdout.on('data', (data) => {
              console.log(`[Web App STDOUT]: ${data.toString()}`);
          });
          webAppProcess.stderr.on('data', (data) => {
              console.error(`[Web App STDERR]: ${data.toString()}`);
          });
        } else {
          console.log('Port 5000 is already in use — assuming server is running.');
        }

        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

        const targetUrl = 'http://localhost:5000/messages'; // Test messages page
        const loginUrl = 'http://localhost:5000/auth'; // Login page
        const EMAIL = 'test1751877579421@example.com';
        const PASSWORD = '211551554zzZZ';

        console.log(`Opening browser and navigating to ${targetUrl}...`);
        browser = await puppeteer.launch({
            headless: false, // For debugging: false will show the browser
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setViewport({ width: 1920, height: 1080 });
        
        // Go to login page
        await page.goto(loginUrl, { waitUntil: 'networkidle0' });
        console.log('Login page loaded');

        // Fill login form
        await page.type('input[type="email"]', EMAIL, { delay: 50 });
        await page.type('input[type="password"]', PASSWORD, { delay: 50 });

        // Submit form and wait for requests to finish
        await page.click('button[type="submit"]');
        // Puppeteer v24 has no page.waitForTimeout – use regular sleep
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('Authorization completed');

        // Go to messages page
        await page.goto(targetUrl, { waitUntil: 'networkidle0' });
        console.log(`Messages page loaded: ${targetUrl}`);

        // Wait a bit for data to load
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take screenshot of messages page
        const messagesScreenshotPath = path.join(process.cwd(), 'messages_page_screenshot.png');
        await page.screenshot({ path: messagesScreenshotPath });
        console.log(`Messages page screenshot saved: ${messagesScreenshotPath}`);

        // Get HTML of messages page
        const htmlContent = await page.content();
        const htmlPath = path.join(process.cwd(), 'messages_page_content.html');
        fs.writeFileSync(htmlPath, htmlContent);
        console.log(`HTML content of messages page saved: ${htmlPath}`);

        // Check that chats exist
        const chatElements = await page.$$('[data-testid="conversation-item"]');
        console.log(`Chat elements found: ${chatElements.length}`);

        // Check console for errors
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(msg.text());
            console.log('Browser console:', msg.text());
        });

        // Ждем еще немного для полной загрузки
        await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        if (browser) {
            await browser.close();
            console.log('Браузер закрыт.');
        }
        if (webAppProcess) {
            webAppProcess.kill();
            console.log('Веб-приложение остановлено.');
        }
    }
}

runBrowserAgent();