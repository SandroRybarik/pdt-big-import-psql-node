


const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { Client } = require('pg')
const format = require('pg-format');
const { exit } = require('process');


const BATCH_SIZE = 50000

// from: https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
async function processLineByLine(fileName, client, hashtagsState, countriesState) {
    const fileStream =  fs.createReadStream(fileName);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let numOfRecords = 0;
    
    // BATCHING
    let batchCounter = 0

    let queriesValueBatch = {
      qh_tweets: "INSERT INTO tweets(id, content, location, retweet_count, favorite_count, happened_at, author_id, country_id, parent_id) VALUES ",
      qt_tweets: "ON CONFLICT DO NOTHING",
      tweets: [],
      
      qh_accounts: "INSERT INTO accounts(id, screen_name, name, description, followers_count, friends_count, statuses_count) VALUES ",
      qt_accounts: "ON CONFLICT DO NOTHING",
      accounts: [],
      
      qh_tweet_mentions: "INSERT INTO tweet_mentions(account_id, tweet_id) VALUES ",
      qt_tweet_mentions: "ON CONFLICT DO NOTHING",
      tweet_mentions: [],
      
      qh_tweet_hashtags: "INSERT INTO tweet_hashtags(hashtag_id, tweet_id) VALUES ",
      qt_tweet_hashtags: "ON CONFLICT DO NOTHING",
      tweet_hashtags: [],
      
      qh_hashtags: "INSERT INTO hashtags(id, value) VALUES ",
      qt_hashtags: "ON CONFLICT DO NOTHING",
      hashtags: [],
      
      qh_countries: "INSERT INTO countries(code, name) VALUES ",
      qt_countries: "ON CONFLICT DO NOTHING",
      countries: []
    }

    // depends on countriesMap, hashtagsMap
    // tweet_hashtags, hashtags, countries
    try {
      // START OF SINGLE BATCH
      for await (const line of rl) {
        const to = JSON.parse(line) // twitter object
        const hashtags = to.entities.hashtags
          
          let country_id = null
          if (to.place) {
            if (!countriesState.data[to.place.country_code]) {
              const ci = countriesState.index
              country_id = ci // ! FOR TWEET INSERT BELOW !
              countriesState.data[to.place.country_code] = { id: ci, country: to.place.country }
              countriesState.index = ci + 1
            
              queriesValueBatch.countries.push(
                format('(%1$L, %2$L)', to.place.country_code, to.place.country)
              )
            }
          }


          if (to.coordinates) {
            queriesValueBatch.tweets.push(
              format('(%1$L, %2$L, ST_SetSRID(ST_MakePoint(%3$L,%4$L),4326), %5$L, %6$L, %7$L, %8$L, %9$L, %10$L)',
                to.id_str, to.full_text, to.coordinates.coordinates[0], to.coordinates.coordinates[1], to.retweet_count, to.favorite_count, to.created_at, to.user.id, country_id, (to.retweeted_status ? to.retweeted_status.id_str : null)
              )
            )
          }
          else {
            queriesValueBatch.tweets.push(
              format('(%1$L, %2$L, %3$L, %4$L, %5$L, %6$L, %7$L, %8$L, %9$L)',
                to.id_str, to.full_text, null, to.retweet_count, to.favorite_count, to.created_at, to.user.id, country_id, to.retweeted_status ? to.retweeted_status.id_str : null
              )
            )
          }

          // HASHTAGS
          for (const hashtag of hashtags) {
            const hashtagValue = hashtag.text

          if (!hashtagsState.data[hashtagValue]) {
            const hi = hashtagsState.index
              hashtagsState.data[hashtagValue] = hi
              hashtagsState.index = hi + 1

              queriesValueBatch.hashtags.push(
                format('(%1$L, %2$L)', hi, hashtagValue)
              )

              queriesValueBatch.tweet_hashtags.push(
                format('(%1$L, %2$L)', hi, to.id_str)
              )
            } else {
            const existingHashtagId = hashtagsState.data[hashtagValue]
            queriesValueBatch.tweet_hashtags.push(
              format('(%1$L, %2$L)', existingHashtagId, to.id_str)
            )
            }
          }

          queriesValueBatch.accounts.push(
            format('(%1$L, %2$L, %3$L, %4$L, %5$L, %6$L, %7$L)',
              to.user.id, to.user.screen_name, to.user.name, to.user.description, to.user.followers_count, to.user.friends_count, to.user.statuses_count
            )
          )


          // TWEET MENTIONS
          for (const userMention of to.entities.user_mentions) {
            const userId = userMention.id
            
            queriesValueBatch.accounts.push(
              format('(%1$L, %2$L, %3$L, %4$L, %5$L, %6$L, %7$L)',
                userMention.id, userMention.screen_name, userMention.name, null, null, null, null
              )
            )

            queriesValueBatch.tweet_mentions.push(
              format('(%1$L, %2$L)', userId, to.id_str)
            )
          }


          numOfRecords += 1
          batchCounter += 1

          if (batchCounter >= (BATCH_SIZE - 1)) {
            // 1. EXECUTE BATCH
            const { 
              qh_tweets,
              qt_tweets,
              tweets,
              qh_accounts,
              qt_accounts,
              accounts,
              qh_tweet_mentions,
              qt_tweet_mentions,
              tweet_mentions,
              qh_tweet_hashtags,
              qt_tweet_hashtags,
              tweet_hashtags,
              qh_hashtags,
              qt_hashtags,
              hashtags,
              qh_countries,
              qt_countries,
              countries 
            } = queriesValueBatch
            
            if (tweets.length > 0) {
              const q_tweets =  qh_tweets + " " +  tweets.join(", ") +  " " + qt_tweets
              // console.log(q_tweets) 
              await client.query(q_tweets)
            }
            if (accounts.length > 0) {
              const q_accounts = qh_accounts + " " + accounts.join(", ") + " " + qt_accounts
              // console.log(q_accounts) 
              await client.query(q_accounts)
            }
            if (tweet_mentions.length > 0) {
              const q_tweet_mentions = qh_tweet_mentions + " " + tweet_mentions.join(", ") + " " + qt_tweet_mentions
              // console.log(q_tweet_mentions) 
              await client.query(q_tweet_mentions)
            }
            if (tweet_hashtags.length > 0) {
              const q_tweet_hashtags = qh_tweet_hashtags + " " + tweet_hashtags.join(", ") + " " + qt_tweet_hashtags
              // console.log(q_tweet_hashtags) 
              await client.query(q_tweet_hashtags)
            }
            if (hashtags.length > 0) {
              const q_hashtags = qh_hashtags + " " + hashtags.join(", ") + " " + qt_hashtags
              // console.log(q_hashtags) 
              await client.query(q_hashtags)
            }
            if (countries.length > 0) {
              const q_countries = qh_countries + " " + countries.join(", ") + " " + qt_countries
              // console.log(q_countries) 
              await client.query(q_countries)
            }

            // 2. CLEAN BATCH Queries & COUNTER
            batchCounter = 0
            
            queriesValueBatch.tweets = []
            queriesValueBatch.accounts = []
            queriesValueBatch.tweet_mentions = []
            queriesValueBatch.tweet_hashtags = []
            queriesValueBatch.hashtags = []
            queriesValueBatch.countries = []
          }
      }

      // PROCESS LAST BATCH
      // COPY CAT laziness, sorry
      const {
        qh_tweets,
        qt_tweets,
        tweets,
        qh_accounts,
        qt_accounts,
        accounts,
        qh_tweet_mentions,
        qt_tweet_mentions,
        tweet_mentions,
        qh_tweet_hashtags,
        qt_tweet_hashtags,
        tweet_hashtags,
        qh_hashtags,
        qt_hashtags,
        hashtags,
        qh_countries,
        qt_countries,
        countries
      } = queriesValueBatch

      if (tweets.length > 0) {
        const q_tweets = qh_tweets + " " + tweets.join(", ") + " " + qt_tweets
        // console.log(q_tweets) 
        await client.query(q_tweets)
      }
      if (accounts.length > 0) {
        const q_accounts = qh_accounts + " " + accounts.join(", ") + " " + qt_accounts
        // console.log(q_accounts) 
        await client.query(q_accounts)
      }
      if (tweet_mentions.length > 0) {
        const q_tweet_mentions = qh_tweet_mentions + " " + tweet_mentions.join(", ") + " " + qt_tweet_mentions
        // console.log(q_tweet_mentions) 
        await client.query(q_tweet_mentions)
      }
      if (tweet_hashtags.length > 0) {
        const q_tweet_hashtags = qh_tweet_hashtags + " " + tweet_hashtags.join(", ") + " " + qt_tweet_hashtags
        // console.log(q_tweet_hashtags) 
        await client.query(q_tweet_hashtags)
      }
      if (hashtags.length > 0) {
        const q_hashtags = qh_hashtags + " " + hashtags.join(", ") + " " + qt_hashtags
        // console.log(q_hashtags) 
        await client.query(q_hashtags)
      }
      if (countries.length > 0) {
        const q_countries = qh_countries + " " + countries.join(", ") + " " + qt_countries
        // console.log(q_countries) 
        await client.query(q_countries)
      }

      // 2. CLEAN BATCH Queries & COUNTER
      batchCounter = 0

      queriesValueBatch.tweets = []
      queriesValueBatch.accounts = []
      queriesValueBatch.tweet_mentions = []
      queriesValueBatch.tweet_hashtags = []
      queriesValueBatch.hashtags = []
      queriesValueBatch.countries = []

    }
    catch (e) {
      console.log(e)
    }

    await fs.promises.writeFile('dump-hashtags-map.json', JSON.stringify(hashtagsState), 'utf-8')
    await fs.promises.writeFile('dump-countries-map.json', JSON.stringify(countriesState), 'utf-8')

    return numOfRecords
}

