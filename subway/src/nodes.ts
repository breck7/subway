#!/usr/bin/env ts-node

import * as lodash from "lodash"
// import * as jtree from "jtree"
const jtree = require("jtree")

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

interface MatchResult {
  start: number
  end: number
  text: string
  captured: string[]
  matchNode: MatchNode
}

/*
Note on RegExpExecArray:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
If the match succeeds, the exec() method returns an array and updates properties of the
regular expression object. The returned array has the matched text as the first item, and
then one item for each capturing parenthesis that matched containing the text that was captured.
*/

class MatchNode extends jtree.NonTerminalNode implements ContextStatement {
  // Note that the actions: push, pop, set and embed are exclusive, and only one of
  // them may be used within a single match pattern.
  public push: contextName | contextPath | contextName[] | ContextStatement
  public set: contextName | contextPath | contextName[] | ContextStatement
  public pop: boolean = false // Can only be true

  // When a context has multiple patterns, the leftmost one will be found.
  // When multiple patterns match at the same position, the first defined pattern will be selected.
  public match: RegExp = /a/g
  public scope: scope
  public captures: { [index1plus: number]: scope } = {}
  public embed: contextName

  public getScopes(): scope[] {
    return this.get("scopes").split(" ")
  }

  /* This contains a list of patterns that will be inserted into every context
  defined within JavaScript.sublime-syntax. Note that with_prototype is conceptually
  similar to the prototype context, however it will be always be inserted into every
  referenced context irrespective of their meta_include_prototype setting.*/
  public with_prototype: ContextNode

  public test(line: string): MatchResult[] {
    let match: RegExpExecArray
    let matches: MatchResult[] = []
    const reg = this.getContent()
    let re = new RegExp(reg, "g")
    while ((match = re.exec(line)) !== null) {
      const text = match[0]
      const captured = []
      let index = 1
      while (match[index] !== undefined) {
        captured.push(match[index])
        index++
      }
      const result: MatchResult = {
        start: match.index,
        end: text.length + match.index,
        text: text,
        captured: captured,
        matchNode: this
      }
      matches.push(result)
    }
    return matches
  }
}

class Include implements ContextStatement {}

class ContextNode extends jtree.NonTerminalNode {
  public id: contextName
  public items: ContextStatement[]

  getId() {
    return this.getKeyword()
  }

  // META PATTERNS:
  // Meta patterns must be listed first in the context, before any match or include patterns.

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
}

interface Span {
  text: string
  scopes: scope[]
}

class State {
  private _program: ProgramNode

  constructor(program: ProgramNode) {
    this._program = program
    this.contextStack.push(program.getMainContext())
  }

  getScopeChain() {
    const arr = this.contextStack.map(context => context.get("meta_scope")).filter(i => i)
    arr.unshift(this._program.scope)
    return arr
  }

  public get currentContext() {
    return this.contextStack[this.contextStack.length - 1]
  }

  public contextStack: ContextNode[] = []
  public remainingLines: string[]
  public parsedSpans: Span[]
  public captured: string[] // does each match retain its own captured?
}

class Line {
  private _string: string
  constructor(line: string) {
    this._string = line
  }

  public parse(state: State): Span[] {
    const spans: Span[] = []
    const line = this._string

    const context = state.currentContext
    const allMatchResults: MatchResult[][] = context
      .getChildrenByNodeType(MatchNode)
      .map(node => (<MatchNode>node).test(line))
    // Sort by left most.

    const sorted = lodash.sortBy(lodash.flatten(allMatchResults), ["start"])
    let consumed = 0
    const len = line.length
    const scopes = state.getScopeChain()
    while (consumed < len && sorted.length) {
      const nextMatch = sorted.shift()

      // add skipped matches:
      if (nextMatch.start > consumed)
        spans.push({
          text: line.substr(consumed, nextMatch.start - consumed),
          scopes: scopes
        })

      // Apply match
      spans.push({
        text: nextMatch.text,
        scopes: scopes.concat(nextMatch.matchNode.getScopes())
      })

      // jump consumed
      consumed = nextMatch.end
    }
    // Not sure about this. What about run ons?
    if (consumed < len - 1)
      spans.push({
        text: line.substr(consumed),
        scopes: scopes
      })
    return spans
  }
}

class ProgramNode extends jtree.program {
  public hidden = false
  public first_line_match = ""

  toYAML() {
    return `%YAML 1.2
---
name: ${this.name}
file_extensions: [${this.file_extensions.join(",")}]
scope: ${this.scope}

contexts:`
  }

  public variables: { [name: string]: string } = {}

  public contexts: { [name: string]: ContextNode } = {
    prototype: new ContextNode(),
    main: new ContextNode()
  }

  public get name(): string {
    return this.get("name")
  }

  public getMainContext(): ContextNode {
    const main = this.getNode("contexts main")
    if (!main || !(main instanceof ContextNode)) throw new Error("No main context, or main ContextNode found.")
    return main
  }

  public get file_extensions(): string[] {
    return this.getNode("file_extensions").getWordsFrom(1)
  }

  public get scope(): string {
    return this.get("global_scope")
  }

  execute(content: string): Span[][] {
    const state = new State(this)
    const res = content.split("\n").map(line => new Line(line).parse(state))
    console.log(new jtree.TreeNode(res).toString())
    return res

    // const contextStack = [this.contexts.main]
    // for (let line in lines) {
    //   let context = contextStack[contextStack.length - 1]
    //   let matchBlocks = context.getMatchBlocks()
    //   let part = ""
    //   for (let matchBlock of matchBlocks) {
    //     for (let char of line.split("")) {
    //       part += char
    //       let matches = part.match(matchBlock.match)
    //       if (matches) {
    //         // apply scope to text. capture
    //         if (matchBlock.pop) {
    //         } else if (matchBlock.embed) {
    //         } else if (matchBlock.push) {
    //         } else if (matchBlock.set) {
    //           // first pops this context, then does same as push
    //         }
    //       }
    //     }
    //     //if (line)
    //   }
    // }
    // return results
  }
}

module.exports = {
  ProgramNode: ProgramNode,
  ContextNode: ContextNode,
  MatchNode: MatchNode,
  Colors: {
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
}
