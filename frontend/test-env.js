// Environment Test Script - InKnowing MVP 4.0
// Quick environment validation without full build

const fs = require('fs')
const path = require('path')

// Load environment variables manually
const envPath = path.join(__dirname, '.env.local')

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

async function testAPIConnectivity() {
  const http = require('http')
  const https = require('https')

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/v1'
  const healthUrl = apiUrl.replace('/v1', '/health')

  return new Promise((resolve) => {
    const isHttps = healthUrl.startsWith('https://')
    const httpModule = isHttps ? https : http
    const url = new URL(healthUrl)

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      timeout: 5000,
    }

    const startTime = Date.now()

    const req = httpModule.request(options, (res) => {
      const responseTime = Date.now() - startTime
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        resolve({
          isReachable: res.statusCode === 200,
          responseTime,
          status: res.statusCode,
          data: data.slice(0, 200), // First 200 chars
        })
      })
    })

    req.on('error', (error) => {
      resolve({
        isReachable: false,
        error: error.message,
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({
        isReachable: false,
        error: 'Request timeout',
      })
    })

    req.end()
  })
}

async function runEnvironmentCheck() {
  console.log('🔍 InKnowing Environment Check\n')

  // Check environment variables
  console.log('📋 Environment Variables:')
  const requiredEnvs = [
    'NEXT_PUBLIC_API_BASE_URL',
    'NEXT_PUBLIC_WS_BASE_URL',
    'NEXT_PUBLIC_APP_URL',
  ]

  const envResults = []
  for (const env of requiredEnvs) {
    const value = process.env[env]
    const isValid = !!value && value.trim() !== ''

    if (isValid) {
      console.log(`✅ ${env}: ${value}`)
      envResults.push(true)
    } else {
      console.log(`❌ ${env}: Not set or empty`)
      envResults.push(false)
    }
  }

  // Check API connectivity
  console.log('\n🌐 API Connectivity:')
  const apiResult = await testAPIConnectivity()

  if (apiResult.isReachable) {
    console.log(`✅ API Server: ${process.env.NEXT_PUBLIC_API_BASE_URL} (${apiResult.responseTime}ms)`)
    if (apiResult.data) {
      console.log(`   Response: ${apiResult.data}`)
    }
  } else {
    console.log(`❌ API Server: ${process.env.NEXT_PUBLIC_API_BASE_URL}`)
    console.log(`   Error: ${apiResult.error || 'Connection failed'}`)
  }

  // Check project structure
  console.log('\n📁 Project Structure:')
  const requiredPaths = [
    'src/stores/auth.ts',
    'src/stores/user.ts',
    'src/stores/chat.ts',
    'src/lib/api.ts',
    'src/hooks/index.ts',
    'src/types/api.ts',
  ]

  const structureResults = []
  for (const filePath of requiredPaths) {
    const fullPath = path.join(__dirname, filePath)
    const exists = fs.existsSync(fullPath)

    if (exists) {
      console.log(`✅ ${filePath}`)
      structureResults.push(true)
    } else {
      console.log(`❌ ${filePath}: Missing`)
      structureResults.push(false)
    }
  }

  // Summary
  const allResults = [...envResults, apiResult.isReachable, ...structureResults]
  const passed = allResults.filter(Boolean).length
  const total = allResults.length

  console.log('\n📊 Summary:')
  console.log(`${passed}/${total} checks passed`)

  if (passed === total) {
    console.log('✅ Environment is ready!')
    console.log('🚀 You can now run: npm run dev')
  } else {
    console.log('⚠️  Some issues need to be fixed.')
    console.log('🔧 Please resolve the failures above.')
  }

  process.exit(passed === total ? 0 : 1)
}

// Run the check
runEnvironmentCheck().catch(console.error)