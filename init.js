const fs = require('fs')
const { Client } = require('pg')
const { exit } = require('process')

if (process.argv.length != 3) {
  console.log(`Usage: node init.js <db_name>`)
  exit(-1)
}

async function main() {
  let client = null
  try {
    client = new Client({
      database: process.argv[2]
    })
    await client.connect()

    const initSQL = await fs.promises.readFile('./init.sql', 'utf-8')

    await client.query(initSQL)

    console.log("Import - done")
  } catch(e) {
    console.log(e)
  }

  if (client) {
    client.end()
  }
}

main()
