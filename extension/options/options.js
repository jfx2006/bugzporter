document.querySelector("form").onsubmit = async (event) => {
  event.preventDefault()
  browser.storage.local.set({
    apiToken: document.querySelector("#apiToken").value,
  })
  const btn = document.querySelector("button")
  btn.textContent = "Saved"
  btn.classList.add("saved")
}

browser.storage.local.get("apiToken", ({ apiToken }) => {
  if (apiToken) {
    document.querySelector("#apiToken").value = apiToken
  }
})
