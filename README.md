# AI Recipe Planner 🥗

A smart, AI-powered meal planner that turns your pantry or vegetable box deliveries into recipes and a shopping list.

Try it out on github pages: [AI Recipe Planner](https://drdonik.github.io/ai-recipe-planner/)

## Features

- **Two Routes to a Meal Plan**:
  - **Copy & Paste** (default): No API key storage required. Copy the generated prompt to any AI service and paste the response back. More secure and private.
  - **Generate directly**: Direct integration with the Google Gemini API (stores the key in localStorage with a security warning).
- **What a Stored Key Also Unlocks**, whichever route is chosen: pantry ingredients from a photo, storage tips, recipe images, replacing a single recipe, and a chat about the recipe you are cooking. Each is offered only with a key present, and the two that expose something new — sending a photo, and paying per image — ask once before the first use.
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

### Generating Directly With a Gemini API Key (Optional)

1.  Switch on **Generate directly** in the header and enter your Gemini API key. The key stays useful if you switch the meal plan back to Copy & Paste: it keeps powering photo recognition, storage tips, images, replacement and chat.
2.  Add ingredients you have in your pantry.
3.  Add spices and staples to your spice rack.
4.  Select your diet, number of people, and number of meals.
5.  Click **Generate** to get your personalized menu directly!

## License

DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE (WTFPL)
