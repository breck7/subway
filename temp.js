  _parseString(str) {
    if (!str) return this
    const lines = str.split(this.getYIRegex())
    const parentStack = []
    let currentIndentCount = -1
    let lastNode = this
    lines.forEach(line => {
      const indentCount = this._getIndentCount(line)
      if (indentCount > currentIndentCount) {
        currentIndentCount++
        parentStack.push(lastNode)
      } else if (indentCount < currentIndentCount) {
        // pop things off stack
        while (indentCount < currentIndentCount) {
          parentStack.pop()
          currentIndentCount--
        }
      }
      const lineContent = line.substr(currentIndentCount)
      const parent = parentStack[parentStack.length - 1]
      const parserClass = parent.parseNodeType(lineContent)
      lastNode = new parserClass(undefined, lineContent, parent)
      parent._getChildrenArray().push(lastNode)
    })
    return this
  }

    _parseString(str) {
    if (!str) return this
      // push pop set
    const lines = str.split(this.getYIRegex())
    let contextMatches= []
    lines.forEach(line => {
      contextMatches.forEach(reg => {
        if (line.match(reg))
          line.apply(reg.scopecolor)
        else
          return true
      })
    })
  }

