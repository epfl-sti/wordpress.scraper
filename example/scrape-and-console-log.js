'use strict'

const scrape = require('../scraper'),
      throat = require('throat')

scrape({
  request: throat(10, require('request-promise-native')),
  start: "https://sti-test.epfl.ch/", 
  keep_p: (url_obj) => url_obj.origin === "https://sti-test.epfl.ch",
  parsed(url, $) {
    console.log('Parsed ' + url)
  },
  link(from, to) {
    if (to.startsWith('https://sti-test.epfl.ch')) {
      console.log('Link from ' + from + ' to ' + to)
    }
  },
  error(url, e) {
    if (e.statusCode) {
      console.log(e.statusCode + ' at ' + url)
    } else {
      console.log(e + ' at ' + url)
      throw e
    }
  }
})
