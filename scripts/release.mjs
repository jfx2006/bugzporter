#!/usr/bin/env node

/* Script to build, sign, and create update.json for a release. */

import crypto from "crypto"
import fs from "fs"
import path from "path"
import process from "process"

import fetch from "node-fetch"

import ghauth from "ghauth"
import ghRelease from "gh-release"

import webExt from "web-ext"
import getValidatedManifest from "../node_modules/web-ext/lib/util/manifest.js"
import SubmitClient, {JwtApiAuth as ApiAuthClass} from "../node_modules/web-ext/lib/util/submit-addon.js"

const XPI_URL = "https://github.com/jfx2006/bugzporter/releases/download"

const AMO_CRED = `${process.cwd()}/amo.json`

function checksum_file(path) {
  const fileBuffer = fs.readFileSync(path)
  const hashSum = crypto.createHash("sha256")
  hashSum.update(fileBuffer)

  return hashSum.digest("hex")
}

async function get_update_data(update_url, manifest_id) {
  const response = await fetch(update_url)
  if (response.status < 200 || response.status >= 500) {
    throw new Error(`Bad Request: ${response.statusText || response.status}.`);
  }
  const data = await response.json();
  if (response.ok) {
    return data
  }
  let result = {"addons": {}}
  result.addons[manifest_id] = {updates: []}
  return result
}

async function gh_release(xpi_file, updates_file) {
  const ghauthOpts = {
    clientId: ghRelease.clientId,
    configName: 'gh-release',
    scopes: ['repo'],
    note: 'gh-release',
    userAgent: 'gh-release',
    authUrl: `${ghRelease.OPTIONS.defaults.endpoint}/authorizations`
  }
  const assets = [xpi_file, updates_file].map(function (asset) {
    return path.relative(process.cwd(), asset)
  })
  const authData = await ghauth(ghauthOpts)
  const options = {
    auth: authData,
    dryRun: false,
    assets: assets
  }
  return ghRelease(options, function (err, result) {
    if (err) throw err
    console.log(result)
  })
}

function getAMOCred() {
  try {
    const fileBuffer = fs.readFileSync(AMO_CRED, {encoding: "utf-8"})
    return JSON.parse(fileBuffer)
  } catch(e) {
    console.error("AMO credentials file not found or unreadable.")
  }
}

async function build_or_sign(sourceDir, artifactsDir) {
  const amoAuth = getAMOCred()

  let xpi_file
  if (!amoAuth) {
    const build_result = await webExt.cmd.build(
      {
        sourceDir: sourceDir,
        artifactsDir: artifactsDir,
        overwriteDest: true,
        filename: "{name}-{version}.xpi",
        verbose: true
      },
      {
        shouldExitProgram: false
      }
    )
    xpi_file = build_result["extensionPath"]
  } else {
    const sign_result = await webExt.cmd.sign(
      {
        sourceDir: sourceDir,
        artifactsDir: artifactsDir,
        overwriteDest: true,
        filename: "{name}-{version}.xpi",
        apiKey: amoAuth.apiKey,
        apiSecret: amoAuth.apiSecret,
        verbose: true,
        channel: "unlisted"
      },
      {
        shouldExitProgram: false
      }
    )
    xpi_file = sign_result["downloadedFiles"][0]
  }
  return xpi_file
}

async function check_signed(sourceDir, artifactsDir) {
  const manifest = await getValidatedManifest(sourceDir)
  const addonId = manifest.browser_specific_settings.gecko.id
  const amoAuth = getAMOCred()
  let baseUrl = new URL("https://addons.mozilla.org/api/v5/")

  const client = new SubmitClient({
    apiAuth: new ApiAuthClass({
      apiKey: amoAuth.apiKey,
      apiSecret: amoAuth.apiSecret
    }),
    baseUrl,
    downloadDir: artifactsDir
  });

  const url = new URL(`addon/${addonId}/versions/?filter=all_with_unlisted`, client.apiUrl);
  const {
    results: [{
      id: newVersionId
    }]
  } = await client.fetchJson(url);
  const fileUrl = new URL(await client.waitForApproval(addonId, newVersionId));
  const result = await client.downloadSignedFile(fileUrl, addonId);
  return result["downloadedFiles"][0]
}

;(async () => {
  const sourceDir = `${process.cwd()}/extension`
  const artifactsDir = `${process.cwd()}/web-ext-artifacts`

  let xpi_file

  const argv = process.argv.slice(2);
  if (argv[0] === "check") {
    xpi_file = await check_signed(sourceDir, artifactsDir)
  } else {
    xpi_file = await build_or_sign(sourceDir, artifactsDir)
  }

  if (!xpi_file) {
    throw new Error("xpi_file invalid after build/check/sign.")
  }
  const manifest = await getValidatedManifest(sourceDir)
  if (!xpi_file.startsWith(artifactsDir)) {
    xpi_file = `${artifactsDir}/${xpi_file}`
  }
  const checksum = checksum_file(xpi_file)

  const update_link = `${XPI_URL}/v${manifest.version}/${path.basename(
    xpi_file
  )}`

  const manifest_id = manifest.browser_specific_settings.gecko.id
  const update_url = manifest.browser_specific_settings.gecko.update_url
  let update_data = await get_update_data(update_url, manifest_id)

  const release_data = {
    version: manifest.version,
    update_link: update_link,
    update_hash: `sha256:${checksum}`,
  }

  const updates = update_data.addons[manifest_id].updates
  let updates_copy = updates.filter(function (item, idx) {
    return item.version !== manifest.version
  })
  updates_copy.push(release_data)
  update_data.addons[manifest_id].updates = updates_copy

  const updates_file = `${artifactsDir}/updates.json`
  fs.writeFileSync(updates_file, JSON.stringify(update_data))

  await gh_release(`${xpi_file}`, updates_file)
})()
