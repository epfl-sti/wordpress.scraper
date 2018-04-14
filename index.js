'use strict'

const scrape = require('./scraper'),
      unJsessionify = require('./sanitize-url').unJsessionify,
      gml = require('./gml'),
      cachify = require('./cachify'),
      throat = require('throat'),
      fs = require("fs"),
      promisify = require("util").promisify,
      writeFileP = promisify(fs.writeFile)

let graph = new gml.Graph()
let request = throat(10, require('request-promise-native'))
// Do this if you want to cache:
request = cachify(request)
// Do this every once in a while if you want to clear the cache:
// request.clear_cache()

scrape({
  request: request,
  start: "https://sti.epfl.ch/",
  keep_p: function(url_obj) {
    unJsessionify(url_obj)
    if (! url_obj.origin.includes("sti.epfl.ch") ) return false
    if (url_obj.pathname && url_obj.pathname.includes("tequila_login")) return false
    if (url_obj.pathname && url_obj.pathname.endsWith(".pdf")) return false
    return true
  },
  parsed(url, $) {
    // console.log('Parsed ' + url)
    graph.vertex(url)
  },
  link(from, to) {
    if (to.includes('sti.epfl.ch')) {
      // console.log('Link from ' + from + ' to ' + to)
      graph.edge(graph.vertex(from), graph.vertex(to))
    }
  },
  error(url, e) {
    if (e.statusCode) {
      console.log(e.statusCode + ' at ' + url)
      if (e.statusCode === 404) {
        graph.edge(graph.vertex(url), graph.vertex("404"))
      }
    } else {
      console.log(e + ' at ' + url)
      throw e
    }
  }
}).then(() => writeFileP("sti-website.gml", graph.to_GML()))
