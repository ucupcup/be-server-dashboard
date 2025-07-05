export const validateField = (requiredField: string[], body: any) => {
    const missingFields = requiredField.filter((field) => !(field in body));
  
    if (missingFields.length) {
      return {
        error: true,
        code: 400,
        message: `Field berikut wajib diisi: ${missingFields[0]}`,
      };
    }
  
    return {
      error: false,
    };
  };
  