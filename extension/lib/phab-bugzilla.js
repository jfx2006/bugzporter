const API = "https://phabricator.services.mozilla.com/api/"

async function request(endpoint, apiToken, params) {
  let body = new URLSearchParams()
  body.append("api.token", apiToken)

  for (let [name, value] of params) {
    body.append(name, value)
  }

  const res = await fetch(API + endpoint, {
    method: "POST",
    body,
    credentials: "omit",
  })
  return await res.json()
}

/**
 * Retrieve phid for a bmo user_id from Conduit API and save to local storage
 * @param user_id
 * @param apiToken
 * @returns {Promise<String|Object>}
 */
async function getPhid(user_id, apiToken) {
  const account = await request("bmoexternalaccount.search", apiToken, [
    ["accountids[0]", user_id],
  ])
  if (account.error_info) {
    return account
  }

  const phid = account.result?.[0]?.phid
  if (!phid) {
    return {
      error_info: `Could not find phabricator account for BMO user ${user_id}`,
    }
  }

  await browser.storage.local.set({ [`bmo.${user_id}`]: phid })
  return phid
}

async function checkApiToken(user_id) {
  const bmo_key = `bmo.${user_id}`
  // eslint-disable-next-line no-unused-vars
  let { apiToken, [bmo_key]: phid } = await browser.storage.local.get([
    "apiToken",
    bmo_key,
  ])

  return Boolean(apiToken)
}

async function revisionSearch(user_id, constraints) {
  const bmo_key = `bmo.${user_id}`
  let { apiToken, [bmo_key]: phid } = await browser.storage.local.get([
    "apiToken",
    bmo_key,
  ])

  if (!apiToken) {
    return { error_info: "Missing API Token go to add-on options." }
  }

  if (!phid) {
    phid = await getPhid(user_id, apiToken)
  }

  return await request("differential.revision.search", apiToken, [
    [constraints, phid],
    ["constraints[statuses][0]", "accepted"],
    ["constraints[statuses][1]", "needs-review"],
    ["constraints[statuses][2]", "changes-planned"],
    ["constraints[statuses][3]", "needs-revision"],
    ["constraints[statuses][4]", "draft"],
  ])
}

function init() {
  browser.runtime.onMessage.addListener(async (data, sender) => {
    if (data.msg === "check.apikey") {
      return await checkApiToken(data.user_id)
    }
    if (data.msg === "revision.search") {
      return await revisionSearch(data.user_id, data.constraints)
    }
  })
}

init()
