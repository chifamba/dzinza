import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError, FieldValidationError } from 'express-validator'; // Import specific error types

interface FormattedValidationError {
  field: string; // path of the field or the type of error
  message: string;
  value?: any; // The value that caused the validation error
}

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors: FormattedValidationError[] = errors.array().map((error: ValidationError) => {
      if (error.type === 'field') {
        // It's a FieldValidationError, which has 'path' and 'value'
        const fieldError = error as FieldValidationError;
        return {
          field: fieldError.path,
          message: fieldError.msg,
          value: fieldError.value,
        };
      }
      // For other error types like 'alternative_grouped', 'unknown_fields', etc.
      // they might not have 'path' or 'value' in the same way.
      // We can provide a generic structure or more specific handling if needed.
      return {
        field: error.type, // e.g., 'unknown_fields', 'alternative_grouped'
        message: error.msg,
        // value might not be applicable or available for non-field errors
      };
    });

    res.status(400).json({
      error: 'Validation failed',
      details: formattedErrors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};
