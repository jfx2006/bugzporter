;(function () {
  /**
   * Check and set a global guard variable.
   * If this content script is injected into the same page again,
   * it will do nothing next time.
   */
  if (window.hasRun || document.getElementById("port-btn")) {
    return
  }
  window.hasRun = true

  const PORT_BZ_PRODUCT = "Thunderbird"
  const PORT_BZ_COMPONENT = "Upstream Synchronization"

  function isLoggedIn() {
    const e = document.getElementById("header-account")
    return e !== null
  }

  function isInt(str_value) {
    const parsed = Number.parseInt(str_value, 10)
    return (!Number.isNaN(parsed))
  }

  function makePortURL(this_bug, this_summary) {
    const bug_type = document.querySelector(
      "#field-value-bug_type > .bug-type-label"
    ).dataset["type"]
    const target_milestone = document.getElementById(
      "field-value-target_milestone"
    )?.textContent?.trim().split(" ")?.[0]

    let url = new URL(
      "https://bugzilla.mozilla.org/enter_bug.cgi?format=__default__"
    )
    url.searchParams.append("product", PORT_BZ_PRODUCT)
    url.searchParams.append("component", PORT_BZ_COMPONENT)
    url.searchParams.append("see_also", this_bug)
    url.searchParams.append(
      "short_desc",
      `Port bug ${this_bug}: ${this_summary}`
    )
    url.searchParams.append("bug_type", bug_type)
    if (target_milestone && isInt(target_milestone)) {
      url.searchParams.append("version", `Thunderbird ${target_milestone}`)
    }
    return url
  }

  function makeButton() {
    /* <button type="button" id="port-btn" class="primary">
        <span id="mode-btn-readonly" title="Port Bug to Thunderbird">Port Bug</span>
      </button> */
    const portBtnElem = document.createElement("button")
    portBtnElem.type = "button"
    portBtnElem.id = "port-btn"
    portBtnElem.classList.add("primary")
    const portSpan = document.createElement("span")
    portSpan.id = "port-btn-readonly"
    portSpan.title = "Port Bug to Thunderbird"
    portSpan.innerText = "Port Bug"
    portBtnElem.appendChild(portSpan)

    portBtnElem.onclick = function () {
      const BUGZILLA = window.wrappedJSObject.BUGZILLA
      const url = makePortURL(BUGZILLA.bug_id, BUGZILLA.bug_summary)
      open(url.href)
    }

    return portBtnElem
  }

  if (isLoggedIn()) {
    const portBtnElem = makeButton()
    const pageToolbar = document.querySelector("#page-toolbar > div.buttons")
    pageToolbar.insertAdjacentElement("beforeend", portBtnElem)
  }
})()
