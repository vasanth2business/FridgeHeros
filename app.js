document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // FRIDGE HERO CONFIGURATION
  // ==========================================
  // Gemini model to use
  const GEMINI_MODEL = "gemini-2.5-flash";
  
  // ✅ API key is now SECURE on Netlify servers!
  // Your browser calls this Netlify function, NOT Gemini directly
  const API_ENDPOINT = "/.netlify/functions/generateRecipe";
  // =========================================="

  // --- DOM Elements ---
  const errorBanner = document.getElementById('error-banner');
  const errorTitle = document.getElementById('error-title');
  const errorDesc = document.getElementById('error-desc');
  const closeErrorBtn = document.getElementById('close-error-btn');

  const ingredientsForm = document.getElementById('ingredients-form');
  const ingredientInputs = Array.from(document.querySelectorAll('.ingredient-input'));
  const clearBtns = Array.from(document.querySelectorAll('.clear-input-btn'));
  const validationStatus = document.getElementById('validation-status-text');
  const submitBtn = document.getElementById('submit-recipe-btn');

  const cuisineInput = document.getElementById('cuisine-input');
  const clearCuisineBtn = document.getElementById('clear-cuisine-btn');
  const cuisineSuggestions = document.getElementById('cuisine-suggestions');
  const recipeCuisineBadge = document.getElementById('recipe-cuisine-badge');
  const recipeCuisineText = document.getElementById('recipe-cuisine-text');

  const inputSection = document.getElementById('input-section');
  const loadingSection = document.getElementById('loading-section');
  const recipeSection = document.getElementById('recipe-section');

  const loaderTitle = document.getElementById('loader-title');
  const loaderSubtitle = document.getElementById('loader-subtitle');

  const recipeTitle = document.getElementById('recipe-title');
  const recipeTagsList = document.getElementById('recipe-tags-list');
  const recipeStep1 = document.getElementById('recipe-step-1');
  const recipeStep2 = document.getElementById('recipe-step-2');
  const recipeStep3 = document.getElementById('recipe-step-3');
  const resetBtn = document.getElementById('reset-recipe-btn');
  const regenerateBtn = document.getElementById('regenerate-recipe-btn');

  // --- Configuration ---
  let loadingIntervalId = null;
  let activeIngredients = [];
  let activeCuisine = "";

  // --- Error Handling Panel ---
  function showError(title, message) {
    errorTitle.textContent = title;
    errorDesc.textContent = message;
    errorBanner.classList.remove('hidden');
    errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorBanner.classList.add('hidden');
  }

  closeErrorBtn.addEventListener('click', hideError);

  // --- Form & Ingredients Control ---
  function getIngredients() {
    return ingredientInputs
      .map(input => input.value.trim())
      .filter(val => val.length > 0);
  }

  function updateFormValidation() {
    const filledIngredients = getIngredients();
    const count = filledIngredients.length;

    if (count >= 3) {
      submitBtn.removeAttribute('disabled');
      validationStatus.textContent = `Looks great! ${count} ingredients ready for cooking.`;
      validationStatus.classList.add('valid');
    } else {
      submitBtn.setAttribute('disabled', 'true');
      validationStatus.textContent = 'Please enter at least 3 ingredients to unlock the magic.';
      validationStatus.classList.remove('valid');
    }
  }

  // Bind input listeners for validation and clear button visibility
  ingredientInputs.forEach((input, index) => {
    const clearBtn = clearBtns[index];

    input.addEventListener('input', () => {
      // Toggle clear button
      if (input.value.length > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
      updateFormValidation();
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.classList.add('hidden');
        input.focus();
        updateFormValidation();
      });
    }
  });

  // --- Cuisine Selection & Autocomplete ---
  const CUISINES = [
    "American",
    "Arabic",
    "British",
    "Chinese",
    "French",
    "Greek",
    "Indian",
    "Italian",
    "Japanese",
    "Mexican",
    "Spanish",
    "Thai"
  ];

  let activeSuggestionIndex = -1;

  function renderSuggestions(filteredCuisines) {
    if (filteredCuisines.length === 0) {
      cuisineSuggestions.classList.add('hidden');
      return;
    }

    cuisineSuggestions.innerHTML = '';
    filteredCuisines.forEach((cuisine) => {
      const item = document.createElement('div');
      item.classList.add('suggestion-item');
      item.textContent = cuisine;
      
      item.addEventListener('click', () => {
        selectCuisine(cuisine);
      });
      
      cuisineSuggestions.appendChild(item);
    });

    cuisineSuggestions.classList.remove('hidden');
    activeSuggestionIndex = -1;
  }

  function selectCuisine(cuisine) {
    cuisineInput.value = cuisine;
    cuisineSuggestions.classList.add('hidden');
    clearCuisineBtn.classList.remove('hidden');
    cuisineInput.focus();
  }

  cuisineInput.addEventListener('input', () => {
    const value = cuisineInput.value.trim().toLowerCase();
    
    // Toggle clear button
    if (cuisineInput.value.length > 0) {
      clearCuisineBtn.classList.remove('hidden');
    } else {
      clearCuisineBtn.classList.add('hidden');
    }

    if (!value) {
      cuisineSuggestions.classList.add('hidden');
      return;
    }

    const filtered = CUISINES.filter(c => c.toLowerCase().includes(value));
    renderSuggestions(filtered);
  });

  // Handle keyboard navigation for suggestions
  cuisineInput.addEventListener('keydown', (e) => {
    const items = cuisineSuggestions.querySelectorAll('.suggestion-item');
    if (cuisineSuggestions.classList.contains('hidden') || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
      updateActiveSuggestion(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
      updateActiveSuggestion(items);
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex > -1) {
        e.preventDefault();
        selectCuisine(items[activeSuggestionIndex].textContent);
      }
    } else if (e.key === 'Escape') {
      cuisineSuggestions.classList.add('hidden');
    }
  });

  function updateActiveSuggestion(items) {
    items.forEach((item, idx) => {
      if (idx === activeSuggestionIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  clearCuisineBtn.addEventListener('click', () => {
    cuisineInput.value = '';
    clearCuisineBtn.classList.add('hidden');
    cuisineSuggestions.classList.add('hidden');
    cuisineInput.focus();
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrapper')) {
      cuisineSuggestions.classList.add('hidden');
    }
  });

  // --- Fun Cooking Loading Animation Sequence ---
  const loadingSequence = [
    { title: "Consulting Chef Gemini...", subtitle: "Inspecting your leftovers..." },
    { title: "Chopping ingredients...", subtitle: "Prepping the cutting board..." },
    { title: "Heating up the skillet...", subtitle: "Simmering flavours and matching spices..." },
    { title: "Plating the dish...", subtitle: "Garnishing your custom creation..." },
    { title: "Final tasting...", subtitle: "Making sure it is absolutely perfect..." }
  ];

  function startLoadingAnimation() {
    let index = 0;
    
    // Set initial text
    loaderTitle.textContent = loadingSequence[0].title;
    loaderSubtitle.textContent = loadingSequence[0].subtitle;

    // Cycle through messages
    loadingIntervalId = setInterval(() => {
      index = (index + 1) % loadingSequence.length;
      loaderTitle.textContent = loadingSequence[index].title;
      loaderSubtitle.textContent = loadingSequence[index].subtitle;
    }, 3000);
  }

  function stopLoadingAnimation() {
    if (loadingIntervalId) {
      clearInterval(loadingIntervalId);
      loadingIntervalId = null;
    }
  }

  // --- Call Cloud Function (API key is secure on backend) ---
  async function generateRecipe(ingredients, isRegenerating = false, cuisine = "") {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60000); // 60,000ms = 1 minute

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ingredients,
          cuisine,
          model: GEMINI_MODEL
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      return await response.json();

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error("Request timed out.");
      }
      throw err;
    }
  }

  // --- Display Recipe ---
  function displayRecipe(recipeData, ingredientsUsed, cuisine = "") {
    activeIngredients = ingredientsUsed;
    activeCuisine = cuisine;
    recipeTitle.textContent = recipeData.recipeName || "Leftover Masterpiece";
    recipeStep1.textContent = recipeData.step1 || "";
    recipeStep2.textContent = recipeData.step2 || "";
    recipeStep3.textContent = recipeData.step3 || "";

    // Show or hide cuisine badge
    if (cuisine) {
      recipeCuisineText.textContent = cuisine;
      recipeCuisineBadge.classList.remove('hidden');
    } else {
      recipeCuisineBadge.classList.add('hidden');
    }

    // Clear and build ingredients used tags
    recipeTagsList.innerHTML = '';
    ingredientsUsed.forEach(ing => {
      const li = document.createElement('li');
      li.textContent = ing;
      recipeTagsList.appendChild(li);
    });

    // Reveal recipe card
    recipeSection.classList.remove('hidden');
    recipeSection.scrollIntoView({ behavior: 'smooth' });
  }

  // --- Form Submission ---
  ingredientsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const ingredients = getIngredients();
    if (ingredients.length < 3) {
      showError(
        "Insufficient Ingredients",
        "Please enter at least 3 ingredients."
      );
      return;
    }

    const cuisine = cuisineInput.value.trim();

    // Switch to Loading View
    inputSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    startLoadingAnimation();

    try {
      const recipeData = await generateRecipe(ingredients, false, cuisine);
      
      // Transition from Loading to Recipe Card
      loadingSection.classList.add('hidden');
      stopLoadingAnimation();
      displayRecipe(recipeData, ingredients, cuisine);
      
    } catch (err) {
      // Transition back to Form view and display error
      loadingSection.classList.add('hidden');
      inputSection.classList.remove('hidden');
      stopLoadingAnimation();
      
      showError("Recipe Generation Failed", err.message);
    }
  });

  // --- Regenerate Recipe Button (Surprise Me Again) ---
  regenerateBtn.addEventListener('click', async () => {
    hideError();

    if (activeIngredients.length < 3) {
      showError(
        "Insufficient Ingredients",
        "No active ingredients found to regenerate. Please start over."
      );
      return;
    }

    // Switch to Loading View
    recipeSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    startLoadingAnimation();

    try {
      const recipeData = await generateRecipe(activeIngredients, true, activeCuisine);
      
      // Transition from Loading to Recipe Card
      loadingSection.classList.add('hidden');
      stopLoadingAnimation();
      displayRecipe(recipeData, activeIngredients, activeCuisine);
      
    } catch (err) {
      // Transition back to Recipe Card view and display error (so user doesn't lose old recipe)
      loadingSection.classList.add('hidden');
      stopLoadingAnimation();
      recipeSection.classList.remove('hidden');
      
      showError("Failed to generate a new recipe", err.message);
    }
  });

  // --- Reset/Restart Over Button ---
  resetBtn.addEventListener('click', () => {
    // Hide recipe card, clear inputs, reveal empty form
    recipeSection.classList.add('hidden');
    ingredientsForm.reset();
    
    // Hide clear buttons
    clearBtns.forEach(btn => btn.classList.add('hidden'));
    clearCuisineBtn.classList.add('hidden');
    cuisineSuggestions.classList.add('hidden');

    inputSection.classList.remove('hidden');
    updateFormValidation();
    hideError();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- Initialization ---
  updateFormValidation();
});
