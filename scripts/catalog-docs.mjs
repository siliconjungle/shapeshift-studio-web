import fs from 'node:fs/promises';
import {catalogueMarkdown} from '@shapeshift-labs/studio-core/catalog';
await fs.writeFile(new URL('../docs/features.md',import.meta.url),catalogueMarkdown());
