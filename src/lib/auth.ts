import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import chalk from 'chalk';
import { MFPConfig, AuthTokenResponse } from '../types';

const CONFIG_PATH = path.join(os.homedir(), '.mfprc');

export class AuthManager {
  private config: MFPConfig | null = null;

  /**
   * Load configuration from ~/.mfprc
   */
  loadConfig(): MFPConfig | null {
    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        return null;
      }

      const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
      this.config = JSON.parse(configData);
      return this.config;
    } catch (error) {
      console.error(chalk.red('Error loading config:'), error);
      return null;
    }
  }

  /**
   * Save configuration to ~/.mfprc with proper permissions
   */
  saveConfig(config: MFPConfig): void {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      fs.chmodSync(CONFIG_PATH, 0o600); // Read/write for owner only
      this.config = config;
    } catch (error) {
      console.error(chalk.red('Error saving config:'), error);
      throw error;
    }
  }

  /**
   * Check if we have valid authentication
   */
  isAuthenticated(): boolean {
    if (!this.config?.auth) return false;
    
    const now = Date.now();
    return now < this.config.auth.expires_at;
  }

  /**
   * Get the current Bearer token, refreshing if necessary
   */
  async getToken(): Promise<string> {
    if (!this.config) {
      throw new Error('No configuration found. Run "mfp setup" first.');
    }

    // If we have a valid token, return it
    if (this.isAuthenticated()) {
      return this.config.auth!.access_token;
    }

    // Otherwise, refresh the token
    return await this.refreshToken();
  }

  /**
   * Get user ID from auth config
   */
  getUserId(): string {
    if (!this.config?.auth?.user_id) {
      throw new Error('No user ID found. Run "mfp setup" first.');
    }
    return this.config.auth.user_id;
  }

  /**
   * Refresh the Bearer token using cookies
   */
  async refreshToken(): Promise<string> {
    if (!this.config?.cookies) {
      throw new Error('No cookies found. Run "mfp setup" first.');
    }

    try {
      const response = await axios.get<AuthTokenResponse>(
        'https://www.myfitnesspal.com/user/auth_token?refresh=true',
        {
          headers: {
            'Cookie': this.buildCookieString(this.config.cookies),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      );

      const tokenData = response.data;
      const expiresAt = Date.now() + (tokenData.expires_in * 1000);

      // Update config with new token
      this.config.auth = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        user_id: this.config.auth?.user_id || '' // Keep existing user_id
      };

      this.saveConfig(this.config);
      
      console.log(chalk.green('✓ Token refreshed successfully'));
      return tokenData.access_token;

    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Authentication failed. Your cookies may have expired. Run "mfp setup" again.');
      }
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Test authentication and extract user ID from diary page
   */
  async testAuthAndExtractUserId(cookies: MFPConfig['cookies']): Promise<string> {
    try {
      // First test the auth token endpoint
      const tokenResponse = await axios.get<AuthTokenResponse>(
        'https://www.myfitnesspal.com/user/auth_token?refresh=true',
        {
          headers: {
            'Cookie': this.buildCookieString(cookies),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      );

      // Then get user ID from diary page
      const diaryResponse = await axios.get(
        'https://www.myfitnesspal.com/food/diary',
        {
          headers: {
            'Cookie': this.buildCookieString(cookies),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      );

      // Extract user ID from diary HTML
      const html = diaryResponse.data;
      const userIdMatch = html.match(/me\.api_user_id = '([^']+)'/);
      
      if (!userIdMatch) {
        throw new Error('Could not extract user ID from diary page');
      }

      return userIdMatch[1];

    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Authentication failed. Please check your cookies.');
      }
      throw new Error(`Authentication test failed: ${error.message}`);
    }
  }

  /**
   * Build cookie string from cookies object
   */
  private buildCookieString(cookies: MFPConfig['cookies']): string {
    return [
      `__Secure-next-auth.session-token=${cookies.session_token}`,
      `_mfp_session=${cookies.mfp_session}`,
      `cf_clearance=${cookies.cf_clearance}`
    ].join('; ');
  }

  /**
   * Get cookies for HTML scraping requests
   */
  getCookieString(): string {
    if (!this.config?.cookies) {
      throw new Error('No cookies found. Run "mfp setup" first.');
    }
    return this.buildCookieString(this.config.cookies);
  }
}