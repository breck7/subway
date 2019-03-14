#!/usr/bin/env ts-node

const jtree = require("jtree")
const subwayNodes = require("./built/nodes.js")
const fs = require("fs")
const colors = subwayNodes.Colors

const grammarPath = __dirname + "/subway.grammar"
const SubwayConstructor = jtree.getProgramConstructor(grammarPath)

// [] Test for Grammar Errors
// [] Test programs for errors
// [] Execute programs and check results

const save = (name: string, results: string) =>
  fs.writeFileSync(__dirname + `/testOutput/${name}.html`, results, "utf8")

const testTree: any = {}

testTree.heredoc = () => {
  const grammar = `name PHP
global_scope source.php
contexts
 main
  match <?php
   scope ${colors.orange}.open_php
  match <<<([A-Za-z][A-Za-z0-9_]*)
   push heredoc
 heredoc
  meta_scope string.unquoted.heredoc
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
  scopes source.php
line
 span
  scopes source.php
line
 span $foo =
  scopes source.php
 span <<<DOG
  scopes source.php string.unquoted.heredoc
line
 span   This is a dog
  scopes source.php string.unquoted.heredoc
line
 span   He is yellow.
  scopes source.php string.unquoted.heredoc
line
 span   DOG;
  scopes source.php string.unquoted.heredoc
line
 span DOG;
  scopes source.php string.unquoted.heredoc`

  const program = new SubwayConstructor(grammar)

  const results = program.execute(code)

  console.log(results)

  save("heredoc", program.toHtml(results))
}

testTree.digits = () => {
  const grammar = `version 2.1
name dag
file_extensions dag
global_scope source.dag
contexts
 main
  match \\d+
   scope ${colors.blue}.digit
   push brackets
  match \\+
   scope ${colors.orange}.plus
  match ;
   scope ${colors.red}.semicolon`

  const program = new SubwayConstructor(grammar)

  const errs = program.getProgramErrors()
  if (errs.length) {
    console.log(errs)
  } else {
    console.log("no program errors")
  }
  //console.log(program.getInPlaceSyntaxTreeWithNodeTypes())
  //console.log(program.getTreeWithNodeTypes())

  //const results = program.execute(`1 + 1;`)

  const results = program.execute(`1 + 1;
  23 + 232;;
  2++2;zaaa

  23`)
  console.log(results)

  save("digits", program.toHtml(results))

  // console.log(program.toString())
  //const yaml = program.toYAML()
  //console.log(yaml)
}
testTree.digits()
testTree.heredoc()
