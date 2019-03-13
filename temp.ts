#!/usr/bin/env ts-node

declare type scope = string
declare type contextPath = string // Ie:  Packages/JavaScript/JavaScript.sublime-syntax
declare type statementType =
  | "match"
  | "meta_scope"
  | "include"
  | "meta_content_scope"
  | "contextPath"
  | "meta_include_prototype"
  | "clear_scopes"
declare type contextName = string

interface ContextStatement {}

//const dates: Date[] = [1, new Date()].filter(num => num instanceof Date)

class MetaScope implements ContextStatement {}

class EmbedStatement implements ContextStatement {
  public escape: RegExp
  public embed_scope: scope
  public escape_captures: { [index0plus: number]: scope } = {} // Use capture group 0 to apply a scope to the entire escape match.
}

class MatchBlock implements ContextStatement {
  // Note that the actions: push, pop, set and embed are exclusive, and only one of
  // them may be used within a single match pattern.
  public push: contextName | contextPath | contextName[] | ContextStatement
  public set: contextName | contextPath | contextName[] | ContextStatement
  public pop: boolean = false // Can only be true
  public match: RegExp = /a/
  public scope: scope
  public captures: { [index1plus: number]: scope } = {}
  public embed: contextName

  /* This contains a list of patterns that will be inserted into every context
  defined within JavaScript.sublime-syntax. Note that with_prototype is conceptually
  similar to the prototype context, however it will be always be inserted into every
  referenced context irrespective of their meta_include_prototype setting.*/
  public with_prototype: Context

  public getResults(line, context) {
    const match = line.match(this.match)
    if (!match) return false
  }
}

class Include implements ContextStatement {}

class Context {
  public id: contextName
  public items: ContextStatement[]

  // This assigns the given scope to all text within this context,
  // including the patterns that push the context onto the stack and pop it off.
  public meta_scope: string

  public meta_content_scope: string // As above, but does not apply to the text that
  // triggers the context (e.g., in the above string example, the content scope would not
  // get applied to the quote characters).

  // Used to stop the current context from automatically including the prototype context.
  public meta_include_prototype: boolean

  // This setting allows removing scope names from the current stack.
  // It can be an integer, or the value true to remove all scope names.
  // It is applied before meta_scope and meta_content_scope.
  // This is typically only used when one syntax is embedding another.
  public clear_scopes: boolean | number

  getExpanded() {
    // todo: add includes and prototypes
    return this.items
  }

  getMatchBlocks(): MatchBlock[] {
    return this.getExpanded().filter((item): item is MatchBlock => item instanceof MatchBlock)
  }
}

interface Parsed {
  content: string
  scopes: scope[]
}

class Syntax {
  public name: string
  public file_extensions: string[]
  public scope: scope
  public hidden = false
  public first_line_match = ""

  public variables: { [name: string]: string } = {}

  public contexts: { [name: string]: Context } = {
    prototype: new Context(),
    main: new Context()
  }

  public get prototype() {
    return this.contexts.prototype
  }

  public get main() {
    return this.contexts.main
  }

  parse(content: string): Parsed[] {
    const lines = content.split("\n")
    const contextStack = [this.contexts.main]
    const results: Parsed[] = []
    for (let line in lines) {
      let context = contextStack[contextStack.length - 1]
      let matchBlocks = context.getMatchBlocks()
      let part = ""
      for (let matchBlock of matchBlocks) {
        for (let char of line.split("")) {
          part += char
          let matches = part.match(matchBlock.match)
          if (matches) {
            // apply scope to text. capture
            if (matchBlock.pop) {
            } else if (matchBlock.embed) {
            } else if (matchBlock.push) {
            } else if (matchBlock.set) {
              // first pops this context, then does same as push
            }
          }
        }
        //if (line)
      }
    }
    return results
  }
}

const colors = {
  blue: "storage.type.string._blue",
  red: "entity.name.tag._red",
  yellow: "string.unquoted.plain.out._yellow",
  gray_italics: "comment.block.documentation._gray_italics",
  green: "entity.name.function._green",
  pink_back: "invalid.illegal.error._pink_back",
  white: "source._white",
  orange: "variable.parameter.function._orange",
  purple: "constant.numeric.yaml-version._purple"
}

const testSyntax = `version 2.1
name dag
file_extensions dag
scope source.dag
contexts
 main
  match \d+
   scope ${colors.blue}
   push brackets
  match \+
   scope ${colors.orange}
  match ;
   scope ${colors.red}`

const test = () => {
  const syntax = new Syntax()
  const result = syntax.parse("1 + 1;")
  console.log(result)
}

/*
%YAML 1.2
---
name: C
file_extensions: [c, h]
scope: source.c

contexts:
  main:
    - match: \b(if|else|for|while)\b
      scope: keyword.control.c
    - match: '"'
      push: string

  string:
    - meta_scope: string.quoted.double.c
    - match: \\.
      scope: constant.character.escape.c
    - match: '"'
      pop: true

version 2.1
name NAME
file_extensions A B ...
scope GLOBAL_SCOPE
first_line_match <?php
hidden false
variables
 ident '[A-Za-z_][A-Za-z_0-9]*'
contexts
 main
  match \(
   push brackets
  match \)
   scope SOMESCOPE
 brackets
  match \)
   pop true
  include main
 for_stmt
  match |
   set for_stmt_expr1
 main2
  match \btypedef\b
   scope keyword.control.c
   set typedef_after_typename typename ...
 typename
  meta_scope string.unquoted.heredoc
  match \bstruct\b
   set
    match {
     set
      match }
       pop true
  match: \b[A-Za-z_][A-Za-z_0-9]*\b
   pop true



*/

test()

// _parseString(str) {
//     if (!str) return this
//       // push pop set
//     const lines = str.split(this.getYIRegex())
//     let contextMatches= []
//     lines.forEach(line => {
//       contextMatches.forEach(reg => {
//         if (line.match(reg))
//           line.apply(reg.scopecolor)
//         else
//           return true
//       })
//     })
//   }