async function main() {
  if (process.argv.length != 4) {
    console.log(`Invalid cli args.\nUsage: node import.js <db_name> <dataset_dir>`)
    exit(-1)
  }

  const datasetFileNamesAll = await fs.promises.readdir(process.argv[3])
  
  // Filter hidden files aka .DS_Store
  const datasetFileNames = [
    ...datasetFileNamesAll.filter(f => f[0] !== '.').map(f => path.join(process.argv[3], f))
  ]

  const fileNames = datasetFileNames

  const numFileNames = fileNames.length
  let currentFile = 1 // fancy counter
  
  const client = new Client({
    database: process.argv[2]
  })

  await client.connect()
  
  console.log(`Dataset import started - ${new Date().toString()}`)


  // To avoid subselects, store in memory
  let hashtagsState = {
    index: 1,
    data: {}
  } 
  let countriesState = {
    index: 1,
    data: {}
  }
  
  for (const fileName of fileNames) {
    console.log(`Processing file [ ${currentFile}/${numFileNames} ]: ${fileName}`)
    // process file by file, line by line
    const numOfRecords = await processLineByLine(fileName, client, hashtagsState, countriesState)
    console.log(`-- Processed ${numOfRecords} records, ${new Date().toString()}`)
    currentFile += 1
  }

  await client.end()
}

main()
