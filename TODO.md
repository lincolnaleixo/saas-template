- criar e testar o new-feature
- criar e testar o bugfix (Bugfix talvez pensaria hard? Talvez até definir qual modelo usar dependendo?)
- criar e testar o improvement feature
- criar e testar o new job

- ok, about backup /update of the schema. what would be the best way to have a system/library that everytime we do some changes on dev, it would be a no problem for production? my fear is breaking the data obvioslu but differnet tha mongodb that there's no schema , postgress needs to update the schema or the updated code will break on production. what would be the best, clean and simple approach to fix this? i would like to have . what would be the best way, have on git.ts to do the backup and then on prod.sh import the backup? please think hard on this and let me know the best solution and then update on the most related guidelines. and also update the script of your choosing

