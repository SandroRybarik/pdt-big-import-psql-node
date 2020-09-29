-- POSTGIS https://postgis.net/install/
-- CREATE EXTENSION postgis; 

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
  parent_id varchar(20), -- FK self
  CONSTRAINT tweets_tweets_id FOREIGN KEY (id) REFERENCES tweets(id),
  CONSTRAINT tweets_authors_id FOREIGN KEY (author_id) REFERENCES accounts(id),
  CONSTRAINT tweets_countries_id FOREIGN KEY (country_id) REFERENCES countries(id)
);

CREATE TABLE tweet_hashtags (
    id SERIAL,
    hashtag_id integer,
    tweet_id varchar(20),

    CONSTRAINT tweet_hashtags_hashtag_id FOREIGN KEY (hashtag_id) REFERENCES hashtags(id),
    CONSTRAINT tweet_hashtags_tweet_id FOREIGN KEY (tweet_id) REFERENCES tweets(id)
);

CREATE TABLE tweet_mentions (
    id SERIAL,
    account_id bigint,
    tweet_id varchar(20),

    CONSTRAINT tweet_mentions_account_id FOREIGN KEY (account_id) REFERENCES accounts(id),
    CONSTRAINT tweet_mentions_tweet_id FOREIGN KEY (tweet_id) REFERENCES tweets(id),
);


-- ALTER TABLE so_items DROP CONSTRAINT so_items_so_id_fkey;


alter table tweets DROP CONSTRAINT tweets_tweets_id; -- FOREIGN KEY (id) REFERENCES tweets(id),
alter table tweets DROP CONSTRAINT tweets_authors_id; -- FOREIGN KEY (author_id) REFERENCES accounts(id),
alter table tweets DROP CONSTRAINT tweets_countries_id; -- FOREIGN KEY (country_id) REFERENCES countries(id)
alter table tweet_hashtags DROP CONSTRAINT tweet_hashtags_hashtag_id; -- FOREIGN KEY (hashtag_id) REFERENCES hashtags(id),
alter table tweet_hashtags DROP CONSTRAINT tweet_hashtags_tweet_id; -- FOREIGN KEY (tweet_id) REFERENCES tweets(id)
alter table tweet_mentions DROP CONSTRAINT tweet_mentions_account_id; -- FOREIGN KEY (account_id) REFERENCES accounts(id),
alter table tweet_mentions DROP CONSTRAINT tweet_mentions_tweet_id; -- FOREIGN KEY (tweet_id) REFERENCES tweets(id),


ALTER TABLE tweets ADD CONSTRAINT tweets_tweets_id FOREIGN KEY (id) REFERENCES tweets(id); 
ALTER TABLE tweets ADD CONSTRAINT tweets_authors_id FOREIGN KEY (author_id) REFERENCES accounts(id); 
ALTER TABLE tweets ADD CONSTRAINT tweets_countries_id FOREIGN KEY (country_id) REFERENCES countries(id);
ALTER TABLE tweet_hashtags ADD CONSTRAINT tweet_hashtags_hashtag_id FOREIGN KEY (hashtag_id) REFERENCES hashtags(id); 
ALTER TABLE tweet_hashtags ADD CONSTRAINT tweet_hashtags_tweet_id FOREIGN KEY (tweet_id) REFERENCES tweets(id);
ALTER TABLE tweet_mentions ADD CONSTRAINT tweet_mentions_account_id FOREIGN KEY (account_id) REFERENCES accounts(id); 
ALTER TABLE tweet_mentions ADD CONSTRAINT tweet_mentions_tweet_id FOREIGN KEY (tweet_id) REFERENCES tweets(id); 

ALTER SEQUENCE accounts_id_seq RESTART;
ALTER SEQUENCE countries_id_seq RESTART;
ALTER SEQUENCE hashtags_id_seq RESTART;
ALTER SEQUENCE tweet_mentions_id_seq RESTART;
ALTER SEQUENCE tweet_hashtags_id_seq RESTART;

alter table accounts alter column id drop default;

drop sequence accounts_id_seq;
