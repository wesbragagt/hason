# jq-hason

WebAssembly build of jq for JavaScript environments - a lightweight JSON processor.

## Installation

```bash
npm install jq-hason
# or
pnpm add jq-hason
# or
yarn add jq-hason
```

## Usage

### Basic Usage

```javascript
import { jq } from 'jq-hason';

const data = { name: "John", age: 30, city: "New York" };
const result = await jq(data, '.name');
console.log(result); // "John"
```

### Advanced Usage

```javascript
import { jq, getJQVersion } from 'jq-hason';

// Get the jq version
console.log(await getJQVersion()); // "1.8.1"

// Complex filtering
const users = [
  { name: "John", age: 30 },
  { name: "Jane", age: 25 },
  { name: "Bob", age: 35 }
];

const adults = await jq(users, '.[] | select(.age >= 30)');
console.log(adults);
```

### TypeScript Usage

```typescript
import { jq, getJQVersion, JQModule } from 'jq-hason';

// Strongly typed data processing
interface User {
  name: string;
  age: number;
}

const users: User[] = [
  { name: "Alice", age: 28 },
  { name: "Bob", age: 32 }
];

// Filter and transform data
const names = await jq(users, '.[].name');
console.log(names); // ["Alice", "Bob"]

// Get version information
const version = await getJQVersion();
console.log(`Using jq version: ${version}`);
```

## API

### `jq(input, filter)`

Process JSON data with a jq filter.

- `input`: Any JSON-serializable data
- `filter`: A jq filter string
- Returns: `Promise<any>` - The filtered result

### `getJQVersion()`

Get the version of jq being used.

- Returns: `Promise<string>` - The jq version (e.g., "1.8.1")

### `getVersionedFilename(filename)`

Get the versioned filename for WASM assets.

- `filename`: Base filename  
- Returns: `Promise<string>` - Versioned filename

## Package Features

- **WebAssembly Performance**: Native jq performance compiled to WASM
- **Zero Dependencies**: Self-contained package with embedded WASM
- **Universal Compatibility**: Works in browsers, Node.js, and bundlers
- **TypeScript Support**: Full TypeScript definitions included
- **Version Synchronization**: Package version matches jq version (1.8.1)
- **Modern Bundling**: Built with tsdown for optimal distribution

## Browser Support

This package works in modern browsers that support WebAssembly. The WASM files are loaded dynamically.

## Node.js Support  

Node.js support is planned for future releases. Currently optimized for browser environments.

## Development

This package is part of the [hason monorepo](https://github.com/your-org/hason). To contribute:

```bash
# Clone the monorepo
git clone https://github.com/your-org/hason.git
cd hason

# Install dependencies
pnpm install

# Build the jq-hason package
pnpm --filter=jq-hason build

# Build WASM files (requires Nix)
nix run .#build-jq-wasm
```

### Build Process

The package uses a sophisticated build pipeline:

1. **jq Compilation**: jq is compiled to WebAssembly using Emscripten via Nix
2. **WASM Integration**: WASM files are embedded in the package source
3. **TypeScript Bundling**: tsdown bundles TypeScript with dual ESM/CommonJS output
4. **Version Sync**: Package version automatically matches jq version

See [docs/nix.md](../../docs/nix.md) for detailed build instructions.

## License

MIT

## Credits

This package is built on top of the [jq](https://github.com/jqlang/jq) project and compiled to WebAssembly using Emscripten.