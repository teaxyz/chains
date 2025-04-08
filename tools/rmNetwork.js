/**
 * Tool to remove deprecated 'network' parameter from chain configuration files
 * This script processes all chain files in the _data/chains directory
 * and removes the 'network' field if it exists
 */

const fs = require('fs')
const path = require('path')
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '10')

// Create backup directory
const backupDir = path.resolve(__dirname, '../_data/chains_backup')
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir)
}

// Worker function to process a single file
function processFile(fileLocation, backupLocation) {
  try {
    // Create backup
    if (!dryRun) {
      fs.copyFileSync(fileLocation, backupLocation)
    }
    
    const fileData = fs.readFileSync(fileLocation, 'utf8')
    const fileDataJson = JSON.parse(fileData)

    // Remove network field if it exists
    if (fileDataJson.network) {
      if (!dryRun) {
        delete fileDataJson.network
        // Write back to file with proper formatting
        fs.writeFileSync(fileLocation, JSON.stringify(fileDataJson, null, 2))
      }
      return { modified: true, file: path.basename(fileLocation) }
    }
    return { modified: false }
  } catch (error) {
    return { error: `Error processing ${path.basename(fileLocation)}: ${error.message}` }
  }
}

// Main thread
if (isMainThread) {
  // Get list of chain files
  const chainFiles = fs.readdirSync(path.resolve(__dirname, '../_data/chains/'))
  const modifiedFiles = []
  const numWorkers = Math.min(require('os').cpus().length, Math.ceil(chainFiles.length / batchSize))
  const filesPerWorker = Math.ceil(chainFiles.length / numWorkers)

  console.log(`Processing ${chainFiles.length} files using ${numWorkers} workers`)
  if (dryRun) {
    console.log('Running in dry-run mode - no changes will be made')
  }

  // Create worker threads
  const workers = []
  for (let i = 0; i < numWorkers; i++) {
    const start = i * filesPerWorker
    const end = Math.min(start + filesPerWorker, chainFiles.length)
    const workerFiles = chainFiles.slice(start, end).map(file => ({
      fileLocation: path.resolve(__dirname, `../_data/chains/${file}`),
      backupLocation: path.resolve(backupDir, file)
    }))

    const worker = new Worker(__filename, { workerData: workerFiles })
    workers.push(worker)

    worker.on('message', (result) => {
      if (result.error) {
        console.error(`\n${result.error}`)
        process.exit(1)
      }
      if (result.modified) {
        modifiedFiles.push(result.file)
        console.log(`Removed network field from ${result.file}`)
      }
    })

    worker.on('error', (error) => {
      console.error(`Worker error: ${error.message}`)
      process.exit(1)
    })
  }

  // Wait for all workers to complete
  Promise.all(workers.map(worker => new Promise(resolve => worker.on('exit', resolve))))
    .then(() => {
      console.log('\nNetwork field removal completed successfully')
      console.log(`Modified ${modifiedFiles.length} files`)
      if (!dryRun) {
        console.log(`Backups created in ${backupDir}`)
      }
    })
    .catch(error => {
      console.error('\nError during processing:', error.message)
      if (!dryRun) {
        console.log('\nRolling back changes...')
        
        // Rollback changes
        for (const file of modifiedFiles) {
          const fileLocation = path.resolve(__dirname, `../_data/chains/${file}`)
          const backupLocation = path.resolve(backupDir, file)
          fs.copyFileSync(backupLocation, fileLocation)
          console.log(`Restored ${file} from backup`)
        }
        
        console.log('\nRollback completed')
      }
      process.exit(1)
    })
} else {
  // Worker thread
  workerData.forEach(({ fileLocation, backupLocation }) => {
    const result = processFile(fileLocation, backupLocation)
    parentPort.postMessage(result)
  })
}

// Note: 
// Run `npx prettier --write --ignore-unknown _data` from Project Directory
