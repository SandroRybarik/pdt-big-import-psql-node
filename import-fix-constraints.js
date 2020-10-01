const { Client } = require('pg')
const { exit } = require('process')

if (process.argv.length != 3) {
  console.log(`Usage: node import-fix-contstraints.js <db_name>`)
  exit(-1)
}

async function main() {
  let client;
  try {
    client = new Client({
      database: process.argv[2]
    })
    await client.connect()

    await client.query(`ALTER TABLE tweets ADD CONSTRAINT tweets_tweets_id FOREIGN KEY(parent_id) REFERENCES tweets(id)`)
    console.log(`ALTER TABLE tweets ADD CONSTRAINT tweets_tweets_id FOREIGN KEY(parent_id) REFERENCES tweets(id)`)
    await client.query(`ALTER TABLE tweets ADD CONSTRAINT tweets_authors_id FOREIGN KEY(author_id) REFERENCES accounts(id)`)
    console.log(`ALTER TABLE tweets ADD CONSTRAINT tweets_authors_id FOREIGN KEY(author_id) REFERENCES accounts(id)`)
    await client.query(`ALTER TABLE tweets ADD CONSTRAINT tweets_countries_id FOREIGN KEY(country_id) REFERENCES countries(id)`)
    console.log(`ALTER TABLE tweets ADD CONSTRAINT tweets_countries_id FOREIGN KEY(country_id) REFERENCES countries(id)`)
    await client.query(`ALTER TABLE tweet_hashtags ADD CONSTRAINT tweet_hashtags_hashtag_id FOREIGN KEY(hashtag_id) REFERENCES hashtags(id)`)
    console.log(`ALTER TABLE tweet_hashtags ADD CONSTRAINT tweet_hashtags_hashtag_id FOREIGN KEY(hashtag_id) REFERENCES hashtags(id)`)
    await client.query(`ALTER TABLE tweet_hashtags ADD CONSTRAINT tweet_hashtags_tweet_id FOREIGN KEY(tweet_id) REFERENCES tweets(id)`)
    console.log(`ALTER TABLE tweet_hashtags ADD CONSTRAINT tweet_hashtags_tweet_id FOREIGN KEY(tweet_id) REFERENCES tweets(id)`)
    await client.query(`ALTER TABLE tweet_mentions ADD CONSTRAINT tweet_mentions_account_id FOREIGN KEY(account_id) REFERENCES accounts(id)`)
    console.log(`ALTER TABLE tweet_mentions ADD CONSTRAINT tweet_mentions_account_id FOREIGN KEY(account_id) REFERENCES accounts(id)`)
    await client.query(`ALTER TABLE tweet_mentions ADD CONSTRAINT tweet_mentions_tweet_id FOREIGN KEY(tweet_id) REFERENCES tweets(id)`)
    console.log(`ALTER TABLE tweet_mentions ADD CONSTRAINT tweet_mentions_tweet_id FOREIGN KEY(tweet_id) REFERENCES tweets(id)`)
  } catch (e) {
    console.log(e)
  }
  if (client) {
    client.end()
  }
}

main()
