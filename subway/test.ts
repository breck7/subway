#!/usr/bin/env ts-node

const jtree = require("jtree")
const subwayNodes = require("./built/nodes.js")
const cheerio = require("cheerio")
const fs = require("fs")
const tap = require("tap")

const grammarPath = __dirname + "/subway.grammar"
const SubwayConstructor = jtree.getProgramConstructor(grammarPath)

// [] Test for Grammar Errors
// [] Test programs for errors
// [] Execute programs and check results

const save = (name: string, results: string) => {
  const filename = __dirname + `/testOutput/${name}.html`
  fs.writeFileSync(filename, results, "utf8")
  return filename
}

const testTree: any = {}
testTree._runOnly = []

testTree.heredoc = equal => {
  const grammar = `name PHP
global_scope black
contexts
 main
  match <?php
   scope orange
  match <<<([A-Za-z][A-Za-z0-9_]*)
   push heredoc
 heredoc
  meta_scope gray
  match ^\\1;
   pop true`

  const code = `<?php

$foo = <<<DOG
  This is a dog
  He is yellow.
  DOG;
DOG;`

  const expected = `line
 span <?php
  scopes orange
line
 span
  scopes black
line
 span $foo =
  scopes black
 span <<<DOG
  scopes black gray
line
 span   This is a dog
  scopes black gray
line
 span   He is yellow.
  scopes black gray
line
 span   DOG;
  scopes black gray
line
 span DOG;
  scopes black gray`

  const program = new SubwayConstructor(grammar)
  program.verbose = false
  const results = program.execute(code)

  const errs = program.getProgramErrors()
  equal(errs.length, 0, "no errors")

  //  console.log(results)

  save("heredoc", program.toHtml(results))
}

testTree.grammarError = equal => {
  const grammar = `version 2.1
name dag
file_extensions dag
global_2scope source.dag
contexts
 main
  match \\d+
   scopde blue`

  const program = new SubwayConstructor(grammar)
  program.verbose = false

  const errs = program.getProgramErrors()
  equal(errs.length, 2, "2 errors")
}

testTree.digits = equal => {
  const grammar = `version 2.1
name dag
file_extensions dag
global_scope source.dag
contexts
 main
  match \\d+
   scope blue
  match \\+
   scope orange
  match \\w+
   scope green
  match ;
   scope red`

  const program = new SubwayConstructor(grammar)
  program.verbose = false

  const errs = program.getProgramErrors()
  equal(errs.length, 0, "no errors")

  //console.log(program.getInPlaceSyntaxTreeWithNodeTypes())
  //console.log(program.getTreeWithNodeTypes())

  const results = program.execute(`1 + 1;
  23 + 232;;
  2++2;zaaa

  23`)

  const html = program.toHtml(results)
  save("digits", html)

  const cheer = cheerio.load(html)
  equal(cheer("span:contains(zaaa)").css("color"), "green")

  //const yaml = program.toYAML()
  //console.log(yaml)
}

const runTests = testTree => {
  const testsToRun = testTree._runOnly.length
    ? testTree._runOnly
    : Object.keys(testTree).filter(key => !key.startsWith("_"))
  testsToRun.forEach(key => {
    tap.test(key, function(childTest) {
      const testCase = testTree[key](childTest.equal)
      childTest.end()
    })
  })
}

runTests(testTree)
