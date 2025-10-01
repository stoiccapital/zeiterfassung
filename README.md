# Zeiterfassung

A simple time management application built with TypeScript and vanilla CSS.

## Features

- Clean, modern interface
- Responsive design
- TypeScript for type safety
- Local development ready

## Getting Started

### Prerequisites

- Node.js (for TypeScript compiler)
- Modern web browser

### Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install TypeScript (if not already installed):
   ```bash
   npm install
   ```

### Building and Running

1. **Compile TypeScript**:
   ```bash
   npm run build
   ```

2. **Start Local Server**:
   ```bash
   npm run serve
   ```

3. **Access the Application**:
   - Open `http://localhost:8000` in your browser

## Development

### Building

```bash
# Compile TypeScript
npm run build

# Watch mode for development
npm run watch
```

## File Structure

```
zeiterfassung/
├── index.html              # Main HTML file
├── styles/
│   ├── main.css           # Base styles and layout
│   └── components.css     # Component-specific styles
├── src/
│   └── app.ts             # Main application logic
├── dist/                  # Compiled JavaScript (created by tsc)
├── tsconfig.json          # TypeScript configuration
├── package.json           # NPM configuration
└── README.md              # This file
```

## License

This project is open source and available under the ISC License.
