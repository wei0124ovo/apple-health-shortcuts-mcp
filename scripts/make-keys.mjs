import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const uploadKey = randomBytes(32).toString('hex');
const mcpKey = randomBytes(32).toString('hex');
const output = [
    '# Keep this file private. It is ignored by Git.',
    `UPLOAD_KEY=${uploadKey}`,
    `MCP_ACCESS_KEY=${mcpKey}`,
    '',
].join('\n');

writeFileSync('my-keys.local', output, { encoding: 'utf8', mode: 0o600 });
console.log('Created my-keys.local. Do not share this file.');
