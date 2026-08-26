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
      if (inputEl.type !== "checkbox") {
        inputEl.setAttribute("aria-invalid", !!errorMessage);
        inputEl.classList.toggle("form-field__input--error", !!errorMessage);

        // Specific handling for input groups (like mobile prefix)
        const group = inputEl.closest(".form-field__group");
        if (group) {
          group.classList.toggle("form-field__group--error", !!errorMessage);
        }

        // Auto-focus first error
        if (errorMessage && !focused) {
          inputEl.focus();
          focused = true;
        }
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
