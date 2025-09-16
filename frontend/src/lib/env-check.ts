// Environment Check - InKnowing MVP 4.0
// Business Logic Conservation: Validate environment configuration

interface EnvCheckResult {
  key: string
  value: string | undefined
  isValid: boolean
  error?: string
}

interface ConnectivityResult {
  endpoint: string
  isReachable: boolean
  responseTime?: number
  error?: string
}

// Check required environment variables
export function checkEnvVariables(): EnvCheckResult[] {
  const requiredEnvs = [
    'NEXT_PUBLIC_API_BASE_URL',
    'NEXT_PUBLIC_WS_BASE_URL',
    'NEXT_PUBLIC_APP_URL',
  ]

  return requiredEnvs.map(key => {
    const value = process.env[key]
    const isValid = !!value && value.trim() !== ''

    return {
      key,
      value,
      isValid,
      error: !isValid ? `${key} is not set or empty` : undefined,
    }
  })
}

// Test API connectivity
export async function testAPIConnectivity(): Promise<ConnectivityResult> {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/v1'

  try {
    const startTime = Date.now()

    // Test basic connectivity
    const response = await fetch(apiUrl.replace('/v1', '/health'), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const responseTime = Date.now() - startTime

    if (response.ok) {
      return {
        endpoint: apiUrl,
        isReachable: true,
        responseTime,
      }
    } else {
      return {
        endpoint: apiUrl,
        isReachable: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }
  } catch (error) {
    return {
      endpoint: apiUrl,
      isReachable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Test WebSocket connectivity
export async function testWebSocketConnectivity(): Promise<ConnectivityResult> {
  const wsUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8888/ws'

  return new Promise((resolve) => {
    const startTime = Date.now()

    try {
      // Create a test WebSocket connection
      const testUrl = wsUrl.replace(/^ws/, 'http') + '/health'

      fetch(testUrl, { method: 'GET' })
        .then(response => {
          const responseTime = Date.now() - startTime

          resolve({
            endpoint: wsUrl,
            isReachable: response.ok,
            responseTime,
            error: response.ok ? undefined : `HTTP ${response.status}`,
          })
        })
        .catch(error => {
          resolve({
            endpoint: wsUrl,
            isReachable: false,
            error: error.message,
          })
        })
    } catch (error) {
      resolve({
        endpoint: wsUrl,
        isReachable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })
}

// Run all environment checks
export async function runEnvironmentCheck() {
  console.log('🔍 Running InKnowing Environment Check...\n')

  // Check environment variables
  console.log('📋 Environment Variables:')
  const envResults = checkEnvVariables()
  envResults.forEach(result => {
    if (result.isValid) {
      console.log(`✅ ${result.key}: ${result.value}`)
    } else {
      console.log(`❌ ${result.key}: ${result.error}`)
    }
  })

  // Test API connectivity
  console.log('\n🌐 API Connectivity:')
  const apiResult = await testAPIConnectivity()
  if (apiResult.isReachable) {
    console.log(`✅ API Server: ${apiResult.endpoint} (${apiResult.responseTime}ms)`)
  } else {
    console.log(`❌ API Server: ${apiResult.endpoint} - ${apiResult.error}`)
  }

  // Test WebSocket connectivity
  console.log('\n🔌 WebSocket Connectivity:')
  const wsResult = await testWebSocketConnectivity()
  if (wsResult.isReachable) {
    console.log(`✅ WebSocket Server: ${wsResult.endpoint} (${wsResult.responseTime}ms)`)
  } else {
    console.log(`❌ WebSocket Server: ${wsResult.endpoint} - ${wsResult.error}`)
  }

  // Summary
  const allChecks = [
    ...envResults.map(r => r.isValid),
    apiResult.isReachable,
    wsResult.isReachable,
  ]

  const passedChecks = allChecks.filter(Boolean).length
  const totalChecks = allChecks.length

  console.log('\n📊 Summary:')
  if (passedChecks === totalChecks) {
    console.log(`✅ All checks passed (${passedChecks}/${totalChecks})`)
    console.log('🚀 Environment is ready for development!')
  } else {
    console.log(`⚠️  ${passedChecks}/${totalChecks} checks passed`)
    console.log('🔧 Please fix the issues above before proceeding.')
  }

  return {
    envResults,
    apiResult,
    wsResult,
    summary: { passedChecks, totalChecks, isReady: passedChecks === totalChecks }
  }
}