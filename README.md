# AI Recipe Planner 🥗

![Tests](https://github.com/DrDonik/ai-recipe-planner/workflows/Tests/badge.svg)
[![codecov](https://codecov.io/gh/DrDonik/ai-recipe-planner/branch/main/graph/badge.svg)](https://codecov.io/gh/DrDonik/ai-recipe-planner)

A smart, AI-powered meal planner that turns your pantry or vegetable box deliveries into recipes and a shopping list.

Try it out on github pages: [AI Recipe Planner](https://drdonik.github.io/ai-recipe-planner/)

## Features

- **Dual Operation Modes**:
  - **Copy & Paste Mode** (default): No API key storage required. Copy the generated prompt to any AI service and paste the response back. More secure and private.
  - **API Key Mode**: Direct integration with Google Gemini API for seamless recipe generation (stores key in localStorage with security warning).
- **AI-Powered Recipes**: Generates personalized recipes using Google Gemini Flash 3 Preview.
- **Minimize Food Waste**: Input vegetables, ingredients, spices and staples you have to minimize food waste.
- **Spice Rack**: Manage staples and spices that are always available in your kitchen.
- **Customizable**: Set your dietary preferences (Vegan, Vegetarian, Pescatarian, etc.), style wishes, number of people, and number of meals.
- **Smart Shopping List**: Automatically generates a shopping list for missing ingredients with persistent checkboxes.
- **Recipe Sharing**: Share your favorite recipes with others via URL (no backend required).
- **Shopping List Sharing**: Share shopping lists with separate checkbox state for each recipient.
- **Interactive Recipe Features**:
  - Click ingredients to mark them as added (strikethrough)
  - Click instruction steps to highlight the current step
  - Wake Lock API support to keep your screen on while cooking
- **Multi-language Support**: Full support for English, German, Spanish, and French.
- **Responsive Design**: Glassmorphism UI that works on desktop and mobile with full dark mode support.
- **Privacy & Security**: Content Security Policy, optional Copy & Paste mode avoids credential storage entirely.

## Getting Started

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run the development server**:
    ```bash
    npm run dev
    ```

## Usage

### Copy & Paste Mode (Default - Recommended)

1.  Add ingredients you have in your pantry.
2.  Add spices and staples to your spice rack.
3.  Select your diet, number of people, and number of meals.
4.  Click **Generate Prompt** to create a prompt.
5.  Copy the prompt and paste it into any AI service (ChatGPT, Claude, Gemini, etc.).
6.  Copy the AI's response and paste it back into the app.

### API Key Mode (Optional)

1.  Enable **API Key Mode** in the header and enter your Gemini API key.
2.  Add ingredients you have in your pantry.
3.  Add spices and staples to your spice rack.
4.  Select your diet, number of people, and number of meals.
5.  Click **Generate** to get your personalized menu directly!

## Testing

This project has comprehensive test coverage. See [docs/TESTING.md](docs/TESTING.md) for:
- Running tests
- Writing new tests
- Coverage reports
- Integration tests

Run tests with:
```bash
npm test
```

## License

DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE (WTFPL)
