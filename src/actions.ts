import chalk from 'chalk'
import { getHost, setHost } from './config'
import * as log from './log'
import { zipFolder, tryCatch, isPackageDir } from './utils'
import * as fs from 'fs'
import { join, basename } from 'path'
import * as chokidar from 'chokidar'
import * as _ from 'lodash'
import * as got from 'got'
import * as FormData from 'form-data'

export function showHost () {
  const ip = getHost()
  if (!ip) {
    log.warn('Host IP has not been set up yet')
    return
  }
  console.log(`${chalk.greenBright(`Your Host IP:`)} ${ip}`)
}

export const sync = _.debounce(async (isdir, path, host, packageName) => {
  log.info('File changed, uploading...')
  const formData = new FormData()
  if (isdir) {
    path = await zipFolder(path, `${packageName}.box`)
  }
  formData.append('files[]', fs.createReadStream(path))

  const [, err] = await tryCatch(got.post(`http://${host}/upload`, {
    body: formData,
    timeout: 5000
  }))
  if (err) {
    log.error(err.message)
    return
  }
  log.info('🎉 Update success!')
}, 100)

export function watch (file: string) {
  const host = getHost()
  if (!host) {
    log.error('Host IP has not been set up yet')
    process.exit(1)
  }

  if (!fs.existsSync(file)) {
    log.error(`${file} not exists`)
  }

  log.info(`Your current Host IP: ${host}`)
  const isDir = fs.statSync(file).isDirectory()

  let packageName = basename(file)
  if (isDir) {
    if (!isPackageDir(file)) {
      log.error(`${file} is not a package!`)
      process.exit(1)
    }

    const config = JSON.parse(fs.readFileSync(join(file, 'config.json')).toString())
    const name = _.get(config, 'info.name')
    if (!name) {
      log.error('Package must have a name!')
      process.exit(1)
    }
    packageName = name
  }
  chokidar.watch(file, { ignoreInitial: true })
    .on('all', async () => {
      await sync(isDir, file, host, packageName)
    })
}

export function saveHost (host: string) {
  setHost(host)
  log.info(`Save your host ${host} to the config`)
}
