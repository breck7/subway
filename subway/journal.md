/\*
%YAML 1.2

---

name: C
file_extensions: [c, h]
scope: source.c

contexts:
main: - match: \b(if|else|for|while)\b
scope: keyword.control.c - match: '"'
push: string

string: - meta_scope: string.quoted.double.c - match: \\.
scope: constant.character.escape.c - match: '"'
pop: true

version 2.1
name NAME
file*extensions A B ...
scope GLOBAL_SCOPE
first_line_match <?php
hidden false
variables
ident '[A-Za-z*][A-Za-z_0-9]_'
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
for*stmt
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
match: \b[A-Za-z*][A-Za-z_0-9]_\b
pop true

\*/

// test()

// \_parseString(str) {
// if (!str) return this
// // push pop set
// const lines = str.split(this.getYIRegex())
// let contextMatches= []
// lines.forEach(line => {
// contextMatches.forEach(reg => {
// if (line.match(reg))
// line.apply(reg.scopecolor)
// else
// return true
// })
// })
// }
