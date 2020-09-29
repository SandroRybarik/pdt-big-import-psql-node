function makeBulkInsert(_, colNames, values) { // -> String

  let $ = 1 // query reference variable
  const numberOfValues = colNames.length

  // helper magic function
  const generateIndices = (currSnapshot, numberOfValues) => {
    let indices = []
    let curr = currSnapshot
    for (let i = 0; i < numberOfValues; i += 1) {
      indices.push('$' + (curr + i))
    }

    return [
      `VALUES(${indices.join(",")})`,
      curr + numberOfValues
    ]
  }

  let flattenValues = []
  let flattenValuesIndices;
  for (const valuesArray of values) {
    flattenValues = [...flattenValues, ...valuesArray]

    const [stringIndices, index] = generateIndices($, numberOfValues)
    $ = index
    flattenValuesIndices = [flattenValuesIndices, stringIndices]
  }

  console.log(`INSERT INTO table(${colNames.join(",")}) ${flattenValuesIndices.join(",")}`)
  console.log(flattenValues)
  // dbClient.query(`INSERT INTO table(${colNames.join(",")}) ${flattenValuesIndices.join(",")}`, flattenValues)
}

makeBulkInsert(null, ['name', 'age'], [[ "Sandro", 22 ], [ "Adam", 23 ]])