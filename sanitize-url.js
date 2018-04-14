function unJsessionify(url) {
  url.pathname = url.pathname.replace(/;jsessionid=[a-z0-9]+$/i, '')
}

module.exports.unJsessionify = unJsessionify
