import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';

export const configureSanitization = (app) => {
  // 1. Prevent NoSQL Injection by stripping '$' and '.' from user inputs
  app.use(
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        console.warn(`[SECURITY ALERT] NoSQL injection operator sanitized in request key: ${key}`);
      }
    })
  );

  // 2. Prevent XSS attacks by encoding HTML entities in request bodies
  app.use(xss());
};
