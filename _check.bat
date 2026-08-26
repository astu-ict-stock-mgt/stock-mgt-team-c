@echo off
cd /d D:\ALL\projects\ICT_CENTER_INTERN\Stock-MS\stock-mgt-team-c
echo === NODE === >> _check_out.txt
node -v >> _check_out.txt 2>&1
echo === ROOT DEPS === >> _check_out.txt
if exist node_modules (echo ROOT_DEPS_OK >> _check_out.txt) else (echo ROOT_DEPS_MISSING >> _check_out.txt)
echo === BACKEND DEPS === >> _check_out.txt
if exist backend\node_modules (echo BE_DEPS_OK >> _check_out.txt) else (echo BE_DEPS_MISSING >> _check_out.txt)
echo === PG CONNECT (node) === >> _check_out.txt
cd backend
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.$queryRaw`SELECT 1`.then(async()=>{console.log('PG_CONNECT_OK');await p.$disconnect();process.exit(0)}).catch(async e=>{console.log('PG_CONNECT_FAIL:',e.message.split('\n')[0]);await p.$disconnect();process.exit(1)})" >> ..\_check_out.txt 2>&1
echo === PRISMA TABLES === >> ..\_check_out.txt
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`.then(async r=>{console.log(r.map(x=>x.tablename).join(', '));await p.$disconnect();process.exit(0)}).catch(async e=>{console.log('FAIL:',e.message.split('\n')[0]);await p.$disconnect();process.exit(1)})" >> ..\_check_out.txt 2>&1
echo === DONE === >> ..\_check_out.txt
