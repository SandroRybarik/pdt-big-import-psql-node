


const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { Client , Pool } = require('pg')

/**
 * Find or create naive implementation
 * @param {*} dbClient - pg client
 * @param {Object} queriesObject - object
 */
async function findOrCreate(dbClient, { findQuery, findValues, createQuery, createValues }) {
  const findQueryResult = await dbClient.query(findQuery, findValues)
  if (findQueryResult.rowCount === 0) {
    // WE NEED TO CREATE
    return await dbClient.query(createQuery, createValues)
  } else {
    // WE FOUND IT
    return findQueryResult
  }
}


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
      curr + 1
    ]
  }

  let flattenValues = []
  let flattenValuesIndices = []
  for (const valuesArray of values) {
    flattenValues = [flattenValues, ...valuesArray]

    const [ stringIndices, index ] = generateIndices($, numberOfValues)
    $ = index
    flattenValuesIndices = [flattenValuesIndices, stringIndices]
  }
  
  console.log(`INSERT INTO table(${colNames.join(",")}) ${flattenValuesIndices.join(",")}`)
  console.log(flattenValues)
  // dbClient.query(`INSERT INTO table(${colNames.join(",")}) ${flattenValuesIndices.join(",")}`, flattenValues)
}


// from: https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
function processLineByLine(fileName, client) {
  return new Promise(async (resolve, _) => {
    const fileStream =  fs.createReadStream(fileName);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let numOfRecords = 0;

    for await (const line of rl) {
      const to = JSON.parse(line) // twitter object
      const hashtags = to.entities.hashtags
      try {

        // COUNTRY
        let country_id = null
        if (to.place) {
          const countryResult = await findOrCreate(client, {
            findQuery: `SELECT id, code, name FROM countries WHERE code = $1`,
            findValues: [ to.place.country_code ],
            createQuery: `INSERT INTO countries(code, name) VALUES($1, $2) ON CONFLICT DO NOTHING`,
            createValues: [ to.place.country_code, to.place.country ]
          })
          
          country_id = countryResult.id
        }

        // TWEETS
        // example: ST_GeomFromText('POINT(-71.060316 48.432044)', 4326)
        // @TODO: retweeted status treba vyrobit ako komplet novu entitu a potom naviazat

        if (to.coordinates) {
          // console.log((to.coordinates ? `ST_GeomFromText('POINT(${to.coordinates.coordinates[0]} ${to.coordinates.coordinates[1]})', 4326)` : null))
        
          const tweetsResult =
            await client.query("INSERT INTO tweets(id, content, location, retweet_count, favorite_count, happened_at, author_id, country_id, parent_id) VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3,$4),4326), $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING", [
              to.id_str, to.full_text, to.coordinates.coordinates[0],to.coordinates.coordinates[1], to.retweet_count, to.favorite_count, to.created_at, to.user.id, country_id, (to.retweeted_status ? to.retweeted_status.id_str : null)
            ])
            
          // const tweetsResult =
          //   await client.query("INSERT INTO tweets(id, content, location, retweet_count, favorite_count, happened_at, author_id, country_id, parent_id) VALUES ($1, $2, ST_GeomFromText('POINT($3 $4)', 4326), $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING", [
          //     to.id_str, to.full_text, to.coordinates.coordinates[0], to.coordinates.coordinates[1], to.retweet_count, to.favorite_count, to.created_at, to.user.id, country_id, (to.retweeted_status ? to.retweeted_status.id_str : null)
          //   ])
        } else {
          const tweetsResult =
            await client.query(`INSERT INTO tweets(id, content, location, retweet_count, favorite_count, happened_at, author_id, country_id, parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`, [
              to.id_str, to.full_text, null, to.retweet_count, to.favorite_count, to.created_at, to.user.id, country_id, to.retweeted_status ? to.retweeted_status.id_str : null
            ])
        }

        // HASHTAGS
        for (const hashtag of hashtags) {
          const hashtagValue = hashtag.text
          const hashtagSelectResult
            = await client.query(`SELECT id FROM hashtags WHERE value = $1`, [hashtagValue])
          if (hashtagSelectResult.rowCount === 0) {
            // Insert
            await client.query(`INSERT INTO hashtags(value) VALUES($1)`, [hashtagValue])
          } else {
            // It exists
            const existingHashtagId = hashtagSelectResult.rows[0].id
            const insertTweetHashTag =
              await client.query(`INSERT INTO tweet_hashtags(hashtag_id, tweet_id) VALUES($1, $2) ON CONFLICT DO NOTHING`,
                [existingHashtagId, to.id_str])
          }
        }

        // ACCOUNTS
        const accountsResult = await findOrCreate(client, {
          findQuery: `SELECT * FROM accounts WHERE id = $1`,
          findValues: [ to.user.id ],
          createQuery: `INSERT INTO accounts(id, screen_name, name, description, followers_count, friends_count, statuses_count) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
          createValues: [ to.user.id, to.user.screen_name, to.user.name, to.user.description, to.user.followers_count, to.user.friends_count, to.user.statuses_count ]
        })


        // TWEET MENTIONS
        for (const userMention of to.entities.user_mentions) {
          const userId = userMention.id
          
          // @TODO osefovat tento case, ze user este neni uplne vytvoreny (podla mna bude stacit disable constrainy)

          const tweetMentionsResult = 
            await client.query(`INSERT INTO tweet_mentions(account_id, tweet_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,[
              userId, to.str_id
            ])
        }

        // const tweetMentionsResult = await findOrCreate(client, {
        //   findQuery: `SELECT id FROM tweet`
        // })
        numOfRecords += 1
      } catch (e) {
        console.log(e)
        continue;
      }
    }

    resolve(numOfRecords)
  })
}

async function main() {
  const datasetFileNames1 = await fs.promises.readdir("./PDT_dataset1")
  const datasetFileNames2 = await fs.promises.readdir("./PDT_dataset2")
  const datasetFileNames3 = await fs.promises.readdir("./PDT_dataset3")
  // Filter hidden files aka .DS_Store
  const datasetFileNames = [
    ...datasetFileNames1.filter(f => f[0] !== '.').map(f => path.join("./PDT_dataset1", f)),
    ...datasetFileNames2.filter(f => f[0] !== '.').map(f => path.join("./PDT_dataset2", f)),
    ...datasetFileNames3.filter(f => f[0] !== '.').map(f => path.join("./PDT_dataset3", f))
  ]

  const fileNames = datasetFileNames

  const numFileNames = fileNames.length
  let currentFile = 1
  
  const client = new Client({
    database: 'pdt'
  })

  await client.connect()
  client.query()
  console.log(`Dataset import started - ${new Date().toString()}`)

  for (const fileName of fileNames) {
    console.log(`Processing file [ ${currentFile}/${numFileNames} ]: ${fileName}`)
    const numOfRecords = await processLineByLine(fileName, client)
    console.log(`-- Processed ${numOfRecords} records, ${new Date().toString()}`)
    currentFile += 1
  }

  await client.end()
}

main()
