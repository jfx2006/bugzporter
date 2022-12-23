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

const XPI_URL = "https://github.com/jfx2006/bugzporter/releases/download"


function checksum_file(path) {
  const fileBuffer = fs.readFileSync(path)
  const hashSum = crypto.createHash("sha256")
  hashSum.update(fileBuffer)

  return hashSum.digest("hex")
}

async function get_update_data(update_url, manifest_id) {
  const response = await fetch(update_url)
  if (response.size > 0) {
    return await response.json()
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

;(async () => {
  const sourceDir = `${process.cwd()}/extension`
  const artifactsDir = `${process.cwd()}/web-ext-artifacts`

  const build_result = await webExt.cmd.build(
    {
      sourceDir: sourceDir,
      artifactsDir: artifactsDir,
      overwriteDest: true,
      filename: "{name}-{version}.xpi",
    },
    {
      shouldExitProgram: false,
    }
  )
  const xpi_file = build_result["extensionPath"]
  const manifest = await getValidatedManifest(sourceDir)
  const checksum = checksum_file(xpi_file)

  const update_link = `${XPI_URL}/${manifest.version}/${path.basename(
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

  await gh_release(xpi_file, updates_file)
})()
