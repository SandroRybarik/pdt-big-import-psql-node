# DOCS
Twitter dataset importer

1. create database with name 
1. import into database _init.sql_ to create tables
1. download all datasets into _pdt\_datasets/_ forlder
1. unzip all files
1. all _.jsonl_ files should be in _pdt\_datasets_
1. OPTIONAL: change BATCH_SIZE variable in _import.js_ default = 50000
1. run `node import.js <db_name> pdt_datasets/`
1. run `node import-fix-constraints.js <db_name>`

# Notes
During runtime program makes json dumps of internal state. Its useful if there is an interrupt during import. Ask author how to use it when necessary. Feel free to delete them if there was no error. 
