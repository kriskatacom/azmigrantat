Upload the files
scp -r "D:\Documents\Apps\realtime-server\src" almalinux@IP_НА_VPS:/home/almalinux/apps/azmigrantat-realtime/

On the server:
npm run Install && npm run build

Restart the server
pm2 restart azmigrantat-realtime

Server logs
pm2 logs azmigrantat-realtime
