import { http, HttpResponse, delay } from 'msw';
import { API_CONFIG } from '../../constants';

/**
 * MSW (Mock Service Worker) handlers for mocking Gemini API responses.
 * These handlers intercept HTTP requests during tests and return controlled responses.
 */

const API_URL = `${API_CONFIG.BASE_URL}/${API_CONFIG.MODEL}:generateContent`;

/**
 * Valid mock response matching Gemini API format.
 * Contains a properly formatted recipe response.
 */
export const validRecipeResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              recipes: [
                {
                  id: 'recipe-1',
                  title: 'Chicken with Rice',
                  time: '30 mins',
                  ingredients: [
                    { item: 'Chicken', amount: '500g' },
                    { item: 'Rice', amount: '200g' },
                    { item: 'Salt', amount: '5g' },
                  ],
                  instructions: ['Cook rice', 'Cook chicken', 'Combine'],
                  usedIngredients: ['id1', 'id2'],
                  missingIngredients: [],
                  nutrition: { calories: 450, carbs: 35, fat: 18, protein: 28 },
                },
              ],
              shoppingList: [],
            }),
          },
        ],
      },
    },
  ],
};

/**
 * Response with markdown code blocks (tests cleanup logic).
 */
export const markdownWrappedResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: `\`\`\`json
{
  "recipes": [{
    "id": "recipe-1",
    "title": "Pasta",
    "time": "20 mins",
    "ingredients": [{"item": "Pasta", "amount": "250g"}],
    "instructions": ["Boil water", "Cook pasta"],
    "usedIngredients": ["id1"],
    "missingIngredients": []
  }],
  "shoppingList": []
}
\`\`\``,
          },
        ],
      },
    },
  ],
};

/**
 * MSW handlers for different test scenarios.
 */
export const handlers = [
  // Default handler - returns valid recipe response
  http.post(API_URL, () => {
    return HttpResponse.json(validRecipeResponse);
  }),
];

/**
 * Handler for malformed JSON response.
 */
export const malformedJsonHandler = http.post(API_URL, () => {
  return HttpResponse.json({
    candidates: [
      {
        content: {
          parts: [
            {
              text: 'This is not valid JSON at all!',
            },
          ],
        },
      },
    ],
  });
});

/**
 * Handler for empty response (no candidates).
 */
export const emptyResponseHandler = http.post(API_URL, () => {
  return HttpResponse.json({
    candidates: [],
  });
});

/**
 * Handler for network error.
 */
export const networkErrorHandler = http.post(API_URL, () => {
  return HttpResponse.error();
});

/**
 * Handler for API error (400 status).
 */
export const apiErrorHandler = http.post(API_URL, () => {
  return HttpResponse.json(
    {
      error: {
        message: 'Invalid API key',
        code: 400,
      },
    },
    { status: 400 }
  );
});

/**
 * Handler for timeout simulation.
 */
export const timeoutHandler = http.post(API_URL, async () => {
  // Delay longer than the timeout threshold (60 seconds + buffer)
  await delay(61000);
  return HttpResponse.json(validRecipeResponse);
});

/**
 * Handler that returns markdown-wrapped response.
 */
export const markdownHandler = http.post(API_URL, () => {
  return HttpResponse.json(markdownWrappedResponse);
});
