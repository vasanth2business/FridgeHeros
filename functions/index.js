/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

setGlobalOptions({ maxInstances: 10 });

// Define the Gemini API key secret
const geminiApiKey = defineSecret("gemini.apikey");

/**
 * Cloud Function: generateRecipe
 * Calls the Gemini API to generate a recipe based on ingredients
 * The API key is stored securely and never exposed to the client
 */
exports.generateRecipe = onRequest(
  { secrets: [geminiApiKey] },
  async (request, response) => {
    // Enable CORS for your hosting domain
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
      response.status(200).send("");
      return;
    }

    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { ingredients, cuisine, model } = request.body;

      if (!ingredients || !Array.isArray(ingredients) || ingredients.length < 3) {
        response.status(400).json({
          error: "Please provide at least 3 ingredients",
        });
        return;
      }

      const apiKey = geminiApiKey.value();
      const ingredientsList = ingredients.join(", ");
      const cuisineContext = cuisine ? `The recipe should be ${cuisine}.` : "";

      const prompt = `You are a chef creating a quick 3-step recipe.
Ingredients available: ${ingredientsList}
${cuisineContext}

Generate a creative, delicious recipe using these ingredients. Format your response as JSON with this exact structure:
{
  "title": "Recipe Name",
  "tags": ["tag1", "tag2", "tag3"],
  "step1": "First step instructions",
  "step2": "Second step instructions",
  "step3": "Third step instructions"
}

Only return the JSON object, nothing else.`;

      const response_obj = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
          model +
          ":generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response_obj.json();

      if (!response_obj.ok) {
        logger.error("Gemini API Error:", data);
        response.status(500).json({
          error: "Failed to generate recipe",
          details: data.error?.message || "Unknown error",
        });
        return;
      }

      const recipeText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const recipe = JSON.parse(recipeText);

      response.status(200).json(recipe);
    } catch (error) {
      logger.error("Error generating recipe:", error);
      response.status(500).json({
        error: "Failed to generate recipe",
        details: error.message,
      });
    }
  }
);
