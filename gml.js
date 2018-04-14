/**
 * Dead simple GML unparser for directed graphs.
 *
 * Keeps output ordered as much as possible
 *
 * @link https://en.wikipedia.org/wiki/Graph_Modelling_Language
 */

const _ = require('lodash')

/**
 * @constructor
 */
let Graph = module.exports.Graph = function Graph() {
  let vertices = {},
      edges = {},
      vertex_order = [],
      edge_order = [],
      vertex_count = 0,
      edge_count = 0

  this.vertices = () => _.clone(vertex_order)
  this.edges    = () => _.clone(edge_order)
  this.stats    = () => vertex_count + " vertices, " + edge_count + " edges"

  /**
   * @constructor
   *
   * @param id The user-supplied identifier
   */
  function Vertex (id) {
    this.id = id
    this.sym = gensym()
  }

  this.vertex = function(id) {
    if (! vertices[id]) {
      vertices[id] = new Vertex(id);
      vertex_order.push(vertices[id])
      vertex_count += 1
    }
    return vertices[id];
  }

  /**
   * @constructor
   */
  function Edge (from, to) {
    this.from = from
    this.to   = to
    let label = undefined
    this.label = function(opt_label) {
      if (arguments.length) {
        label = opt_label
      } else {
        return label
      }
    }
  }

  this.edge = function(from, to) {
    let edge_key = from.sym + "/" + to.sym
    if (edges[edge_key]) {
      return edges[edge_key]
    } else {
      let e = edges[edge_key] = new Edge(from, to)
      edge_order.push(e)
      edge_count += 1
      return e
    }
  }
}

/**
 * @see http://www.fim.uni-passau.de/fileadmin/files/lehrstuhl/brandenburg/projekte/gml/gml-technical-report.pdf
 */
Graph.prototype.to_GML = function() {
  let retval = "graph [\n"
  retval += "  directed 1\n"
  for(let v of this.vertices()) {
    retval += "  node [\n"
    retval += "    id "    + v.sym + "\n"
    retval += "    label \"" + sanitize_ID(v.id) + "\"\n"
    retval += "  ]\n"
  }

  for(let e of this.edges()) {
    let from = e.from, to = e.to
    retval += "  edge [\n"
    retval += "    source " + from.sym + "\n"
    retval += "    target " + to.sym   + "\n"
    if (e.label() !== undefined) {
      retval += "    label \"" + sanitize_ID(e.label()) + "\"\n"
    }
    retval += "  ]\n"
  }

  retval += "]\n"
  return retval
}

/* Aah, how lovely it is to have an excuse to write the classical
 * close-over-mutable-counter function.
 */
const gensym = (function() {
  let unique_id = 0
  return function() {
    unique_id = unique_id + 1
    return unique_id
  }
})()

function sanitize_ID (id) {
  return id.replace(/\W_+/g,"-");
}
