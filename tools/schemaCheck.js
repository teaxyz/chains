/**
 * Schema validation tool for chain configuration files
 * Validates JSON schema and chain ID consistency
 */

const fs = require("fs")
const Ajv = require("ajv")
const ajv = new Ajv({ 
  allErrors: true, 
  verbose: true, 
  strict: false,
  cache: true
})
const schema = require("./schema/chainSchema.json")
const { exit } = require("process")
const path = require('path')
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')
const crypto = require('crypto')

// Helper function to resolve paths relative to script location
const resolve = (_path) => path.resolve(__dirname, _path)

// Cache directory for validation results
const cacheDir = path.resolve(__dirname, '../.cache')
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true })
}

// https://chainagnostic.org/CAIPs/caip-2
const parseChainId = (chainId) =>
  /^(?<namespace>[-a-z0-9]{3,8})-(?<reference>[-a-zA-Z0-9]{1,32})$/u.exec(
    chainId
  )

// Custom validation functions
const customValidators = {
  // Validate RPC URLs
  validateRPC: (data) => {
    if (!Array.isArray(data)) return false
    return data.every(url => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    })
  },
  // Validate explorer URLs
  validateExplorer: (data) => {
    if (!Array.isArray(data)) return false
    return data.every(explorer => {
      try {
        new URL(explorer.url)
        return true
      } catch {
        return false
      }
    })
  }
}

// Add custom validators to Ajv
ajv.addKeyword({
  keyword: 'validateRPC',
  validate: customValidators.validateRPC
})

ajv.addKeyword({
  keyword: 'validateExplorer',
  validate: customValidators.validateExplorer
})

// Worker function to process a single file
function processFile(fileLocation) {
  try {
    const fileData = fs.readFileSync(fileLocation, "utf8")
    const fileHash = crypto.createHash('sha256').update(fileData).digest('hex')
    const cacheFile = path.join(cacheDir, `${fileHash}.json`)
    
    // Check cache
    if (fs.existsSync(cacheFile)) {
      const cachedResult = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
      if (cachedResult.success) {
        return { success: true }
      }
    }

    const fileDataJson = JSON.parse(fileData)
    const fileName = path.basename(fileLocation)
    const parsedChainId = parseChainId(fileName.split(".")[0])?.groups
    const chainIdFromFileName = parsedChainId?.reference

    // Validate chain ID matches filename
    if (chainIdFromFileName != fileDataJson.chainId) {
      return { error: `File Name does not match with ChainID in ${fileName}` }
    }

    // Validate against JSON schema
    const valid = ajv.validate(schema, fileDataJson)
    if (!valid) {
      return { 
        error: `Validation errors in ${fileName}`,
        details: ajv.errorsText(ajv.errors, { separator: '\n' })
      }
    }

    // Cache successful validation
    fs.writeFileSync(cacheFile, JSON.stringify({ success: true }))
    return { success: true }
  } catch (error) {
    return { error: `Error processing ${path.basename(fileLocation)}: ${error.message}` }
  }
}

// Main thread
if (isMainThread) {
  // Get list of chain files
  const chainFiles = fs.readdirSync(resolve('../_data/chains/'))
  const filesWithErrors = []
  const numWorkers = Math.min(require('os').cpus().length, chainFiles.length)
  const filesPerWorker = Math.ceil(chainFiles.length / numWorkers)

  console.log(`Processing ${chainFiles.length} files using ${numWorkers} workers`)

  // Create worker threads
  const workers = []
  for (let i = 0; i < numWorkers; i++) {
    const start = i * filesPerWorker
    const end = Math.min(start + filesPerWorker, chainFiles.length)
    const workerFiles = chainFiles.slice(start, end).map(file => 
      resolve(`../_data/chains/${file}`)
    )

    const worker = new Worker(__filename, { workerData: workerFiles })
    workers.push(worker)

    worker.on('message', (result) => {
      if (result.error) {
        console.error(`\n${result.error}`)
        if (result.details) {
          console.error(result.details)
        }
        filesWithErrors.push(path.basename(result.error.split(' ').pop()))
      }
    })

    worker.on('error', (error) => {
      console.error(`Worker error: ${error.message}`)
      filesWithErrors.push('worker_error')
    })
  }

  // Wait for all workers to complete
  Promise.all(workers.map(worker => new Promise(resolve => worker.on('exit', resolve))))
    .then(() => {
      // Report validation results
      if (filesWithErrors.length > 0) {
        console.error('\nValidation failed for the following files:')
        filesWithErrors.forEach(file => {
          console.error(`- ${file}`)
        })
        exit(-1)
      } else {
        console.info("\nSchema check completed successfully")
        exit(0)
      }
    })
} else {
  // Worker thread
  workerData.forEach(fileLocation => {
    const result = processFile(fileLocation)
    parentPort.postMessage(result)
  })
}
