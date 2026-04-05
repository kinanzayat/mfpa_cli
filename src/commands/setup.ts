import { Command } from 'commander';
import chalk from 'chalk';
import { AuthManager } from '../lib/auth';
import { MFPApiClient } from '../lib/api';

export function setupSetupCommand(program: Command): void {
  program
    .command('setup')
    .description('Set up authentication by providing MyFitnessPal cookies')
    .action(async () => {
      console.log(chalk.blue('🔧 MyFitnessPal CLI Setup\n'));
      
      console.log('To use this CLI, you need to provide 3 cookies from your logged-in MyFitnessPal session:');
      console.log(chalk.yellow('1. __Secure-next-auth.session-token'));
      console.log(chalk.yellow('2. _mfp_session'));
      console.log(chalk.yellow('3. cf_clearance'));
      console.log();
      
      console.log('How to get these cookies:');
      console.log('1. Log into myfitnesspal.com in your browser');
      console.log('2. Open Developer Tools (F12)');
      console.log('3. Go to Application/Storage > Cookies > myfitnesspal.com');
      console.log('4. Copy the values for the 3 cookies listed above');
      console.log();
      
      try {
        // Get cookie input from user
        const cookies = await getCookieInput();
        
        console.log(chalk.blue('\n🔍 Testing authentication...'));
        
        const authManager = new AuthManager();
        
        // Test authentication and get user ID
        const userId = await authManager.testAuthAndExtractUserId(cookies);
        console.log(chalk.green('✓ Authentication successful!'));
        console.log(chalk.gray(`User ID: ${userId}`));
        
        // Get initial Bearer token
        const tokenResponse = await fetch('https://www.myfitnesspal.com/user/auth_token?refresh=true', {
          headers: {
            'Cookie': [
              `__Secure-next-auth.session-token=${cookies.session_token}`,
              `_mfp_session=${cookies.mfp_session}`,
              `cf_clearance=${cookies.cf_clearance}`
            ].join('; '),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        const tokenData = await tokenResponse.json();
        const expiresAt = Date.now() + (tokenData.expires_in * 1000);
        
        // Save configuration
        const config = {
          cookies,
          auth: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
            user_id: userId
          }
        };
        
        authManager.saveConfig(config);
        console.log(chalk.green('✓ Configuration saved to ~/.mfprc'));
        
        // Test API access
        console.log(chalk.blue('\n🧪 Testing API access...'));
        const apiClient = new MFPApiClient(authManager);
        const userProfile = await apiClient.getUserProfile();
        console.log(chalk.green(`✓ API access confirmed for user: ${userProfile.item.username}`));
        
        console.log(chalk.green('\n🎉 Setup complete! You can now use the CLI commands.'));
        console.log('\nTry running:');
        console.log(chalk.cyan('  mfp summary    # Today\'s nutrition summary'));
        console.log(chalk.cyan('  mfp diary      # Today\'s detailed food diary'));
        console.log(chalk.cyan('  mfp week       # This week\'s nutrition summary'));
        
      } catch (error: any) {
        console.error(chalk.red('❌ Setup failed:'), error.message);
        console.log('\nTroubleshooting:');
        console.log('- Make sure you\'re logged into MyFitnessPal in your browser');
        console.log('- Double-check that you copied the complete cookie values');
        console.log('- Ensure the cookies are fresh (not expired)');
        console.log('- Try logging out and back in to MyFitnessPal to refresh your session');
        process.exit(1);
      }
    });
}

async function getCookieInput(): Promise<{
  session_token: string;
  mfp_session: string;
  cf_clearance: string;
}> {
  // In a real implementation, you'd use a library like 'inquirer' for interactive prompts
  // For now, let's provide clear instructions and expect the user to pass via environment or manual entry
  
  const sessionToken = process.env.MFP_SESSION_TOKEN;
  const mfpSession = process.env.MFP_SESSION;
  const cfClearance = process.env.CF_CLEARANCE;
  
  if (!sessionToken || !mfpSession || !cfClearance) {
    console.log(chalk.yellow('\n📋 Please set the following environment variables:'));
    console.log('export MFP_SESSION_TOKEN="your_session_token_value"');
    console.log('export MFP_SESSION="your_mfp_session_value"');
    console.log('export CF_CLEARANCE="your_cf_clearance_value"');
    console.log('\nThen run the setup command again.');
    process.exit(1);
  }
  
  return {
    session_token: sessionToken,
    mfp_session: mfpSession,
    cf_clearance: cfClearance
  };
}