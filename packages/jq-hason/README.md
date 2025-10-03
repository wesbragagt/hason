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
console.log(getJQVersion()); // "1.8.1"

// Complex filtering
const users = [
  { name: "John", age: 30 },
  { name: "Jane", age: 25 },
  { name: "Bob", age: 35 }
];

const adults = await jq(users, '.[] | select(.age >= 30)');
console.log(adults);
```

## API

### `jq(input, filter)`

Process JSON data with a jq filter.

- `input`: Any JSON-serializable data
- `filter`: A jq filter string
- Returns: `Promise<any>` - The filtered result

### `getJQVersion()`

Get the version of jq being used.

- Returns: `string` - The jq version (e.g., "1.8.1")

### `getVersionedFilename(filename)`

Get the versioned filename for WASM assets.

- `filename`: Base filename
- Returns: `Promise<string>` - Versioned filename

## Browser Support

This package works in modern browsers that support WebAssembly. The WASM files are loaded dynamically.

## Node.js Support

Node.js support is planned for future releases. Currently optimized for browser environments.

## License

MIT

## Credits

This package is built on top of the [jq](https://github.com/jqlang/jq) project and compiled to WebAssembly using Emscripten.