CREATE EXTENSION postgis; 

CREATE TABLE countries (
    id   SERIAL PRIMARY KEY,
    code varchar(2),
    name varchar(200)
);

CREATE TABLE hashtags (
    id SERIAL PRIMARY KEY,
    value text
);

CREATE TABLE accounts (
    id BIGINT PRIMARY KEY,
    screen_name varchar(200),
    name varchar(200),
    description text,
    followers_count integer,
    friends_count integer,
    statuses_count integer
);

CREATE TABLE tweets (
  id varchar(20) PRIMARY KEY,
  content text,
  location geometry(point, 4326),
  retweet_count integer,
  favorite_count integer,
  happened_at timestamptz,
  author_id bigint, -- FK
  country_id integer, -- FK
  parent_id varchar(20) -- FK self
  -- CONSTRAINT tweets_tweets_id FOREIGN KEY (parent_id) REFERENCES tweets(id),
  -- CONSTRAINT tweets_authors_id FOREIGN KEY (author_id) REFERENCES accounts(id),
  -- CONSTRAINT tweets_countries_id FOREIGN KEY (country_id) REFERENCES countries(id)
);

CREATE TABLE tweet_hashtags (
    id SERIAL,
    hashtag_id integer,
    tweet_id varchar(20),

    CONSTRAINT tweet_hashtags_unique_tweet_id_hashtag_id UNIQUE(tweet_id, hashtag_id)
    -- CONSTRAINT tweet_hashtags_hashtag_id FOREIGN KEY (hashtag_id) REFERENCES hashtags(id),
    -- CONSTRAINT tweet_hashtags_tweet_id FOREIGN KEY (tweet_id) REFERENCES tweets(id)
);

CREATE TABLE tweet_mentions (
    id SERIAL,
    account_id bigint,
    tweet_id varchar(20),

    CONSTRAINT tweet_mentions_unique_tweet_id_account_id UNIQUE(tweet_id, account_id)
    -- CONSTRAINT tweet_mentions_account_id FOREIGN KEY (account_id) REFERENCES accounts(id),
    -- CONSTRAINT tweet_mentions_tweet_id FOREIGN KEY (tweet_id) REFERENCES tweets(id),
);