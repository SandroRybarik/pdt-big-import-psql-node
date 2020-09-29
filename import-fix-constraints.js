const { Client, Pool } = require('pg')



async function main() {
  const client = new Client({
    database: 'pdt'
  })

  await client.connect()

  try {
    await client.query(`ALTER TABLE tweets ADD CONSTRAINT tweets_tweets_id FOREIGN KEY(id) REFERENCES tweets(id)`)
    await client.query(`ALTER TABLE tweets ADD CONSTRAINT tweets_authors_id FOREIGN KEY(author_id) REFERENCES accounts(id)`)
    await client.query(`ALTER TABLE tweets ADD CONSTRAINT tweets_countries_id FOREIGN KEY(country_id) REFERENCES countries(id)`)
    await client.query(`ALTER TABLE tweet_hashtags ADD CONSTRAINT tweet_hashtags_hashtag_id FOREIGN KEY(hashtag_id) REFERENCES hashtags(id)`)
    await client.query(`ALTER TABLE tweet_hashtags ADD CONSTRAINT tweet_hashtags_tweet_id FOREIGN KEY(tweet_id) REFERENCES tweets(id)`)
    await client.query(`ALTER TABLE tweet_mentions ADD CONSTRAINT tweet_mentions_account_id FOREIGN KEY(account_id) REFERENCES accounts(id)`)
    await client.query(`ALTER TABLE tweet_mentions ADD CONSTRAINT tweet_mentions_tweet_id FOREIGN KEY(tweet_id) REFERENCES tweets(id)`)
  } catch (e) {
    console.log(e)
  }

}

main()
