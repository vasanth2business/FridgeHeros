// Netlify Cloud Function - Secure API Call Handler
// This function runs on Netlify servers
// API key is stored in environment variables (NOT exposed to browser)

exports.handler = async (event) => {
  // CORS headers - allow requests from anywhere
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Handle preflight requests
  console.log("Netlify function invoked; method=", event.httpMethod);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  // Only accept POST requests (return method for easier debugging)
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed", method: event.httpMethod })
    };
  }

  try {
    // Parse request from browser
    const { ingredients, cuisine, model } = JSON.parse(event.body);

    // Validate input
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length < 3) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Please provide at least 3 ingredients" })
      };
    }

    // ✅ GET API KEY FROM ENVIRONMENT VARIABLE (Secure!)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API key not configured on server" })
      };
    }

    // Build ingredient and cuisine text
    const ingredientsList = ingredients.join(", ");
    const cuisineContext = cuisine ? `The recipe should be ${cuisine} cuisine.` : "";

    // Create prompt for Gemini
    const prompt = `You are a creative Michelin-star chef specializing in quick meals from leftovers.
Create a DIFFERENT, creative 3-step recipe using these ingredients: ${ingredientsList}.
${cuisineContext}

Rules:
1. Recipe must have a creative, catchy name.
2. Recipe must be exactly 3 steps (Prep, Cook, Serve).
3. Output ONLY JSON format, nothing else.

Return this exact JSON structure:
{
  "recipeName": "Creative Recipe Name",
  "step1": "Preparation instructions",
  "step2": "Cooking instructions",
  "step3": "Serving instructions"
}`;

    // Call Gemini API (with secure API key from server)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey  // ✅ API key sent from server, not browser
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    // Handle Gemini response
    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", geminiData);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to generate recipe",
          details: geminiData.error?.message || "Unknown error"
        })
      };
    }

    // Extract recipe text from Gemini response
    let recipeText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!recipeText) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Empty response from Gemini" })
      };
    }

    // Clean common wrappers (markdown code fences) and try to extract JSON substring
    try {
      // Remove fenced code blocks like ```json or ```
      recipeText = recipeText.replace(/```(?:json)?\s*/gi, '');
      recipeText = recipeText.replace(/\s*```\s*$/gi, '');
      recipeText = recipeText.trim();

      // If the model returned extra text, extract the first JSON object between the first '{' and the last '}'
      const firstBrace = recipeText.indexOf('{');
      const lastBrace = recipeText.lastIndexOf('}');
      const jsonCandidate = (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace)
        ? recipeText.slice(firstBrace, lastBrace + 1)
        : recipeText;

      const recipe = JSON.parse(jsonCandidate);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(recipe)
      };

    } catch (parseError) {
      console.error('Failed to parse recipe JSON:', parseError, 'recipeText:', recipeText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to parse recipe JSON', details: parseError.message })
      };
    }

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Error processing request",
        message: error.message
      })
    };
  }
};
