@echo off
cd apps\api
npx nodemon --exec "npx ts-node --transpile-only" src/index.ts 