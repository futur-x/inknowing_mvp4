#!/usr/bin/env node

/**
 * InKnowing MVP 4.0 - Contract Validator
 * Contract-Driven Development (CDD) - 契约验证器
 * Version: 1.0.0
 * Purpose: Validate code compliance with contracts
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const glob = require('glob');
const chalk = require('chalk').default || require('chalk');

// ================================
// Configuration
// ================================
const CONFIG = {
  contractsDir: path.join(__dirname),
  projectRoot: path.join(__dirname, '../../'),
  frontendDir: path.join(__dirname, '../../frontend'),
  backendDir: path.join(__dirname, '../../backend'),
  violations: [],
  warnings: [],
  stats: {
    filesChecked: 0,
    contractsLoaded: 0,
    violationsFound: 0,
    warningsFound: 0
  }
};

// ================================
// Contract Loaders
// ================================
class ContractLoader {
  static loadContracts() {
    const contractFiles = glob.sync(`${CONFIG.contractsDir}/*.contract.yaml`);
    const contracts = {};

    contractFiles.forEach(file => {
      const contractName = path.basename(file, '.contract.yaml');
      try {
        contracts[contractName] = yaml.load(fs.readFileSync(file, 'utf8'));
        CONFIG.stats.contractsLoaded++;
        console.log(chalk.gray(`✓ Loaded contract: ${contractName}`));
      } catch (err) {
        console.error(chalk.red(`✗ Failed to load contract: ${contractName}`));
        console.error(err);
      }
    });

    return contracts;
  }
}

// ================================
// Validators
// ================================
class FrontendValidator {
  static validate(contracts) {
    console.log(chalk.blue('\n📋 Validating Frontend...'));

    // Check routing configuration
    this.validateRouting(contracts.frontend);

    // Check API configuration
    this.validateAPIConfig(contracts.frontend);

    // Check authentication setup
    this.validateAuthentication(contracts.frontend);

    // Check store configuration
    this.validateStores(contracts.frontend);
  }

  static validateRouting(contract) {
    const middlewarePath = path.join(CONFIG.frontendDir, 'src/middleware.ts');

    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf8');
      CONFIG.stats.filesChecked++;

      // Check protected routes
      contract.routes.protected.forEach(route => {
        const routePath = route.path.replace(/\[.*?\]/g, '.*');
        if (!content.includes(route.path.split('[')[0])) {
          CONFIG.violations.push({
            file: 'middleware.ts',
            line: 0,
            rule: 'ROUTE001',
            message: `Protected route '${route.path}' not found in middleware`,
            severity: 'ERROR'
          });
        }
      });

      // Check if middleware is configured for Bearer Token auth (skip checks in dev mode)
      if (!content.includes('skip_all_checks') && !content.includes('Bearer Token')) {
        CONFIG.warnings.push({
          file: 'middleware.ts',
          line: 37,
          rule: 'AUTH001',
          message: "Middleware should skip checks for Bearer Token authentication",
          severity: 'WARNING'
        });
      }
    }
  }

  static validateAPIConfig(contract) {
    const apiPath = path.join(CONFIG.frontendDir, 'src/lib/api.ts');

    if (fs.existsSync(apiPath)) {
      const content = fs.readFileSync(apiPath, 'utf8');
      CONFIG.stats.filesChecked++;

      // Check base URL configuration
      if (!content.includes('http://localhost:8888/v1')) {
        CONFIG.warnings.push({
          file: 'lib/api.ts',
          line: 14,
          rule: 'API001',
          message: 'API base URL might not match contract',
          severity: 'WARNING'
        });
      }

      // Check credentials setting
      if (!content.includes("credentials: 'include'")) {
        CONFIG.violations.push({
          file: 'lib/api.ts',
          line: 0,
          rule: 'API002',
          message: "API calls must include credentials for cookie auth",
          severity: 'ERROR'
        });
      }
    }
  }

  static validateAuthentication(contract) {
    const authStorePath = path.join(CONFIG.frontendDir, 'src/stores/auth.ts');

    if (fs.existsSync(authStorePath)) {
      const content = fs.readFileSync(authStorePath, 'utf8');
      CONFIG.stats.filesChecked++;

      // Check required auth actions
      const requiredActions = ['login', 'register', 'logout', 'refreshAuth', 'checkAuth'];
      requiredActions.forEach(action => {
        if (!content.includes(`${action}:`)) {
          CONFIG.violations.push({
            file: 'stores/auth.ts',
            line: 0,
            rule: 'STATE001',
            message: `Required auth action '${action}' not found`,
            severity: 'ERROR'
          });
        }
      });
    }
  }

  static validateStores(contract) {
    // Check if all required stores exist
    Object.keys(contract.stores).forEach(storeName => {
      const storeFile = contract.stores[storeName].file;
      const storePath = path.join(CONFIG.frontendDir, 'src', storeFile);

      if (!fs.existsSync(storePath)) {
        CONFIG.violations.push({
          file: storeFile,
          line: 0,
          rule: 'STATE002',
          message: `Required store file '${storeFile}' not found`,
          severity: 'ERROR'
        });
      } else {
        CONFIG.stats.filesChecked++;
      }
    });
  }
}

class BackendValidator {
  static validate(contracts) {
    console.log(chalk.blue('\n📋 Validating Backend...'));

    // Check API endpoints
    this.validateEndpoints(contracts['backend.api']);

    // Check database models
    this.validateModels(contracts['data.model']);

    // Check security configuration
    this.validateSecurity(contracts['performance.security']);
  }

  static validateEndpoints(contract) {
    const mainPath = path.join(CONFIG.backendDir, 'main.py');

    if (fs.existsSync(mainPath)) {
      const content = fs.readFileSync(mainPath, 'utf8');
      CONFIG.stats.filesChecked++;

      // Check CORS configuration
      if (!content.includes('CORSMiddleware')) {
        CONFIG.violations.push({
          file: 'main.py',
          line: 0,
          rule: 'SEC004',
          message: 'CORS middleware not configured',
          severity: 'ERROR'
        });
      }

      // Check API prefix
      if (!content.includes('API_V1_PREFIX')) {
        CONFIG.warnings.push({
          file: 'main.py',
          line: 0,
          rule: 'API003',
          message: 'API version prefix not found',
          severity: 'WARNING'
        });
      }
    }

    // Check API router configuration
    const apiInitPath = path.join(CONFIG.backendDir, 'api/v1/__init__.py');
    if (fs.existsSync(apiInitPath)) {
      const content = fs.readFileSync(apiInitPath, 'utf8');
      CONFIG.stats.filesChecked++;

      // Check required routers
      const requiredRouters = ['auth', 'users', 'books', 'dialogue', 'search'];
      requiredRouters.forEach(router => {
        if (!content.includes(`${router}_router`)) {
          CONFIG.violations.push({
            file: 'api/v1/__init__.py',
            line: 0,
            rule: 'API004',
            message: `Required router '${router}' not registered`,
            severity: 'ERROR'
          });
        }
      });
    }
  }

  static validateModels(contract) {
    // Check if model files exist
    const modelFiles = glob.sync(`${CONFIG.backendDir}/models/*.py`);

    const requiredModels = ['user', 'book', 'dialogue'];
    requiredModels.forEach(model => {
      const modelFile = `${CONFIG.backendDir}/models/${model}.py`;
      if (!fs.existsSync(modelFile)) {
        CONFIG.violations.push({
          file: `models/${model}.py`,
          line: 0,
          rule: 'DATA001',
          message: `Required model file '${model}.py' not found`,
          severity: 'ERROR'
        });
      } else {
        CONFIG.stats.filesChecked++;
      }
    });
  }

  static validateSecurity(contract) {
    const settingsPath = path.join(CONFIG.backendDir, 'config/settings.py');

    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, 'utf8');
      CONFIG.stats.filesChecked++;

      // Check JWT configuration
      if (!content.includes('ACCESS_TOKEN_EXPIRE_MINUTES')) {
        CONFIG.violations.push({
          file: 'config/settings.py',
          line: 0,
          rule: 'SEC002',
          message: 'JWT token expiration not configured',
          severity: 'ERROR'
        });
      }

      // Check secret key
      if (content.includes('change-this-secret-key')) {
        CONFIG.violations.push({
          file: 'config/settings.py',
          line: 34,
          rule: 'SEC001',
          message: 'Default secret key must be changed',
          severity: 'ERROR'
        });
      }
    }
  }
}

class IntegrationValidator {
  static validate(contracts) {
    console.log(chalk.blue('\n📋 Validating Integration...'));

    // Check WebSocket configuration
    this.validateWebSocket(contracts.frontend, contracts['backend.api']);

    // Check cookie names consistency
    this.validateBearerTokenAuth(contracts.frontend, contracts['backend.api']);

    // Check API endpoint consistency
    this.validateAPIConsistency(contracts.frontend, contracts['backend.api']);
  }

  static validateWebSocket(frontendContract, backendContract) {
    // Check WebSocket URL pattern consistency
    const wsUrlPattern = '/ws/dialogue/{session_id}';

    // Frontend check
    const wsHookPath = path.join(CONFIG.frontendDir, 'src/hooks/use-websocket.tsx');
    if (fs.existsSync(wsHookPath)) {
      const content = fs.readFileSync(wsHookPath, 'utf8');
      CONFIG.stats.filesChecked++;

      if (!content.includes('ws://') && !content.includes('wss://')) {
        CONFIG.violations.push({
          file: 'hooks/use-websocket.tsx',
          line: 0,
          rule: 'WS001',
          message: 'WebSocket URL not properly configured',
          severity: 'ERROR'
        });
      }
    }
  }

  static validateBearerTokenAuth(frontendContract, backendContract) {
    // Check if frontend is configured for Bearer Token auth
    const apiPath = path.join(CONFIG.frontendDir, 'src/lib/api.ts');

    if (fs.existsSync(apiPath)) {
      const content = fs.readFileSync(apiPath, 'utf8');

      // Check for Bearer Token in Authorization header
      if (!content.includes('Authorization') || !content.includes('Bearer')) {
        CONFIG.warnings.push({
          file: 'lib/api.ts',
          line: 0,
          rule: 'INT001',
          message: "API client should use Bearer Token in Authorization header",
          severity: 'WARNING'
        });
      }

      // Check for localStorage token storage
      if (!content.includes('localStorage')) {
        CONFIG.warnings.push({
          file: 'lib/api.ts',
          line: 0,
          rule: 'INT002',
          message: "Tokens should be stored in localStorage for Bearer auth",
          severity: 'WARNING'
        });
      }
    }
  }

  static validateAPIConsistency(frontendContract, backendContract) {
    // Check if frontend API calls match backend endpoints
    const apiPath = path.join(CONFIG.frontendDir, 'src/lib/api.ts');

    if (fs.existsSync(apiPath)) {
      const content = fs.readFileSync(apiPath, 'utf8');

      // Check base URL consistency
      const frontendBaseUrl = 'http://localhost:8888/v1';
      const backendBasePath = '/v1';

      if (!content.includes(frontendBaseUrl)) {
        CONFIG.warnings.push({
          file: 'lib/api.ts',
          line: 0,
          rule: 'INT002',
          message: 'API base URL might not match backend configuration',
          severity: 'WARNING'
        });
      }
    }
  }
}

// ================================
// Report Generator
// ================================
class ReportGenerator {
  static generate() {
    console.log(chalk.bold('\n' + '='.repeat(60)));
    console.log(chalk.bold('CONTRACT VALIDATION REPORT'));
    console.log(chalk.bold('='.repeat(60)));

    // Statistics
    console.log(chalk.cyan('\n📊 Statistics:'));
    console.log(`  • Contracts loaded: ${CONFIG.stats.contractsLoaded}`);
    console.log(`  • Files checked: ${CONFIG.stats.filesChecked}`);
    console.log(`  • Violations found: ${CONFIG.violations.length}`);
    console.log(`  • Warnings found: ${CONFIG.warnings.length}`);

    // Violations
    if (CONFIG.violations.length > 0) {
      console.log(chalk.red('\n❌ Violations:'));
      CONFIG.violations.forEach(v => {
        console.log(chalk.red(`  [${v.rule}] ${v.file}:${v.line} - ${v.message}`));
      });
    }

    // Warnings
    if (CONFIG.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      CONFIG.warnings.forEach(w => {
        console.log(chalk.yellow(`  [${w.rule}] ${w.file}:${w.line} - ${w.message}`));
      });
    }

    // Summary
    console.log(chalk.bold('\n' + '='.repeat(60)));
    if (CONFIG.violations.length === 0) {
      console.log(chalk.green('✅ All contract validations passed!'));
    } else {
      console.log(chalk.red(`❌ Found ${CONFIG.violations.length} contract violations that must be fixed.`));
    }
    console.log(chalk.bold('='.repeat(60) + '\n'));

    // Exit code
    process.exit(CONFIG.violations.length > 0 ? 1 : 0);
  }
}

// ================================
// Main Execution
// ================================
async function main() {
  console.log(chalk.bold.blue('🔍 InKnowing Contract Validator v1.0.0'));
  console.log(chalk.gray('Contract-Driven Development (CDD) Compliance Check\n'));

  try {
    // Load all contracts
    const contracts = ContractLoader.loadContracts();

    // Run validators
    FrontendValidator.validate(contracts);
    BackendValidator.validate(contracts);
    IntegrationValidator.validate(contracts);

    // Generate report
    ReportGenerator.generate();

  } catch (error) {
    console.error(chalk.red('\n❌ Validation failed:'), error);
    process.exit(1);
  }
}

// Check if required modules are installed
function checkDependencies() {
  const requiredModules = ['js-yaml', 'glob', 'chalk'];
  const missing = [];

  requiredModules.forEach(mod => {
    try {
      require.resolve(mod);
    } catch {
      missing.push(mod);
    }
  });

  if (missing.length > 0) {
    console.log(chalk.yellow('📦 Installing required dependencies...'));
    const { execSync } = require('child_process');
    execSync(`npm install ${missing.join(' ')}`, {
      cwd: __dirname,
      stdio: 'inherit'
    });
  }
}

// Create package.json if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
  const packageJson = {
    name: "inknowing-contract-validator",
    version: "1.0.0",
    description: "Contract validation tool for InKnowing MVP",
    main: "validate.js",
    scripts: {
      validate: "node validate.js"
    },
    dependencies: {
      "js-yaml": "^4.1.0",
      "glob": "^8.0.3",
      "chalk": "^4.1.2"
    }
  };

  fs.writeFileSync(
    path.join(__dirname, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

// Run the validator
checkDependencies();
main();