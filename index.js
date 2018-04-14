'use strict'

const scrape = require('./scraper'),
      gml = require('./gml'),
      throat = require('throat'),
      fs = require("fs"),
      promisify = require("util").promisify,
      writeFileP = promisify(fs.writeFile)

let graph = new gml.Graph()

scrape({
  request: throat(10, require('request-promise-native')),
  start: "https://sti.epfl.ch/",
  keep_p: (url_obj) => url_obj.origin.includes("sti.epfl.ch"),
  parsed(url, $) {
    console.log('Parsed ' + url)
    graph.vertex(url)
  },
  link(from, to) {
    if (to.includes('sti.epfl.ch')) {
      console.log('Link from ' + from + ' to ' + to)
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
