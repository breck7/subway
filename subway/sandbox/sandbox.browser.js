const lodash = _

const main = grammarCode => {
  const grammarProgram = GrammarProgram.newFromCondensed(grammarCode, "/sandbox/")
  const SubwayConstructor = grammarProgram.getRootConstructor()

  const codeArea = $("#code")
  const grammarArea = $("#grammar")
  const either = $("#code,#grammar")
  const treeResults = $("#treeResults")
  const highlighted = $("#highlighted")
  either.on("keyup", function() {
    const grammar = $("#grammar").val()
    const code = $("#code").val()
    const program = new SubwayConstructor(grammar)

    const grammarErrors = program.getProgramErrors()

    const results = program.execute(code)
    treeResults.html(lodash.escape(results))
    const html = program.toHtml(results)
    highlighted.html(html)
    console.log(html)
  })

  either.on("blur", function() {
    localStorage.setItem("grammar", $("#grammar").val())
    localStorage.setItem("code", $("#code").val())
  })

  const grammar = localStorage.getItem("grammar")
  const code = localStorage.getItem("code")
  if (grammar) grammarArea.val(grammar)
  if (code) codeArea.val(code)

  grammarArea.keyup()
}

$(document).ready(function() {
  $.get("/subway.grammar", function(data) {
    main(data)
  })
})
