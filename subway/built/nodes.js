"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash = require("lodash");
// import * as jtree from "jtree"
const jtree = require("jtree");
//const dates: Date[] = [1, new Date()].filter(num => num instanceof Date)
class MetaScope {
}
class EmbedStatement {
    constructor() {
        this.escape_captures = {}; // Use capture group 0 to apply a scope to the entire escape match.
    }
}
/*
Note on RegExpExecArray:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
If the match succeeds, the exec() method returns an array and updates properties of the
regular expression object. The returned array has the matched text as the first item, and
then one item for each capturing parenthesis that matched containing the text that was captured.
*/
class MatchNode extends jtree.NonTerminalNode {
    constructor() {
        super(...arguments);
        // When a context has multiple patterns, the leftmost one will be found.
        // When multiple patterns match at the same position, the first defined pattern will be selected.
        this.match = /a/g;
        this.captures = {};
    }
    getScopes() {
        return this.has("scope") ? this.get("scope").split(" ") : [];
    }
    test(line, backReferences) {
        let match;
        let matches = [];
        let reg = this.getContent();
        if (backReferences.length > 0 && !reg.match(/\\\d/))
            console.error(`Expected a backreference(s) in ${reg} but none passed.`);
        // replace back references
        for (let index = 0; index < backReferences.length; index++) {
            let re2 = new RegExp(`\\\\${index + 1}`, "g");
            reg = reg.replace(re2, backReferences[index]);
        }
        let re = new RegExp(reg, "g");
        let startChar = -1;
        while ((match = re.exec(line)) !== null) {
            // protect against infinite loops, ie if regex is ^
            if (match.index > startChar)
                startChar = match.index;
            else
                break;
            const text = match[0];
            const captured = [];
            let index = 1;
            while (match[index] !== undefined) {
                captured.push(match[index]);
                index++;
            }
            const result = {
                start: match.index,
                end: text.length + match.index,
                text: text,
                captured: captured,
                matchNode: this
            };
            matches.push(result);
        }
        console.log(line);
        console.log(matches);
        return matches;
    }
}
exports.MatchNode = MatchNode;
class Include {
}
class ContextNode extends jtree.NonTerminalNode {
    constructor() {
        super(...arguments);
        this.backReferences = [];
    }
    getId() {
        return this.getKeyword();
    }
    getExpanded() {
        // todo: add includes and prototypes
        return this.items;
    }
    handle(line, state, spans, consumed = 0) {
        const allMatchResults = this.getChildrenByNodeType(MatchNode).map(node => node.test(line, this.backReferences));
        console.log(line);
        // Sort by left most.
        const sorted = lodash.sortBy(lodash.flatten(allMatchResults), ["start"]);
        const len = line.length;
        console.log(sorted.length);
        if (line === "DOG;")
            debugger;
        while (consumed < len && sorted.length) {
            const nextMatch = sorted.shift();
            const scopes = state.getScopeChain();
            if (nextMatch.start < consumed)
                continue;
            // add skipped matches:
            if (nextMatch.start > consumed)
                spans.push({
                    text: line.substr(consumed, nextMatch.start - consumed),
                    scopes: scopes
                });
            // Apply match
            const matchNode = nextMatch.matchNode;
            spans.push({
                text: nextMatch.text,
                scopes: scopes.concat(matchNode.getScopes())
            });
            const matchObj = matchNode.toObject();
            if (matchObj.push) {
                console.log("push context " + matchObj.push);
                const context = state.pushContext(matchObj.push);
                context.backReferences = nextMatch.captured;
                consumed = context.handle(line, state, spans, nextMatch.end);
            }
            else if (matchNode.get("pop") === "true") {
                console.log("pop context");
                const context = state.contextStack.pop();
                context.backReferences = [];
                // jump consumed
                return nextMatch.end;
            }
            else if (matchObj.set) {
                state.contextStack.pop();
                const context = state.pushContext(matchObj.push);
                context.backReferences = nextMatch.captured;
                return context.handle(line, state, spans, nextMatch.end);
            }
            else {
                consumed = nextMatch.end;
            }
        }
        // Not sure about this. What about run ons?
        if (consumed < len - 1)
            spans.push({
                text: line.substr(consumed),
                scopes: state.getScopeChain()
            });
        return consumed;
    }
}
exports.ContextNode = ContextNode;
class State {
    constructor(program) {
        this.contextStack = [];
        this._program = program;
        this.contextStack.push(program.getMainContext());
    }
    getScopeChain() {
        const arr = this.contextStack.map(context => context.get("meta_scope")).filter(i => i);
        arr.unshift(this._program.scope);
        return arr;
    }
    pushContext(name) {
        const context = this._program.getNode("contexts " + name);
        if (!context)
            throw new Error(`${name} context not found`);
        this.contextStack.push(context);
        return context;
    }
    get currentContext() {
        return this.contextStack[this.contextStack.length - 1];
    }
}
class Line {
    constructor(line) {
        this._string = line;
    }
    parse(state) {
        const spans = [];
        state.currentContext.handle(this._string, state, spans);
        return `line\n` + spans.map(span => ` span ${span.text}\n  scopes ${span.scopes.join(" ")}`).join("\n");
    }
}
class ProgramNode extends jtree.program {
    constructor() {
        super(...arguments);
        this.hidden = false;
        this.first_line_match = "";
        this.variables = {};
        this.contexts = {
            prototype: new ContextNode(),
            main: new ContextNode()
        };
    }
    toYAML() {
        return `%YAML 1.2
---
name: ${this.name}
file_extensions: [${this.file_extensions.join(",")}]
scope: ${this.scope}

contexts:`;
    }
    get name() {
        return this.get("name");
    }
    getMainContext() {
        const main = this.getNode("contexts main");
        if (!main || !(main instanceof ContextNode))
            throw new Error("No main context, or main ContextNode found.");
        return main;
    }
    get file_extensions() {
        return this.getNode("file_extensions").getWordsFrom(1);
    }
    get scope() {
        return this.get("global_scope");
    }
    toHtml(content) {
        const tree = new jtree.TreeNode(content);
        const scopesToStyle = scopes => {
            return scopes
                .split(" ")
                .map(scope => {
                const color = scope.match(/\._([^.]+)/);
                if (color)
                    return `color: ${color[1]};`;
                return "";
            })
                .filter(i => i)
                .join("");
        };
        return ("<div style='font-family: monaco; white-space: pre;'>" +
            tree
                .map(line => line
                .map(span => `<span title=" ${span.get("scopes")}" style='${scopesToStyle(span.get("scopes"))}'>${lodash.escape(span.getContent())}</span>`)
                .join(""))
                .join("<br>") +
            "</div>");
    }
    /*
  line
   span 1
    scopes source.dag storage.type.string._blue.digit
   span
    scopes source.dag
   span +
    scopes source.dag variable.parameter.function._orange.plus
   span
    scopes source.dag
   span 1
    scopes source.dag storage.type.string._blue.digit
   span ;
    scopes source.dag entity.name.tag._red.semicolon
  line
  
    */
    execute(content) {
        const state = new State(this);
        return content
            .split("\n")
            .map(line => new Line(line).parse(state))
            .join("\n");
        //console.log(new jtree.TreeNode(res).toString())
        // return res
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
exports.ProgramNode = ProgramNode;
const Colors = {
    blue: "storage.type.string._blue",
    red: "entity.name.tag._red",
    yellow: "string.unquoted.plain.out._yellow",
    gray_italics: "comment.block.documentation._gray_italics",
    green: "entity.name.function._green",
    pink_back: "invalid.illegal.error._pink_back",
    white: "source._white",
    orange: "variable.parameter.function._orange",
    purple: "constant.numeric.yaml-version._purple"
};
exports.Colors = Colors;
