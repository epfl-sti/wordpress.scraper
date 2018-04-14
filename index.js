'use strict'

const debug = require("debug")("scrape-sti-epfl-ch"),
      scrape = require('./scraper'),
      unJsessionify = require('./sanitize-url').unJsessionify,
      gml = require('./gml'),
      cachify = require('./cachify'),
      throat = require('throat'),
      fs = require("fs"),
      promisify = require("util").promisify,
      writeFileP = promisify(fs.writeFile)

function do_every_n(n) {
  let countdown = n
  return function(do_it) {
    if (--countdown <= 0) {
      countdown = n
      do_it()
    }
  }
}

let progress = do_every_n(1000),
    parsed_count = 0

let graph = new gml.Graph()
let request = throat(10, require('request-promise-native'))
// Do this if you want to cache:
request = cachify(request)
// Do this every once in a while if you want to clear the cache:
// request.clear_cache()

request.on("cache-miss", function(url) {
  console.log("Cache miss at " + url)
})

request.on("cache-hit", function(url) {
  process.stderr.write(".")
})

scrape({
  request: request,
  start: "https://sti.epfl.ch/",
  keep_p: function(url_obj) {
    unJsessionify(url_obj)
    if (! url_obj.protocol.startsWith("https")) return false
    if (url_obj.host !== "sti.epfl.ch") return false
    if (url_obj.pathname) {
      if (url_obj.pathname.includes("tequila_login")) return false
      if (url_obj.pathname.endsWith(".pdf")) return false
      if (url_obj.pathname.endsWith(".wmv")) return false
      if (url_obj.pathname.endsWith(".docx")) return false
      if (url_obj.pathname.endsWith(".doc")) return false
      if (url_obj.pathname.endsWith(".avi")) return false
      if (url_obj.pathname.endsWith(".png")) return false
      if (url_obj.pathname.endsWith(".xls")) return false
    }
    return true
  },
  parsed(url, $) {
    // console.log('Parsed ' + url)
    parsed_count++
    graph.vertex(url)
  },
  link(from, $, e, to) {
    let nav = $(e).parents("nav")[0],
        link_is_backcrumb
    if (nav) {
      let navitemprop = $(nav).attr("itemprop")
      if (navitemprop != "breadcrumb") return
      let crumbs = $("li.nav-item a", nav)
      if (e === crumbs[crumbs.length - 2]) {
        link_is_backcrumb = true
      } else {
        return
      }
    }

    if (link_is_backcrumb) {
      debug("Backcrumb link: " + from + " → " + to)
      graph.edge(graph.vertex(from), graph.vertex(to)).label("parent")
    } else {
      graph.edge(graph.vertex(from), graph.vertex(to))
    }

    progress(function() {
      console.log("Stats: " + parsed_count + " parsed, " + graph.stats())
    })
  },
  error(url, e) {
    if (e.statusCode) {
      console.log(e.statusCode + ' at ' + url)
      graph.edge(graph.vertex(url), graph.vertex("Error " + e.statusCode))
    } else {
      console.log(e + ' at ' + url)
      throw e
    }
  }
}).then(() => {
        console.log("Done - " + graph.stats())
        return writeFileP("sti-website.gml", graph.to_GML())
})
