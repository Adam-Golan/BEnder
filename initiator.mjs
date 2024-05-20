import { rmSync } from 'fs';

// Remove git main directory.
try {
    rmSync('.git', { recursive: true, force: true });
} catch (err) {
    console.error(err);
}

// Remove this file.
rmSync('./initiator.mjs');