# Caloriest AI

AI-powered calorie tracking and food scanning web app built with React, TypeScript, and Vite.

## Development

```sh
npm install
npm run dev
```

Create a local `.env` file in the parent folder of `Caloriest-main`. Vite loads environment variables from that folder. Email sign-in requires all three EmailJS values:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

In the EmailJS template, set **To Email** to `{{to_email}}` and include `{{code}}` in the message body. Restart the Vite dev server after changing `.env`. Do not commit credentials.
