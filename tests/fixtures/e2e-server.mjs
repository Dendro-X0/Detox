import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.E2E_PORT ?? 4173);

const server = http.createServer((request, response) => {
    const pathname = request.url?.split('?')[0] ?? '/';
    const relativePath = pathname === '/' ? 'blank.html' : pathname.replace(/^\//, '');
    const filePath = path.resolve(fixtureDir, relativePath);

    if (!filePath.startsWith(fixtureDir)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            response.writeHead(404);
            response.end('Not found');
            return;
        }

        const extension = path.extname(filePath);
        const contentType = extension === '.html' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(data);
    });
});

server.listen(port, '127.0.0.1', () => {
    console.log(`SignalLens E2E fixture server at http://127.0.0.1:${port}`);
});
