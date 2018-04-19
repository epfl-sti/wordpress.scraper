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
    parsed_count = 0,
    newsatone_meta = {},
    newnews_meta = {},
    covershot_popup_meta = {}

let graph = new gml.Graph()
let request = throat(10, require('request-promise-native'))
// Do this if you want to cache (incl. negative caching on 40x errors):
request = cachify.with40x(request)
// Do this every once in a while if you want to clear the cache:
// request.clear_cache()

request.on("cache-miss", function(url) {
  console.log("Cache miss at " + url)
})

request.on("cache-hit", function(url) {
  process.stderr.write(".")
})

request.on("cache-write-with-error", function(url, e) {
  console.log("Encaching error " + e.statusCode + " at " + url)
})

request.on("cache-hit-with-error", function(url, e) {
  console.log("Using cached error " + e.statusCode + " at " + url)
})

request.on("cache-write", function(url) {
  console.log("Cache write at " + url)
  if (url.includes("fileNotFound")) {
    console.log("WAT")
  }
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

    let html = $.html()
    function scrape_by_regex(html, re, into_object) {
      let matched = html.match(re)
      if (matched) {
        into_object[url.toString()] = matched[1]
      }
    }

    scrape_by_regex(html, /newsatone.pl proudly presents: (\S+)/,    newsatone_meta)
    scrape_by_regex(html, /newnews.pl proudly presents: (\S+)/,      newnews_meta)
    scrape_by_regex(html, /win.document.body.innerHTML = '([^']*)'/, covershot_popup_meta)
  },
  link(from, $, e, to) {
    let navKind = isNavLink($, e)
    if (navKind && navKind !== "breadcrumb-parent") return

    if (navKind) {
      debug("Backcrumb link: " + from + " → " + to)
      graph.edge(graph.vertex(from), graph.vertex(to)).label("parent")
    } else {
      graph.edge(graph.vertex(from), graph.vertex(to))
    }

    if (isHomepage(to)) {
      debug("Link back from " + from + " to home (" + to + ") at " + $(e).parents().get().map((e) => e.name).join(","))
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
.then(() => writeFileP("newsatone-meta.json", JSON.stringify(newsatone_meta)))
.then(() => writeFileP("newnews-meta.json", JSON.stringify(newnews_meta)))
.then(() => writeFileP("covershots-meta.json", JSON.stringify(covershot_popup_meta)))


function isNavLink ($, e) {
  let parent = $(e).parent()[0]
  if (parent.name === "h1" && parent.attribs["class"].includes("site-title")) {
    return "site-title"
  }

  let nav = $(e).parents("nav")[0]
  if (nav) {
    let navitemprop = $(nav).attr("itemprop")
    if (navitemprop != "breadcrumb") {
      return "nav"
    }
    let crumbs = $("li.nav-item a", nav)
    if (e === crumbs[crumbs.length - 2]) {
      return "breadcrumb-parent"
    } else {
      return "breadcrumb"
    }
  }
  return null
}

function isHomepage (url) {
  return (url === "https://sti.epfl.ch/fr" ||
          url === "https://sti.epfl.ch/en" ||
          url === "https://sti.epfl.ch/")
}
