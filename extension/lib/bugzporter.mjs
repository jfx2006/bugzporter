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

  function isLoggedIn() {
    const e = document.getElementById("header-account")
    return e !== null
  }

  function makePortURL(this_bug, this_summary) {
    const bug_type = document.querySelector(
      "#field-value-bug_type > .bug-type-label"
    ).dataset["type"]
    let url = new URL(
      "https://bugzilla.mozilla.org/enter_bug.cgi?format=__default__&product=Thunderbird&component=Upstream%20Synchronization"
    )
    url.searchParams.append("see_also", this_bug)
    url.searchParams.append(
      "short_desc",
      `Port bug ${this_bug}: ${this_summary}`
    )
    url.searchParams.append("bug_type", bug_type)
    return url
  }

  if (isLoggedIn()) {
    const portBtn = `<button type="button" id="port-btn" class="primary">
        <span id="mode-btn-readonly" title="Port Bug to Thunderbird">Port Bug</span>
      </button`

    const pageToolbar = document.querySelector("#page-toolbar > div.buttons")
    pageToolbar.insertAdjacentHTML("beforeend", portBtn)
    const portBtnElem = document.getElementById("port-btn")

    portBtnElem.onclick = function () {
      const BUGZILLA = window.wrappedJSObject.BUGZILLA
      const url = makePortURL(BUGZILLA.bug_id, BUGZILLA.bug_summary)
      open(url.href)
    }
  }
})()
