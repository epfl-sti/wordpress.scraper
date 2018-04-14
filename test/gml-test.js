const assert = require('assert'),
      Graph = require('../gml').Graph

const golden_output = `graph [
  directed 1
  node [
    id 1
    label "Node 1"
  ]
  node [
    id 2
    label "Node 2"
  ]
  node [
    id 3
    label "Node 3"
  ]
  edge [
    source 1
    target 2
    label "From 1 to 2"
  ]
  edge [
    source 2
    target 3
    label "From 2 to 3"
  ]
  edge [
    source 3
    target 1
    label "From 3 to 1"
  ]
]
`

describe("GML.Graph", function() {
  it("is golden", function() {
    let g = new Graph()
    g.edge(g.vertex("Node 1"), g.vertex("Node 2")).label("From 1 to 2")
    g.edge(g.vertex("Node 2"), g.vertex("Node 3")).label("From 2 to 3")
    g.edge(g.vertex("Node 3"), g.vertex("Node 1")).label("From 3 to 1")
    assert.equal(g.to_GML(), golden_output)
  })
})
