/**
 * Shared Form Validation & Error UX Utility
 */

export function setFieldErrors(errors) {
  // Focus first invalid field
  let focused = false;

  Object.entries(errors).forEach(([fieldId, errorMessage]) => {
    const errSpan = document.querySelector(`[data-testid="error-${fieldId}"]`);
    const inputEl = document.querySelector(`[data-testid="${fieldId}"]`);

    if (errSpan) {
      if (errorMessage) {
        errSpan.textContent = errorMessage;
        errSpan.classList.remove("hidden");
      } else {
        errSpan.classList.add("hidden");
      }
    }

    if (inputEl) {
      inputEl.setAttribute("aria-invalid", !!errorMessage);
      
      if (inputEl.type !== "checkbox") {
        inputEl.classList.toggle("form-field__input--error", !!errorMessage);

        // Specific handling for input groups (like mobile prefix)
        const group = inputEl.closest(".form-field__group");
        if (group) {
          group.classList.toggle("form-field__group--error", !!errorMessage);
        }
      } else {
        const label = inputEl.closest(".form-field__checkbox-label");
        if (label) {
          label.classList.toggle("form-field__checkbox-label--error", !!errorMessage);
        }
      }
      
      // Focus first invalid field
      if (errorMessage && !focused) {
        inputEl.focus();
        focused = true;
      }
    }
  });
}

export function clearFieldError(fieldId) {
  setFieldErrors({ [fieldId]: null });
}

export function clearAllFieldErrors(fieldIds) {
  const errors = {};
  fieldIds.forEach(id => {
    errors[id] = null;
  });
  setFieldErrors(errors);
}

const ICON_EYE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const ICON_EYE_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

export function setupPasswordToggle(inputSelector, buttonSelector) {
  const inputs = document.querySelectorAll(inputSelector);
  const buttons = document.querySelectorAll(buttonSelector);
  
  buttons.forEach((btn, index) => {
    const input = inputs[index];
    if (!input) return;
    
    // Initial state
    btn.innerHTML = input.type === "password" ? ICON_EYE : ICON_EYE_OFF;
    
    // Make sure old listeners aren't duplicated if called multiple times,
    // though in our usage it should only be called once.
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      newBtn.innerHTML = isPassword ? ICON_EYE_OFF : ICON_EYE;
      newBtn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    });
  });
}
