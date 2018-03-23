const { URL } = require('url'),
      urlFormat = require('url').format
var co = require('co');
var throat = require('throat');
var request = require('request-promise-native');
var cheerio = require('cheerio');

function* url2cheerio (url) {
  let html = yield request(url)
  return cheerio.load(html)
}

function* all_urls (opts) {
  let { start, limit } = opts
  let $ = yield co(url2cheerio, start)
  let urls = $('a')
      .map((i, e) => new URL($(e).attr('href'), start))
      .get()
      .filter(url => url.origin === limit)
      .map(u => urlFormat(u, {fragment: false}))
  return urls
}

co(all_urls, { start: "https://sti-test.epfl.ch/",
               limit: "https://sti-test.epfl.ch"})
  .then(function(urls) {
    console.log(urls)
  })
  .catch(function(e) { console.log("ERROR", e) })
